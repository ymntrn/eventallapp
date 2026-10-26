# Deploying the demo

## GitHub Pages (current)

Live at **https://ymntrn.github.io/eventallapp/**. Pages serves the `gh-pages` branch (root).
The app uses hash routing, so deep links such as `#/event/ornek-004` work on a static host.

The site reads data from Supabase. The two `VITE_SUPABASE_*` values are baked in at build
time from `.env.local` (see `docs/backend.md`). The anon key is public by design: row-level
security allows reading the catalogue, and after the Stage 1 migrations a signed-in user can
read and write only their own rows. Without the values the build falls back to the bundled
JSON and accounts are unavailable. Optional: `VITE_ANALYTICS_ENABLED=false` builds without
analytics (`docs/stage1.md`).

### Accounts (Stage 1)

The build command is unchanged. Accounts need two things outside the build. They are not done
yet; see `docs/stage1.md`:

1. Apply the Stage 1 migrations to the project.
2. In Supabase → Authentication → URL Configuration, set the Site URL to
   `https://ymntrn.github.io/eventallapp/` and add it to Redirect URLs. Sign-up passes the
   app's own URL (origin + `/eventallapp/`, without `#/…`) as the confirmation redirect.
   Supabase returns `?code=…` in the query string (PKCE), so the hash routes are not
   affected.

Until both are done, deploying this version shows the login form, but sign-up fails because
the `profiles` table does not exist yet. Deploy after the migrations.

To publish a new version (Windows PowerShell, from the repo folder):

```powershell
npm run build:pages                      # validates data, type-checks, builds dist/ for /eventallapp/
cd dist
git init -q; git checkout -q -b gh-pages
git add -A; git commit -q -m "Deploy"
git push -f https://github.com/ymntrn/eventallapp gh-pages
cd ..; Remove-Item -Recurse -Force dist\.git
```

`index.html` has `noindex`: the demo shows sample events and prices under real platform
names, so it should not appear in search results. Remove the meta tag once real data is live.

## Vercel / Netlify (later, for a nicer URL)

`vercel.json` and `netlify.toml` are ready. Import the GitHub repo, set the two
`VITE_SUPABASE_*` environment variables, and use the normal `npm run build` (served at the
domain root, no base path). Add the new domain (with a trailing `/`) to Supabase's Redirect
URLs.
