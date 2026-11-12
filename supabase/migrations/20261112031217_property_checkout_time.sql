-- Keep existing profiles valid; checkout remains optional and is never backfilled.
-- Only the JSON shape constraint changes. Ownership policies and grants are unchanged.
begin;
set local lock_timeout = '5s';
alter table public.property_details drop constraint property_details_shape;
alter table public.property_details add constraint property_details_shape check (
    jsonb_typeof(profile) = 'object'
    and profile ?& array['name','location','roomCount','breakfast','checkin','notes']
    and (profile - array['name','location','roomCount','breakfast','checkin','checkout','notes','guestNotes']) = '{}'::jsonb
    and jsonb_typeof(profile->'name') = 'string'
    and jsonb_typeof(profile->'location') = 'string'
    and jsonb_typeof(profile->'roomCount') = 'string'
    and jsonb_typeof(profile->'breakfast') = 'string'
    and jsonb_typeof(profile->'checkin') = 'string'
    and jsonb_typeof(profile->'notes') = 'string'
    and length(trim(profile->>'name')) between 1 and 120
    and length(profile->>'location') <= 300
    and length(profile->>'notes') <= 2000
    and ((profile->>'roomCount') = '' or (profile->>'roomCount') ~ '^[1-9][0-9]{0,2}$')
    and ((profile->>'checkin') = '' or (profile->>'checkin') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    and ((profile->>'breakfast') = '' or (
      (profile->>'breakfast') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]–([01][0-9]|2[0-3]):[0-5][0-9]$'
      and substring(profile->>'breakfast',1,5) < substring(profile->>'breakfast',7,5)
    ))
    and (not (profile ? 'guestNotes') or (jsonb_typeof(profile->'guestNotes')='string' and length(profile->>'guestNotes')<=2000))
    and (not (profile ? 'checkout') or (
      jsonb_typeof(profile->'checkout') = 'string'
      and ((profile->>'checkout') = '' or (profile->>'checkout') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    ))
  );
commit;
