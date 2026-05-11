-- Shop/marketing cover image for homepage partner cards and similar surfaces.
alter table public.sellers
  add column if not exists cover_photo_url text;

comment on column public.sellers.cover_photo_url is
  'Public URL for seller shop cover image (e.g. homepage carousel); optional.';

-- Public directory: extend payload for homepage + partners grid (extra columns ignored by older clients).
drop function if exists public.get_active_partners_directory();

create function public.get_active_partners_directory()
returns table (
  seller_user_id uuid,
  business_name text,
  tagline text,
  business_type_label text,
  avatar_url text,
  cover_photo_url text,
  specialties text[],
  address text,
  business_started_at timestamptz,
  registered_at timestamptz,
  avg_rating numeric,
  review_count int
)
language sql
stable
security definer
set search_path = public
as $$
  with review_agg as (
    select
      oir.seller_user_id,
      round(avg(oir.rating::numeric), 1) as avg_rating,
      count(*)::int as review_count
    from public.order_item_reviews oir
    group by oir.seller_user_id
  )
  select
    s.user_id,
    coalesce(nullif(trim(s.business_name), ''), 'Verified seller') as business_name,
    nullif(trim(s.tagline), '') as tagline,
    nullif(trim(s.business_type_label), '') as business_type_label,
    nullif(trim(p.avatar_url), '') as avatar_url,
    nullif(trim(s.cover_photo_url), '') as cover_photo_url,
    coalesce(s.specialties, '{}'::text[]) as specialties,
    nullif(trim(s.address), '') as address,
    s.business_started_at,
    s.registered_at,
    ra.avg_rating,
    coalesce(ra.review_count, 0) as review_count
  from public.sellers s
  left join public.profiles p on p.id = s.user_id
  left join review_agg ra on ra.seller_user_id = s.user_id
  where s.status is distinct from 'suspended'
    and s.status is distinct from 'rejected'
  order by lower(coalesce(nullif(trim(s.business_name), ''), 'verified seller'));
$$;

comment on function public.get_active_partners_directory() is
  'SECURITY DEFINER: /partners + homepage — sellers except suspended/rejected; '
  'includes cover_photo_url, specialties, address, tenure dates, review aggregates.';

revoke all on function public.get_active_partners_directory() from public;
grant execute on function public.get_active_partners_directory() to anon, authenticated;
