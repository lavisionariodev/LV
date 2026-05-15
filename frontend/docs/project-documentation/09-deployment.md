# 09 — Deployment

## Build & run (`frontend/`)

```bash
npm install
npm run dev    # development
npm run build && npm start   # production
npm run lint
npm test       # unit tests: src/lib/** (auth, payments, paymongo, ratings, seller)
```

## Pre-flight

1. Supabase migrations applied (order matters; see `107`+ if using wallet/disbursements).  
2. All env vars set on host (`frontend/README.md`).  
3. PayMongo webhook → production URL + secret.  
4. SMTP configured if email is required.

## Hosting (from README)

**Suggested:** Vercel (or similar) with env vars in the platform dashboard.