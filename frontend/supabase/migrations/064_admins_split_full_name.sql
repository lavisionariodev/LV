-- Replace admins.full_name with first_name + last_name
-- Backfill: first word -> first_name, remaining -> last_name

alter table public.admins
  add column if not exists first_name text,
  add column if not exists last_name text;

-- Backfill from full_name (handle extra spaces safely)
update public.admins
set
  first_name = nullif(split_part(trim(coalesce(full_name, '')), ' ', 1), ''),
  last_name = nullif(
    ltrim(
      substr(
        trim(coalesce(full_name, '')),
        length(nullif(split_part(trim(coalesce(full_name, '')), ' ', 1), '')) + 1
      )
    ),
    ''
  )
where full_name is not null
  and (first_name is null or last_name is null);

-- If full_name had no spaces, last_name should be null (not empty string)
update public.admins
set last_name = null
where last_name = '';

alter table public.admins
  drop column full_name;

