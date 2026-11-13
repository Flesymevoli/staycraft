import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {summarizeOrderRates, type OrderRateResult, type RateBooking} from './order-rates';

export async function readOrderRates(supabase: SupabaseClient, propertyId: string, date: string): Promise<OrderRateResult> {
  const rows: RateBooking[] = [];
  const signal = AbortSignal.timeout(8000);
  try {
    // Stable pagination avoids silently using only the first response page.
    for (let offset = 0; ; offset += 500) {
      const {data, error} = await supabase.from('direct_bookings')
        .select('id,type_id,arrival,departure,total,status,external_id,external_snapshot')
        .eq('property_id', propertyId).eq('status', 'confirmed').not('external_id', 'is', null)
        .lte('arrival', date).gt('departure', date).order('id').range(offset, offset + 499).abortSignal(signal);
      if (error || !data) return {status: 'unavailable', date};
      rows.push(...data as RateBooking[]);
      if (data.length < 500) break;
    }
    return {status: 'ready', summary: summarizeOrderRates(rows, date)};
  } catch {return {status: 'unavailable', date};}
}
