# College Lost & Found (CampusFind)

A responsive campus lost-and-found board. Students/staff can browse reports, search/filter listings, sign up/sign in, report lost or found belongings, and manage their own reports through protected APIs. An administrator can review all listings and moderate status.

## Problem and objectives
Campus belongings are often reported through scattered group chats or notice boards. CampusFind centralizes reports with category, location, date, description, and a contact method so owners and finders can reconnect.

## Users and implemented features
- Visitors: browse active reports and filter/search.
- Registered users: sign up/sign in, submit reports, view/manage their own reports through API endpoints.
- Admin: access moderation endpoints using the configured `ADMIN_EMAIL`.
- Backend validation, request limits, security headers, ownership checks, and Supabase persistence.

The current browser UI provides listing browse/search, authentication modal, and report submission. User-specific report management and admin moderation endpoints are included as APIs; dedicated dashboard screens are a future enhancement.

## Technology and architecture
HTML/CSS/Vanilla JS → Express REST API → Supabase Auth + PostgreSQL. The service-role key exists only on the server. API code verifies access tokens using Supabase Auth and checks ownership before modifications.

## Folder structure
```text
college-lost-found/
├── frontend/ (index.html, styles.css, app.js)
├── backend/ (server.js, supabase.js, middleware/auth.js, package.json, .env.example, .gitignore)
├── database/schema.sql
├── .gitignore
└── README.md
```

## Prerequisites
Install [VS Code](https://code.visualstudio.com/), [Node.js LTS](https://nodejs.org/), [Git](https://git-scm.com/), and create a free [Supabase](https://supabase.com/) project.

Verify from a terminal: `node -v`, `npm -v`, `git --version`.

## Supabase setup
1. Create a Supabase project and wait until provisioned.
2. Open **SQL Editor → New query**.
3. Paste all of `database/schema.sql`, click **Run**.
4. Open **Table Editor** and confirm `items` exists.
5. In project Settings → API, copy Project URL, anon/publishable key, and service-role/secret key. Keep the service role key private.

## Configure and run (Windows PowerShell)
Open VS Code terminal at the project root:
```powershell
cd backend
npm install
Copy-Item .env.example .env
notepad .env
```
Set real Supabase values in `backend/.env`. Do not put service-role key in frontend code or commit `.env`.
Then start:
```powershell
npm run dev
```
Expected terminal: `CampusFind running at http://localhost:3000`. Open http://localhost:3000 in browser. Health check: http://localhost:3000/api/health should return `{"status":"ok"}`.

## Environment variables
- `PORT`: Express port, default 3000.
- `NODE_ENV`: environment name.
- `SUPABASE_URL`: project URL.
- `SUPABASE_ANON_KEY`: public key (reserved for client-side Supabase use; not needed by current server code).
- `SUPABASE_SERVICE_ROLE_KEY`: privileged server-only key.
- `ADMIN_EMAIL`: email whose verified identity can access admin routes. Create the admin user through signup; configure the matching email. Do not hardcode a password.

## Authentication and admin
Signup/signin use Supabase Auth. User passwords are handled by Supabase, not stored in the app database. The backend receives an access token and verifies it with `supabase.auth.getUser(token)`. Admin permission is checked against the authenticated email on the server. For a production deployment, use a dedicated admin role stored in a protected table/claim, require email confirmation, configure SMTP, and consider stricter RLS policies. Never share the service-role key.

## API endpoints
All JSON responses. Protected routes require `Authorization: Bearer <Supabase access token>`.

| Method | Path | Purpose / permissions |
|---|---|---|
| GET | `/api/health` | Health status, public |
| POST | `/api/auth/signup` | Create account; body `{email,password,full_name}` |
| POST | `/api/auth/signin` | Sign in; body `{email,password}` |
| POST | `/api/auth/signout` | Requires valid login; client discards token |
| GET | `/api/items` | Browse active items; optional `type=lost` or `type=found` |
| POST | `/api/items` | Authenticated create; title/type/category/location/item_date/contact required |
| GET | `/api/my-items` | Authenticated own reports |
| PATCH | `/api/items/:id/resolve` | Authenticated owner marks active report resolved |
| DELETE | `/api/items/:id` | Authenticated owner deletes own report |
| GET | `/api/admin/items` | Admin only; all listings |
| PATCH | `/api/admin/items/:id/status` | Admin only; body `{status:"active"|"resolved"|"hidden"}` |

Typical errors: 400 invalid data, 401 missing/invalid token, 403 admin only, 404 missing or not-owned item, 500 safe generic server error.

## User workflow
1. Browse current listings or search by keyword/category/type.
2. Create account and sign in.
3. Submit a lost/found report with date, location, details, and safe contact information.
4. When reunited, owner can mark report resolved using the protected API.

## Manual testing
- `GET /api/health` returns status ok.
- Browse page shows current active Supabase records.
- Signup with valid email/password (8+ chars); sign in using same credentials.
- Submit a complete report; it appears in the browse board.
- Search title/location and select lost/found/category filters.
- Empty required fields are blocked by browser and server validation.
- Without a token, POST `/api/items` returns 401.
- Try modifying/deleting another user's report; API returns 404.
- Non-admin requests to `/api/admin/items` return 403.
- Test mobile width in browser responsive mode.
- Confirm no service key appears in browser DevTools or Git history.

## Troubleshooting
- Missing env values: check `backend/.env` names and restart server.
- `Invalid API key`: copy the correct Supabase key and URL.
- Table missing: run `database/schema.sql` in SQL Editor.
- Login not working: ensure signup completed and email confirmation settings align with your project.
- Port in use: change `PORT` in `.env`.
- Network/API error: check terminal and Supabase project status; never paste secrets into issue reports.

## GitHub
From project root:
```bash
git init
git status
git add .
git status
git commit -m "Build project"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```
Create an empty GitHub repository first and replace the remote placeholder with its URL. Check `.env` and `node_modules/` are ignored; `.env.example` should be committed. `.gitignore` cannot erase secrets already committed. Rotate exposed credentials and remove them from history if necessary.

## Limitations and future work
No image upload, email matching alerts, or in-page personal/admin dashboard currently. Add secure image storage, email notifications, verified campus email restrictions, report dashboard, and stronger admin role assignment after the MVP.
