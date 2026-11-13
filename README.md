# Intact ID console

The web console for Intact ID: verifications, manual review, workflows, companies and applications,
billing, analytics, webhooks and API keys. Super admins also manage the service catalog and see
turnaround times and service health.

React 19 + Vite. It talks only to auth-server.

## Run it

```bash
cp .env.example .env.local    # set VITE_API_BASE_URL to the auth-server you want
npm ci
npm run dev                   # http://localhost:5173
npm run build                 # production bundle in dist/
npm run lint                  # oxlint
```

`VITE_API_BASE_URL` is read at build time. A value without `https://` gets it added.

## Deploy

Vercel builds this repo (Node 20.19 or newer). `vercel.json` sends every path to `index.html` so
links like `/dashboard/verifications/123` work on refresh.

## Layout

- `src/pages/` one folder or file per page; `src/components/` shared UI and layout
- `src/services/` one file per auth-server area; each unwraps the `{ success, data }` envelope
- `src/utils/` formatting, roles and chart helpers

Addresses from the old dashboard (`/dashboard/approvals`, `/maker-checker`, `/catalog`, `/team`,
`/usage`) redirect to their new pages.
