# Ticketing sources: access status

What we may do with each platform's data, and how. **Rule: no automated access to a
platform unless its robots.txt and terms of use allow it, or it gives us a feed/API or
written permission.** Until then, an adapter only reads saved fixture files.

## Status (checked 2026-10-10)

Each site's robots.txt and terms were read on 2026-10-10 from a normal browser. Clauses below
are paraphrased; the Turkish terms are the binding text, so re-read them before relying on this.

| Platform | robots.txt | Terms on automated access | API / partner route | Verdict |
| --- | --- | --- | --- | --- |
| Biletix | Allows event pages; blocks cart, payment, account, `/t/`, `/rsv/` and a cached API path. Publishes sitemaps for events, performances, venues and artists | Forbids robots, spiders and other automated tools without Biletix's **written permission**, and forbids copying site content or databases | Footer links to the **Ticketmaster affiliate / developer programme** (developer.ticketmaster.com/partners). Turkey is not listed among the Discovery API's named markets, so ask | **No automated access.** Ask for affiliate/feed access |
| Passo | Allows event pages; blocks cart, payment, seat selection, account, login, downloads | Forbids copying, publishing or distributing site information or databases without Passo's **prior written consent** | None found on the site | **No automated access.** Ask for a feed |
| Biletinial | Allows everything except login and `/kino/` (cinema) paths, for all bots including AI crawlers. Sitemap published | Content may be copied for personal use only; changing, copying, publishing it needs Biletinial's **written permission** | None found | **No automated access** (robots.txt alone is not permission). Ask |
| Bubilet | Allows most pages; blocks search, orders, profile, per-showtime ticket pages. Sitemaps for events, blog, venues | Explicitly forbids **bots, crawlers, scraping, data mining and automated querying**, and robots/spiders without **prior written permission** | None found | **No automated access.** Ask |
| Mobilet | Allows the site except filter query URLs (`?eventTypes=`, `?cities=`, `?dates=`, `?tags=`). Sitemap published | Terms PDF forbids robots, spiders and other automated tools without Mobilet's **written permission**, and copying content | None found | **No automated access.** Ask |

**Bottom line:** all five forbid automated collection without written permission. A live
adapter is not allowed for any of them today. The only route is a partnership or feed.

Terms pages:
- Biletix: https://www.biletix.com/ourpolicies/TURKIYE/tr (tab "Kullanım Koşulları")
- Passo: https://www.passo.com.tr/tr/uyeliksozlesmesi
- Biletinial: https://biletinial.com/tr-tr/sayfa/sozlesme-ve-politikalar
- Bubilet: https://www.bubilet.com.tr/sayfa/kullanim-kosullari and /sayfa/kullanici-sozlesmesi
- Mobilet: https://cdn.mobilet.com/cms-assets/uploads/6_Mobilet_kullanim_kosullari_add5dc3e7a.pdf

## What to send each platform

Ask for (a) an event feed for Ankara and İstanbul, (b) permission to show prices, and
(c) deep links with affiliate tracking. Record the answer and its date in the table.

- **Biletix:** apply through the Ticketmaster partner/affiliate programme linked in the
  Biletix footer, and ask whether the Discovery API or a feed covers Turkey.
- **Passo, Biletinial, Bubilet, Mobilet:** e-mail their business/partnership contact (from
  the site's İletişim page) with the three asks above and a link to the demo.

A platform moves to "permitted" only with a feed/API or written permission.

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
