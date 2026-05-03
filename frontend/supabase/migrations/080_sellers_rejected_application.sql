-- Rejected seller applications (admin onboarding decision).
alter table public.sellers drop constraint if exists sellers_status_check;
alter table public.sellers add constraint sellers_status_check
  check (status = any (array['pending', 'active', 'suspended', 'rejected']::text[]));

alter table public.sellers
  add column if not exists rejection_reason text null;

alter table public.sellers
  add column if not exists rejected_at timestamptz null;

comment on column public.sellers.rejection_reason is 'Admin-provided explanation when onboarding was rejected.';
comment on column public.sellers.rejected_at is 'When the seller application was rejected by an admin.';

-- Partners RPC: exclude rejected (and suspended).
create or replace function public.get_active_partners_directory()
returns table (
  seller_user_id uuid,
  business_name text,
  tagline text,
  business_type_label text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.user_id,
    coalesce(nullif(trim(s.business_name), ''), 'Verified seller') as business_name,
    nullif(trim(s.tagline), '') as tagline,
    nullif(trim(s.business_type_label), '') as business_type_label,
    nullif(trim(p.avatar_url), '') as avatar_url
  from public.sellers s
  left join public.profiles p on p.id = s.user_id
  where s.status is distinct from 'suspended'
    and s.status is distinct from 'rejected'
  order by lower(coalesce(nullif(trim(s.business_name), ''), 'verified seller'));
$$;

comment on function public.get_active_partners_directory() is
  'SECURITY DEFINER: /partners — active directory listing; excludes suspended and rejected sellers.';

revoke all on function public.get_active_partners_directory() from public;
grant execute on function public.get_active_partners_directory() to anon, authenticated;
