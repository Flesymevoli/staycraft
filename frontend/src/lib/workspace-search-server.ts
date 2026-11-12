import "server-only";
import type {SupabaseClient} from "@supabase/supabase-js";
import {validateInventory} from "./property-inventory";
import {WorkspaceError} from "./workspace-access";
import {bookingSearchFilter, normalizeWorkspaceSearch, workspaceSearchLimit, type WorkspaceSearchResults} from "./workspace-search";

export async function searchWorkspace(supabase: SupabaseClient, propertyId: string, query: string, signal: AbortSignal): Promise<WorkspaceSearchResults> {
  const [inventoryResult, bookingResult] = await Promise.all([
    // The existing inventory contract is bounded to 20 types and 200 rooms.
    supabase.rpc("get_room_inventory", {p_property: propertyId}).abortSignal(signal),
    supabase.from("direct_bookings")
      .select("id,external_id,guest_name,room_number,type_name,arrival,departure,rooms(number)")
      .eq("property_id", propertyId).or(bookingSearchFilter(query))
      .order("arrival", {ascending: false}).order("id", {ascending: false})
      .limit(workspaceSearchLimit + 1).abortSignal(signal),
  ]);
  const inventory = validateInventory(inventoryResult.data?.inventory, propertyId);
  if (inventoryResult.error || !inventory || bookingResult.error) throw new WorkspaceError("search_unavailable", 503);
  const needle = normalizeWorkspaceSearch(query).toLocaleLowerCase();
  const includes = (value: string) => normalizeWorkspaceSearch(value).toLocaleLowerCase().includes(needle);
  const roomTypes = inventory.types.filter(type => includes(type.name) || includes(type.beds));
  const rooms = inventory.rooms.filter(room => includes(room.number) || includes(room.floor) || includes(inventory.types.find(type => type.id === room.typeId)?.name ?? ""));
  const bookings = bookingResult.data ?? [];
  return {
    bookings: bookings.slice(0, workspaceSearchLimit).map(booking => {
      const room = Array.isArray(booking.rooms) ? booking.rooms[0] : booking.rooms;
      return {id: booking.id, externalId: booking.external_id, guestName: booking.guest_name, roomNumber: room?.number ?? booking.room_number, typeName: booking.type_name, arrival: booking.arrival, departure: booking.departure};
    }),
    rooms: rooms.slice(0, workspaceSearchLimit).map(room => ({id: room.id, number: room.number, floor: room.floor, active: room.active, typeName: inventory.types.find(type => type.id === room.typeId)?.name ?? ""})),
    roomTypes: roomTypes.slice(0, workspaceSearchLimit).map(type => ({id: type.id, name: type.name, beds: type.beds, capacity: type.capacity, price: type.price})),
    more: {bookings: bookings.length > workspaceSearchLimit, rooms: rooms.length > workspaceSearchLimit, roomTypes: roomTypes.length > workspaceSearchLimit},
  };
}
