# Forma

Forma is a collaborative workspace for teams, forms, presentations, workflows, projects, and calendars.

## Stack
- React + Vite
- Supabase Auth and database
- Cloudflare Pages hosting

## Run locally
1. Install Node.js.
2. Run `npm install`.
3. Run `npm run dev`.

## Cloudflare Pages
- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist`

## Supabase
The browser client uses only the Supabase project URL and publishable key. These are public client values; never put a Supabase service-role or secret key in this repository.

You can override the defaults with:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Authentication currently supports email and password. Enable Email in Supabase Authentication settings. The workspace modules are starter screens; their editors and data features will be added in later builds.