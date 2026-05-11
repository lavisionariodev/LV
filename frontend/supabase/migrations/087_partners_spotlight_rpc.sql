-- Public /partners spotlight: admin-featured seller(s) + statistically top-rated seller(s).
-- Top rated: max ROUND(AVG(rating),1) among eligible sellers with reviews; tie-break on review_count;
-- if still tied, return all tied sellers. Featured: superseded by 088 (all partners_featured); this file is the initial RPC.

create or replace function public.get_partners_spotlight()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with eligible as (
    select
      s.user_id,
      coalesce(nullif(trim(s.business_name), ''), 'Verified seller') as business_name,
      nullif(trim(s.tagline), '') as tagline,
      nullif(trim(s.business_type_label), '') as business_type_label,
      nullif(trim(p.avatar_url), '') as avatar_url,
      nullif(trim(coalesce(s.business_info, '')), '') as business_info,
      s.business_started_at,
      s.registered_at,
      s.partners_featured
    from public.sellers s
    left join public.profiles p on p.id = s.user_id
    where s.status is distinct from 'suspended'
      and s.status is distinct from 'rejected'
  ),
  featured_row as (
    select e.*
    from eligible e
    where e.partners_featured = true
    order by e.user_id
    limit 1
  ),
  review_agg as (
    select
      oir.seller_user_id,
      round(avg(oir.rating::numeric), 1) as avg_rating,
      count(*)::int as review_count
    from public.order_item_reviews oir
    group by oir.seller_user_id
  ),
  rated as (
    select
      e.user_id,
      e.business_name,
      e.tagline,
      e.business_type_label,
      e.avatar_url,
      e.business_info,
      e.business_started_at,
      e.registered_at,
      r.avg_rating,
      r.review_count
    from eligible e
    inner join review_agg r on r.seller_user_id = e.user_id
  ),
  top_at_max_avg as (
    select t.*
    from rated t
    where t.avg_rating = (select max(r2.avg_rating) from rated r2)
  ),
  top_final as (
    select t.*
    from top_at_max_avg t
    where t.review_count = (select max(t2.review_count) from top_at_max_avg t2)
  )
  select jsonb_build_object(
    'featured',
    (
      select jsonb_build_object(
        'seller_user_id', fr.user_id,
        'business_name', fr.business_name,
        'tagline', fr.tagline,
        'business_type_label', fr.business_type_label,
        'avatar_url', coalesce(fr.avatar_url, ''),
        'business_info', fr.business_info,
        'business_started_at', fr.business_started_at,
        'registered_at', fr.registered_at
      )
      from featured_row fr
    ),
    'top_rated',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'seller_user_id', tf.user_id,
            'business_name', tf.business_name,
            'tagline', tf.tagline,
            'business_type_label', tf.business_type_label,
            'avatar_url', coalesce(tf.avatar_url, ''),
            'business_info', tf.business_info,
            'business_started_at', tf.business_started_at,
            'registered_at', tf.registered_at,
            'avg_rating', tf.avg_rating,
            'review_count', tf.review_count
          )
          order by tf.user_id
        )
        from top_final tf
      ),
      '[]'::jsonb
    )
  );
$$;

comment on function public.get_partners_spotlight() is
  'SECURITY DEFINER: /partners spotlight — featured (partners_featured, one row) and top_rated (tie rules on avg then count).';

revoke all on function public.get_partners_spotlight() from public;
grant execute on function public.get_partners_spotlight() to anon, authenticated;
