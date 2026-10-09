# One-week Ankara demo

Goal: a week in which Eventall shows **real Ankara events** on the map with correct pins and
working links to the sellers, used by a small group of testers, so that at the end we can
show a ticketing platform real usage numbers and ask for a feed or partnership.

Scope: Ankara only (the İstanbul data stays in the app but is not promoted). No scraping:
events are curated by hand from public event pages until a platform gives us a feed (see
`docs/ticketing-sources.md`).

## What must be live before day 1

| Item | Done when |
| --- | --- |
| Venue pins | Every Ankara venue that has an event this week is `verified: true` (`npm run venues:review -- --city Ankara`), including CSO Ada Ankara, Gençlik Parkı, Ankapark and Mogan Parkı if they host events |
| Missing venues | Pins sent for Ankara Arena, Küçük Tiyatro, İrfan Şahinbaş Atölye Sahnesi and Saklıkent if any of them hosts an event this week (`data/venues/MISSING.md`) |
| Events | At least 40 real Ankara events for the next 7 days, across at least 4 categories and 15 venues, in `src/data/events.json` (or Supabase). No `[Örnek]` titles left. The sample notice then disappears on its own |
| Offers | Each event links to the seller's **own event page** (not the homepage), with the price shown there and the date checked. Events sold by several sellers have one offer per seller |
| Deploy | HTTPS URL on Vercel/Netlify, installable as PWA, tested on one iPhone (Safari) and one Android (Chrome) |
| Attribution | "© OpenStreetMap contributors" visible on the map, Settings → Veri kaynakları present |
| Measurement | Analytics in place (see "What to measure"); privacy line in Settings saying what is counted |
| Testers | 20–50 people in Ankara (friends, a university club, a music community) invited with the link and a one-line ask: "Bu hafta bir etkinliğe gitmeden önce Eventall'a bak." |

## Daily checklist (every morning, ~45 min)

1. **Prune and add events.** Remove cancelled/past events; add newly announced ones for
   the next 7 days. Re-check prices and sold-out state on the seller pages for events in
   the next 48 hours.
2. **Validate.** `npm run validate:data` (0 errors; no unknown venues; no past events
   warning beyond yesterday's). If using Supabase: `npm run db:seed -- --prune` and
   `psql "$SUPABASE_DB_URL" -f supabase/seed.sql`.
3. **Deploy and smoke-test** on a phone: map loads on Ankara, filter "Bu akşam" shows
   tonight's events, open two events, tap "Siteye git" on each, and check the seller page opens
   on the right event.
4. **New venues.** If an event is at a venue we do not have, add the pin (MISSING.md flow)
   before publishing the event. Never guess a pin.
5. **Read yesterday's numbers** (below) and note anything odd in a short log
   (`docs/demo-log.md`): broken links, wrong pins, tester feedback.

## What to measure

Keep it to a few numbers that a ticketing platform cares about:

| Metric | How |
| --- | --- |
| Weekly users / returning users | Privacy-friendly analytics (e.g. Plausible or Umami), no cookies, no personal data |
| Event page views | page views on `#/event/…` |
| **Outbound clicks per seller** | event on "Siteye git" with `platform`, `eventId`, `venueId`, price shown and whether it was the cheapest. This is the headline number |
| Click-through rate | outbound clicks ÷ event page views |
| Cheapest-offer share | share of clicks that went to the offer marked "En ucuz" (shows price comparison matters) |
| Search terms with no result | log the query text only (no user id); tells us what is missing |
| Data quality | number of broken links, wrong pins and wrong prices found per day (from the log) |
| Qualitative | 5-minute call or form with 5–10 testers at the end of the week |

Add UTM parameters to outbound links only after agreeing it with a platform; until then
send clean links.

## Script for showing it to a ticketing platform (10 minutes)

1. **The problem (1 min).** "Ankara'da bu akşam ne var? sorusunun cevabı beş farklı
   sitede. Kullanıcı hepsine tek tek bakmıyor; çoğu etkinliği hiç görmüyor."
2. **Live demo (4 min).** Open the PWA on a phone. Map of Ankara, "Bu akşam" filter, tap a
   venue pin, open an event, show the price comparison, tap "Siteye git" and land on *their*
   event page. Point out: we do not sell tickets, the purchase happens on their site.
3. **Numbers from the week (2 min).** Users, event views, outbound clicks to them (and the
   share of all clicks), click-through rate, what people searched for.
4. **The ask (2 min).** Three options, smallest first:
   - permission to list their events with links and prices (written OK);
   - an event feed or API for Ankara (and İstanbul next), with event-page deep links;
   - an affiliate/referral arrangement so clicks we send are tracked and rewarded.
5. **What we give back (1 min).** Extra discovery traffic at no cost to them, correct venue
   data (OSM-based, verified pins), attribution to their brand on every offer, and a
   weekly click report.

Bring: the click report as one page, a screenshot of the event page with their offer, and
the data-handling summary (no ticket sales, no personal data passed on).
