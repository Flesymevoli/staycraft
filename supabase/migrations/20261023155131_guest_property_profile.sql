begin;
alter table public.property_details drop constraint property_details_shape;
alter table public.property_details add constraint property_details_shape check (
    jsonb_typeof(profile) = 'object'
    and profile ?& array['name','location','roomCount','breakfast','checkin','notes']
    and (profile - array['name','location','roomCount','breakfast','checkin','notes','guestNotes']) = '{}'::jsonb
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
  );
-- Deliberate public projection. Legacy notes, owner identity and room counts stay private.
create function private.guest_property_profile(p_property uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'location',coalesce(d.profile->>'location',''),
  'breakfast',coalesce(d.profile->>'breakfast',''),
  'checkin',coalesce(d.profile->>'checkin',''),
  'notes',coalesce(d.profile->>'guestNotes','')
 ) from public.properties p left join public.property_details d on d.property_id=p.id
 where p.id=p_property;
$$;
revoke all on function private.guest_property_profile(uuid) from public,anon,authenticated;
grant execute on function private.guest_property_profile(uuid) to anon,authenticated;
create function public.guest_property_profile(p_property uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select private.guest_property_profile(p_property);
$$;
revoke all on function public.guest_property_profile(uuid) from public,anon,authenticated;
grant execute on function public.guest_property_profile(uuid) to anon,authenticated;
commit;
