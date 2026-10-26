# Stage 1 report

Branch `claude/modest-fermi-j9s1m1`. One commit per feature. How to apply and configure:
[`stage1.md`](stage1.md).

## Built

| Feature | What | Files |
| --- | --- | --- |
| **Database** | 5 migrations: `profiles` (+ sign-up trigger), `followed_performers`, `followed_venues`, `saved_events`, `attended_events`, `notifications`, `analytics_events`, `delete_my_account()`, `export_my_data()`. RLS on every table, owner-only policies, column-level grants. Not applied to the live project | `supabase/migrations/20261014120000_stage1_profiles.sql` … `20261014120400_stage1_account_functions.sql` |
| Database tests | Stub of Supabase's `auth` schema and default grants. 9 test groups covering the trigger, RLS for every table (own rows, other user's rows, anon), analytics forgery, notifications, export, deletion and "RLS on everywhere" | `supabase/tests/supabase_stub.sql`, `supabase/tests/stage1.test.sql`, `scripts/test-db.sh` (`npm run test:db`) |
| **Supabase Auth accounts** | E-mail + password sign-up (name, optional city) and sign-in. PKCE flow, so confirmation links work with the hash router. Session restore, `?code=` handling, Turkish error messages. The localStorage demo login and "Demo hesabıyla devam et" are gone. Without `VITE_SUPABASE_*`, accounts show as unavailable | `src/lib/supabase-client.ts`, `src/lib/auth.ts`, `src/lib/store.ts`, `src/lib/user-backend.ts`, `src/pages/LoginPage.tsx`, `src/main.tsx` |
| Profile | Edit name and city in Settings. E-mail is shown read-only | `src/pages/SettingsPage.tsx` (`ProfileForm`) |
| **Account deletion (KVKK)** | Settings → Hesap verilerim → "Hesabımı sil". The user types `SİL`, then `delete_my_account('SİL')` deletes the auth user and all personal rows, and the app signs out locally | `src/lib/account.ts`, `src/pages/SettingsPage.tsx` (`AccountData`), migration `…120400…` |
| **Data export (KVKK)** | "Verilerimi indir (JSON)" downloads `eventall-verilerim-YYYY-MM-DD.json` with account, profile, follows, saved and attended events, notifications and activity | same |
| **Follows** | "Takip et" on performer pages, on each performer and on the venue of an event page, and on the venue sheet. List under Profil → Takip. No public counts | `src/components/FollowButton.tsx`, `src/pages/PerformerPage.tsx`, `src/pages/EventPage.tsx`, `src/components/VenueSheet.tsx`, `src/pages/ProfilePage.tsx` |
| Saved events | The heart now saves to `saved_events` ("Kaydet") | `src/components/FavoriteButton.tsx` |
| **Discover tab** | New bottom tab "Keşfet" next to the map ("Harita"). Sections: "Sana özel" (followed artist 100, followed venue 50, saved-event category 10; max 50), "Bu hafta sonu" (selected city), "Yeni keşifler" (not followed, not saved, not already listed; one per venue; max 10). A city switch and the "Bu akşam" chip are at the top | `src/lib/discover.ts`, `src/pages/DiscoverPage.tsx`, `src/components/BottomNav.tsx`, `src/lib/router.ts`, `src/App.tsx` |
| **Tonight filter** | `tonightWindow(now, from)`: current Istanbul time → 06:00 next morning, optional start time. Map: "Bu akşam" chip with the time picker, and the picker in the filter sheet. Discover: the same chip switches to one ranked "Bu akşam" list | `src/lib/dates.ts`, `src/components/TonightTime.tsx`, `src/pages/MapPage.tsx`, `src/components/FilterSheet.tsx`, `src/pages/DiscoverPage.tsx` |
| **Calendar** | "Takvimim" (`#/calendar`, button on Profil). Upcoming saved events and events of followed artists and venues, grouped by Istanbul month. Each row links to event detail and shows why it is there | `src/lib/calendar.ts`, `src/pages/CalendarPage.tsx` |
| **Notifications (model only)** | `notifications` table (service-role writes; users read, mark read, delete their own). "Bildirimler" page (`#/notifications`, bell on Profil), empty for now. Nothing is sent | migration `…120200…`, `src/lib/notifications.ts`, `src/pages/NotificationsPage.tsx` |
| **Analytics** | `event_detail_opened`, `event_saved`, `follow_added`, `buy_link_tapped`, `discover_opened` → `analytics_events` (`event_name`, `event_id`; the database sets `user_id` and `created_at`). No IP or device id. Off with `VITE_ANALYTICS_ENABLED=false`, or server-side with one `revoke` | `src/lib/analytics.ts`, migration `…120300…`, hooks in `EventPage.tsx`, `DiscoverPage.tsx`, `store.ts` |
| Turkish strings | All new UI text in Turkish | `src/i18n/tr.ts` |
| Docs | Apply/configure guide, this report, deploy/backend/README updates | `docs/stage1.md`, `docs/stage1-report.md`, `docs/deploy.md`, `docs/backend.md`, `README.md` |

Tests added: `src/lib/discover.test.ts` (scoring, sections, caps, tonight list),
`src/lib/dates.test.ts` (Tonight window incl. start time, after midnight, past times, malformed
input, time zone), `src/lib/account.test.ts` (confirmation word, deletion call and local
clean-up, failure keeps state, export), `src/lib/calendar.test.ts`, `src/lib/analytics.test.ts`,
`src/lib/auth.test.ts`, updated `store.test.ts`, `user-backend.test.ts`, `router.test.ts`.

Results at the last commit:
- `npm test`: 16 files, 108 tests passed.
- `npm run test:db`: passed on local Postgres 16 + PostGIS 3. A deliberate RLS mutation, removing the anon revoke on `profiles`, was caught.
- `npm run build` and `npm run build:pages`: passed with 0 validation errors.
- A browser smoke test (Playwright, Chromium) ran in two modes:
  - Logged out, without Supabase: 8 checks passed.
  - Against a **mocked** Supabase Auth and PostgREST API: sign-up, save, follow artist and venue, buy link, Discover, Tonight, calendar, notifications, export, deletion and the five analytics events. 28 checks passed.
  - The script lives in the session's scratchpad, not in the repo.
  - Map tiles are blocked in the build sandbox, so the map canvas itself was not seen. The chips and filter logic around it were checked.

## Not built

- **Running against the real Supabase project.** No access by design, and the migrations must not be applied here. Everything was tested on local Postgres with a stubbed `auth` schema and against a mocked API, not on Supabase.
- **Password reset ("Şifremi unuttum") and e-mail change.** Not in the goal, but real accounts will need password reset soon. E-mail is shown read-only.
- **Which artist or venue was followed** is not in analytics. `follow_added` has `event_id = null`, because the specified table has only an event id column. A `target_id` column would fix this if wanted.
- **Mark-as-read and delete in "Bildirimler".** The table and RLS allow it, but there is nothing to show yet.
- **Preferences in the account.** Date filter, categories, city, theme and the Tonight start time stay on the device, as before. Only the profile city is stored in the account.
- **Moving demo data over.** Favorites saved with the old localStorage demo login are dropped, because they were never tied to a real account.
- **A test that reloads the profile after an edit on another device.** There is no realtime sync; changes from another device appear after a reload.

## Decisions I made beyond the spec

1. **Artists = the existing performers.** Tables are `followed_performers` and `followed_venues`, with foreign keys and `on delete cascade` to `performers` and `venues`.
2. **Saved events = the existing heart.** It writes `saved_events`; the label changed from "Favorilere ekle" to "Kaydet".
3. **"Gittim" kept.** It became `attended_events`, an owner-only table. It is included in deletion and export.
4. **Map tab renamed "Harita".** The new Discover tab took the name "Keşfet". Tab order: Harita, Keşfet, Profil, Ayarlar.
5. **Tonight starts exactly at "now".** This follows the spec and changes Stage 0, which still listed shows that had started up to an hour ago. Other details:
   - Between 00:00 and 05:59, "tonight" is the night in progress, ending 06:00 the same morning, not 06:00 the next day.
   - Picker values: 17:00–23:00 hourly, then 00:00, 01:00 and 02:00.
   - A picked time that has passed means "now".
   - The start time is saved on the device and shared by map and Discover.
   - Discover's Tonight toggle is not saved; it resets each visit.
6. **Discover details:**
   - "Sana özel" covers both cities (a followed artist playing in the other city still matters).
   - The other two sections use the selected city.
   - "Yeni keşifler" also skips saved events and events already in "Sana özel", takes one event per venue, soonest first.
   - Logged out, "Sana özel" shows a sign-in prompt.
   - Each row shows its strongest reason as a badge.
7. **Calendar shows only upcoming events.** That includes ones started within the last hour, the same rule as the map's "Tüm tarihler". Past saved events are not shown.
8. **Profile:**
   - City is optional; display name is 1–60 characters.
   - If the name is missing, the part of the e-mail before "@" is used.
   - "Private" is enforced only by RLS; there is no visibility column yet.
9. **Password minimum is 8 characters** in the app. Supabase's default is 6; `stage1.md` asks to set it to 8.
10. **PKCE auth flow and e-mail confirmation.** PKCE avoids tokens in the URL hash. E-mail confirmation is recommended on, and the app handles both on and off.
11. **The confirmation word is `SİL`.**
    - The app also accepts any case, surrounding spaces, and `SIL` without the dotted İ.
    - It always sends the canonical `SİL`, and the database function checks it again.
12. **Deletion removes the user's analytics rows** instead of anonymising them. They are personal data linked to the user.
13. **Export content.** It also includes notifications and attended events, with event and venue names joined in for readability. It uses the `format: "eventall-export-v1"` marker.
14. **Analytics:**
    - `user_id` defaults to `auth.uid()`, and clients may insert only `event_name` and `event_id`, so neither the user nor the time can be forged.
    - Analytics is on by default whenever Supabase is configured.
    - An identical action on the same event within 1 second counts once (React StrictMode double effects).
    - `event_id` is capped at 200 characters.
15. **Foreign keys from user rows to events cascade.** An event removed from the database (e.g. `npm run db:seed -- --prune`) also disappears from users' saved and attended lists.
16. **Duplicate saves and follows.** Writes are a plain `insert`, and a duplicate (`23505`) counts as success instead of using upsert.
17. **Notification kinds are fixed by a CHECK:** `new_event_followed_performer`, `new_event_followed_venue`, `saved_event_reminder`.
18. **Settings changes:**
    - "Favori etkinlik hatırlatmaları" was removed, since nothing is sent in Stage 1.
    - "Bu cihazdaki tüm verileri sil" became "Bu cihazdaki ayarları sıfırla". It resets only device preferences; deleting account data is "Hesabımı sil".
19. **supabase-js is loaded lazily** in its own chunk (≈228 kB, 59 kB gzip), so the map does not wait for it. Public event data is still read with plain fetch.
20. **Local cache key moved to `eventall.state.v2`.** The old `eventall.state.v1` is removed on startup. The Supabase session is stored under `eventall.auth`.
21. **Logged out, saving, following or "Gittim"** sends the user to the login page and back, as the heart did before.

## Needs human action

1. **Apply the migrations.** Do a staging project first, then live. Check `supabase migration list` and `migration repair` for the hand-applied init migration. Steps are in `stage1.md` §1.
2. **Supabase Auth settings** (`stage1.md` §2):
   - Email provider on, Confirm email on, minimum password length 8.
   - **Site URL** `https://ymntrn.github.io/eventallapp/`.
   - **Redirect URLs**: that URL plus `http://localhost:5173/` and `http://localhost:4173/`, and any Vercel/Netlify domain.
3. **Custom SMTP** for auth e-mails. Supabase's built-in sender is for testing only. Choose a provider; it may be paid, and I did not add one.
4. **Check that `delete_my_account()` can delete from `auth.users` on your project.** The function runs as its owner (normally `postgres`). If Supabase refuses (`permission denied for table users`), replace the last statement with an Edge Function that calls `auth.admin.deleteUser(uid)` with the service-role key. Test this on staging before launch.
5. **Legal texts.** Placeholders marked `[YER TUTUCU: …]` are at:
   - Sign-up: `t.legalSignupPlaceholder` in `LoginPage`.
   - Settings → Gizlilik: `t.legalPrivacyPlaceholder` and `t.legalAnalyticsPlaceholder`.

   Needed: üyelik sözleşmesi, KVKK aydınlatma metni, gizlilik politikası, and the analytics notice. Whether explicit consent (açık rıza) is needed for analytics or cross-border transfer is a legal question. The project is in `eu-west-1`.
6. **Apple and Google review.**
   - **Apple:** App Store guideline 5.1.1(v) requires that an app which lets users create an account also lets them start account deletion inside the app. That exists (Settings → Hesabımı sil), and it deletes rather than deactivates.
   - **Google:** Google Play's account deletion policy also requires a **web link** where users can request deletion without the app, entered in the Data safety form. Because Eventall is a web app, `https://ymntrn.github.io/eventallapp/#/settings` could serve as that link after sign-in. Confirm this is acceptable, or publish a separate request page or e-mail address.
   - This applies only once the PWA is wrapped for the stores. Please re-check the current policy text before submitting; I summarised it from memory.
7. **Deploy order.** Deploy this build to GitHub Pages only **after** the migrations. Before that, sign-up would create auth users but loading the account fails.
8. **KVKK side work outside the code:** a data processing agreement with Supabase, VERBİS if it applies, and a retention period for `analytics_events`. Today rows are kept until account deletion; anonymous rows are kept forever.

## Risks

- **Auth user deletion on hosted Supabase** (see item 4 above). This is the main thing to verify.
- **Anonymous analytics inserts are not rate-limited.** Anyone with the public anon key can insert rows: only the five names, but in any number. Options:
  - Turn off anon inserts and track only signed-in users.
  - Add a scheduled clean-up or a size alert.
  - Put an Edge Function with rate limiting in front.
- **IP addresses still reach Supabase.** They are not stored in our table, but Supabase's API gateway logs hold request IPs for its retention period. Mention this in the privacy text.
- **Security-definer functions** (`handle_new_user`, `delete_my_account`, `export_my_data`) bypass RLS.
  - Each one pins `search_path = ''`, uses only `auth.uid()`, and is revoked from `public` and `anon`.
  - `handle_new_user` is also revoked from `authenticated`.
  - Please review them before launch.
- **Policies use `(select auth.uid())`**, the form Supabase recommends for performance. `profiles` and `notifications` updates are limited by column grants (`display_name`, `city`; `read_at`). The DB tests check that other columns are refused.
- **The sign-up trigger runs inside the auth insert.** If it ever raised an error, sign-up would fail. Inputs are sanitised (name trimmed, length capped, unknown city becomes null) to prevent that.
- **Cascades from catalogue data.** Re-seeding with `--prune` deletes user rows for removed events. Renaming an id cascades through `on update cascade`.
- **PKCE confirmation only completes in the same browser.** Opening the link in a mail app's browser confirms the address, but the user must then sign in by hand. The app explains this.
- **Optimistic writes.** A failed save or follow shows "Değişiklik kaydedilemedi" but keeps the local change until the next reload.
- **Performance.**
  - Discover and calendar are computed in the browser over all loaded events. That is fine at today's 44 events and fine into the low thousands.
  - The account load reads each follow/saved table in one request. PostgREST's default 1000-row limit would truncate beyond that.
  - There is no realtime sync between devices.
- **Tonight behaviour change.** The time window no longer includes shows that started just before "now". This follows the spec, but testers may notice.
- **Not exercised against the real Supabase** (Auth, PostgREST and RLS together). The local tests use a stub `auth` schema and mocks. Do the "How to test" run on staging before launch.

## How to test

Prerequisites: a staging Supabase project with `init_schema.sql`, the seed, and the five
Stage 1 migrations applied, plus the Auth settings from `stage1.md` §2. Put its URL and anon
key in `.env.local`, then run `npm install && npm run dev` and open `http://localhost:5173/`
in a phone-sized window.

Automated:

```bash
npm test                 # 108 unit tests
npm run test:db          # needs local Postgres + PostGIS (or TEST_DATABASE_URL to a local server)
npm run build:pages      # GitHub Pages build still works
```

**Sign-up**
1. Open Profil → Giriş yap → "Hesabın yok mu? Hesap oluştur".
2. Enter name "Test", city Ankara, a real e-mail address you can read, and a 7-character password. Expect "Şifre en az 8 karakter olmalı."
3. Use a password of 8+ characters → "E-postanı kontrol et".
4. Open the link from the e-mail **in the same browser**. You land on the app, the URL loses `?code=`, the toast says "E-postan doğrulandı", and Profil shows the name "Test" and "<e-mail>, Ankara".
5. In the SQL editor: `select * from profiles;` shows one row with display_name `Test` and city `Ankara`.
6. Sign out (Ayarlar → Çıkış yap), then sign in again with the same e-mail and password. A wrong password shows "E-posta veya şifre hatalı."

**Follows**
1. Open any event. Tap ＋ next to a performer under "Sahnede", and ＋ next to the venue name.
2. On a performer page, tap "Takip et" (it becomes "Takip ediliyor").
3. On the map, open a venue and tap "Takip et" in the sheet.
4. Profil → Takip lists the artists and venues. Tapping ✓ unfollows.
5. In SQL: `select * from followed_performers; select * from followed_venues;` shows only your rows.
6. Logged out, tapping "Takip et" goes to the login page and comes back after sign-in.

**Discover**
1. Tap the "Keşfet" tab. Logged out: "Sana özel" shows a sign-in prompt; "Bu hafta sonu" and "Yeni keşifler" have events for the selected city.
2. Logged in, after the follows above: "Sana özel" lists events of followed artists first (badge "Takip ettiğin sanatçı"), then followed venues, then categories of saved events ("Sevdiğin tür").
3. Events from followed artists or venues never appear under "Yeni keşifler". It shows at most 10 events, one per venue.
4. Switch Ankara ↔ İstanbul: "Bu hafta sonu" and "Yeni keşifler" change; "Sana özel" does not.

**Tonight**
1. On the map, tap "Bu akşam". The summary reads "Bu akşam, tüm türler" and the time picker appears.
2. Pick 21:00. The summary becomes "Bu akşam, 21:00 ve sonrası…", and only events starting from 21:00 until 06:00 tomorrow remain.
3. Tap "Bu akşam" again to return to the previous date filter.
4. In Keşfet, tap "Bu akşam": the sections are replaced by one "Bu akşam" list for the city, using the same start time.
5. To test after midnight, use `npm run seed:events` to get events tonight, or check `src/lib/dates.test.ts`.

**Calendar**
1. Save two events with the heart, one of them in a later month.
2. Profil → "Takvimim" shows months in order ("Ekim 2026", "Kasım 2026"…) with the saved events ("Kaydettiğin") and upcoming events of followed artists and venues.
3. Tapping a row opens the event page.
4. Unsave and unfollow everything → "Takviminde yaklaşan etkinlik yok…".

**Notifications**
1. Profil → bell icon shows "Henüz bildirimin yok."
2. Optional: insert a row as the service role (`insert into notifications (user_id, kind, title) values ('<your uid>', 'saved_event_reminder', 'Deneme');`) and reload; it appears.

**Export**
1. Ayarlar → Hesap verilerim → "Verilerimi indir (JSON)". A file `eventall-verilerim-YYYY-MM-DD.json` downloads.
2. It contains `account.email`, `profile`, your follows, saved and attended events, `notifications` and `activity` (your analytics rows), and nothing from other users.

**Deletion**
1. Create a second account B and save something with it.
2. As A: Ayarlar → "Hesabımı sil". Typing "evet" keeps the red button disabled; typing "sil" enables it.
3. Confirm → "Hesabın ve verilerin silindi." You are signed out on the map.
4. In SQL:
   - `select count(*) from auth.users where email = '<A>'` returns 0.
   - Each of `profiles`, `followed_*`, `saved_events`, `attended_events`, `notifications` and `analytics_events` has 0 rows for A's id.
   - B's rows are still there.
5. Signing in again as A fails with "E-posta veya şifre hatalı."

**Analytics**
1. Open an event, tap "Siteye git", save an event, follow something, open Keşfet.
2. `select event_name, event_id, user_id from analytics_events order by id desc limit 10;` shows the five event names; `user_id` is null for actions taken while signed out.
3. Build with `VITE_ANALYTICS_ENABLED=false` and repeat: no new rows.
