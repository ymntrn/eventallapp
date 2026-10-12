# Deploying the demo

## GitHub Pages (current)

Live at **https://ymntrn.github.io/eventallapp/**. Pages serves the `gh-pages` branch (root).
The app uses hash routing, so deep links such as `#/event/ornek-004` work on a static host.

The site reads data from Supabase. The two `VITE_SUPABASE_*` values are baked in at build
time from `.env.local` (see `docs/backend.md`); the anon key is public by design and
row-level security only allows reading. Without them the build falls back to the bundled JSON.

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
domain root, no base path).
