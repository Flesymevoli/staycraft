export const workspaceSearchLimit = 6;
export const workspaceSearchMaxLength = 80;
export type WorkspaceSearchBooking = {id: string; externalId: string | null; guestName: string; roomNumber: string; typeName: string; arrival: string; departure: string};
export type WorkspaceSearchRoom = {id: string; number: string; floor: string; typeName: string; active: boolean};
export type WorkspaceSearchRoomType = {id: string; name: string; beds: string; capacity: number|null; price: number|null};
export type WorkspaceSearchResults = {
  bookings: WorkspaceSearchBooking[];
  rooms: WorkspaceSearchRoom[];
  roomTypes: WorkspaceSearchRoomType[];
  more: {bookings: boolean; rooms: boolean; roomTypes: boolean};
};
export function normalizeWorkspaceSearch(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}
// Quote the PostgREST value separately from escaping its pattern. Input is
// literal text, including commas, quotes, wildcard and regex characters.
export function bookingSearchFilter(query: string) {
  const literal = JSON.stringify(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const filters = ["external_id", "guest_name", "room_number", "type_name", "external_channel"].map(field => `${field}.imatch.${literal}`);
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(query)) filters.push(`id.eq.${query}`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(query) && Number.isFinite(Date.parse(query)) && new Date(query).toISOString().slice(0, 10) === query) filters.push(`arrival.eq.${query}`, `departure.eq.${query}`);
  return filters.join(",");
}
