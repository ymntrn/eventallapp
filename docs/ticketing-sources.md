# Ticketing sources: access status

What we may do with each platform's data, and how. **Rule: no automated access to a
platform unless its robots.txt and terms of use allow it, or it gives us a feed/API or
written permission.** Until then, an adapter only reads saved fixture files.

## Status (checked 2026-10-09)

**Nothing could be checked.** The environment this was prepared in could not reach any
of the five sites (HTTPS to biletix.com, passo.com.tr, biletinial.com, bubilet.com.tr and
mobilet.com was refused by the network policy), and a web search found no copy of their
robots.txt or terms. So none of the cells below is filled from a primary source, and no
platform counts as permitting automated access.

| Platform | robots.txt | Terms of use on automated access | Public API | Affiliate / partner feed | Sitemap | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Biletix | not checked | not checked | not known | not known | not checked | No automated access |
| Passo | not checked | not checked | not known | not known | not checked | No automated access |
| Biletinial | not checked | not checked | not known | not known | not checked | No automated access (adapter runs on a fixture) |
| Bubilet | not checked | not checked | not known | not known | not checked | No automated access |
| Mobilet | not checked | not checked | not known | not known | not checked | No automated access |

## How to fill this in (about 15 minutes per platform, from a normal browser)

1. Open `https://<site>/robots.txt`. Note the `User-agent: *` rules and whether event,
   search or listing paths are disallowed. Note any `Sitemap:` lines.
2. Find the terms page (footer: "Kullanım Koşulları", "Üyelik Sözleşmesi", "Yasal
   Uyarı"). Search it for: *otomatik*, *robot*, *bot*, *örümcek*, *tarama*, *kazıma*,
   *veri madenciliği*, *içerik kopyalama*, *ticari amaçla*. Copy the exact clause and the
   page URL into this file.
3. Look for a developer/API page, a "İş ortaklığı" / affiliate programme, or a B2B
   contact. Ask by e-mail for (a) an event feed for Ankara and İstanbul, (b) permission to
   show prices, and (c) deep links with affiliate tracking. Record the answer and its date.
4. Update the table. A platform moves to "permitted" only when robots.txt allows the paths
   we need **and** the terms do not forbid automated collection, **or** the platform gave
   us a feed/API/written permission. Robots.txt alone is not permission.

Background, not a finding: Biletix is the Turkish brand of Ticketmaster (Live Nation),
whose terms elsewhere forbid bots. Expect Biletix to need a partnership rather than crawling.

## Recommended path

Partnership first: a feed or affiliate deal gives stable ids, prices and deep links,
and is the only option that scales to five platforms. For the Ankara demo (see
`docs/demo-plan.md`), curate events by hand into `src/data/events.json` from public
event pages, and link only to the platform's own event page.

## Importer

`scripts/events/` holds the pipeline (fetch → normalize → match venue → merge → write).
See the README, section "Real events pipeline". The only adapter, `biletinial`, reads
`scripts/events/fixtures/biletinial-ankara.sample.json`, an invented fixture, and has a
`TODO(access)` where a permitted live fetch would go.
