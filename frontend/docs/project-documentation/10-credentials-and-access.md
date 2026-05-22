# 10 — Credentials & access

**Do not commit secrets.** Store values in a password manager or host secret store; this file lists **names only**.

## Required env (`frontend/README.md`)

| Variable | Scope |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — high privilege |
| `NEXT_PUBLIC_APP_URL` | Public — canonical site URL |
| PayMongo + SMTP vars | See [08-payments](./08-payments.md) and README |

## Account inventory (fill for client)

| System | URL / id | Owner |
|--------|----------|--------|
| Supabase | `https://supabase.com/dashboard/project/lltkymuwcrhuowwwksla` | `mercado-sofia` |
| Host (Vercel) | `https://vercel.com/lvs-projects-d0649739/lavisionario` | `lavisionariodev` |
| PayMongo | `https://dashboard.paymongo.com/home` | `SOFIA LADYLYN MERCADO` |
| Git remote | `https://github.com/lavisionariodev/LV.git` | `lavisionariodev` |

## Handover checklist

- [ ] Client org access to Supabase + hosting + PayMongo  
- [ ] All migrations applied through `113` (platform billing settlement fields)  
- [ ] `SUPABASE_SERVICE_ROLE_KEY` rotated or confirmed custody  
- [ ] Production webhook URL + `PAYMONGO_WEBHOOK_SECRET` match  
- [ ] SMTP send tested (if email notifications required)  
- [ ] `NEXT_PUBLIC_APP_URL` matches production  
- [ ] At least one `public.admins` user for break-glass  
- [ ] Seller withdrawal path tested (`PAYMONGO_DISBURSEMENT_ENABLED`, payout settings, `/seller/wallet`)  