-- Extended buyer-facing fields on public.profiles (shared by buyers and sellers).
-- UI: /profile/account — username, phone, gender, DOB, structured address.

alter table public.profiles
  add column if not exists username text,
  add column if not exists username_locked boolean not null default false,
  add column if not exists phone text,
  add column if not exists gender text,
  add column if not exists date_of_birth date,
  add column if not exists address_street text,
  add column if not exists address_city text,
  add column if not exists address_province text,
  add column if not exists address_zip text;

comment on column public.profiles.username is 'Public handle; unique when set (case-insensitive).';
comment on column public.profiles.username_locked is 'Once true, username must not change (enforced in app).';
comment on column public.profiles.phone is 'Contact phone; optional.';
comment on column public.profiles.gender is 'UI values e.g. Male, Female, Other.';
comment on column public.profiles.date_of_birth is 'Optional date of birth.';
comment on column public.profiles.address_street is 'Street line for delivery/contact.';
comment on column public.profiles.address_city is 'City or municipality.';
comment on column public.profiles.address_province is 'Province or state.';
comment on column public.profiles.address_zip is 'Postal / ZIP code.';

-- Case-insensitive uniqueness for non-empty usernames
create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(trim(username)))
  where username is not null and length(trim(username)) > 0;
