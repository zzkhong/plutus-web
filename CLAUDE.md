# CLAUDE.md — plutus-web

Context for an agent working on this repo. The first slice is built (see
[Status](#status) at the bottom); read this before designing anything new.

## Commands

```bash
npm run dev         # next dev; needs PLUTUS_API_URL (see .env.example)
npm run build       # next build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm test            # tsx --test over the files listed in package.json (add new ones there)
```

## Layout

- `app/api/web/[...path]/route.ts` → [app/api/web/proxy.ts](app/api/web/proxy.ts):
  forwards `/api/web/*` to `PLUTUS_API_URL/api/web/*`, passing only the path,
  query, body, `Authorization` and `Content-Type`. Segments must match
  `[A-Za-z0-9_-]+`, so nothing can climb out of `/api/web`. 503 without
  `PLUTUS_API_URL`, 502 when plutus-ai is unreachable.
- `app/page.tsx` loads [components/MiniApp.tsx](components/MiniApp.tsx)
  client-only (it needs `window.Telegram`). MiniApp signs in, follows the
  chat's colorScheme (`data-theme` on `<html>`), and shows the tabs:
  Overview, Expenses, and Admin for admins.
- [lib/api.ts](lib/api.ts): `ApiClient` trades initData for a bearer token
  **held in memory, not a cookie**. On Telegram Web the Mini App is an iframe,
  where a cookie would be third-party and may be blocked. On a 401 it trades
  initData again, once.
- [lib/format.ts](lib/format.ts): all money and date formatting (pure,
  tested). Months and days are Singapore time.
- [lib/use-api.ts](lib/use-api.ts): `useLoad(key, load)` keeps a result only
  for the key it was loaded for.
- [app/globals.css](app/globals.css): color tokens over Telegram's
  `--tg-theme-*`, with light and dark fallbacks. `--bar` is the chart color:
  a fixed, contrast-validated blue that doesn't follow the Telegram theme.

## What plutus-web is

The web companion to **Plutus AI** (`../plutus-ai`, GitHub `zzkhong/plutus-ai`),
a personal finance assistant that lives in Telegram. People log expenses by
chatting with the bot ("Spent $4.50 at Ya Kun", "Grab 18 yesterday", a voice
note, a receipt photo, or automatically from Apple Pay), set monthly budgets,
record income, and get alerts, a nightly digest and a month-end review.

Chat is good for *capturing* money; it's poor for *seeing* it. plutus-web is
where a user looks at their data:

- spending over time, by category and merchant, month against month;
- budgets, with progress and where each is heading at the current pace;
- income, savings rate, and the month-end review in a richer form;
- a transaction list that's easier to search, filter and bulk-fix than
  `/recent` in Telegram;
- the portfolio (net worth, allocation, holdings).

**The Telegram bot stays the primary way to log.** Don't rebuild expense
capture on the web. Editing, categorizing and deleting are fine.

## plutus-ai is the system of record

Everything about the data belongs to plutus-ai. Its [CLAUDE.md](../plutus-ai/CLAUDE.md)
is the detailed reference; the parts that matter here:

- **Stack:** TypeScript on Node 22, grammy (Telegram), Hono (HTTP), Drizzle
  ORM over libSQL. Production is **Vercel** (region `hnd1`, Tokyo) + **Turso**
  (`aws-ap-northeast-1`, Tokyo). The owner is in Singapore.
- **Multi-user, bring-your-own-key.** Every user registers through the bot and
  supplies their own Gemini API key, encrypted at rest. There is no global LLM
  key. Users are `onboarding` → `pending_approval` → `approved`; an admin
  approves sign-ups. **Only approved users may see anything.**
- **Every query is scoped by `user_id`.** A user must never see or change
  another user's rows. Treat any id that arrives from a browser as untrusted
  and always look it up together with the session's user id.
- **Timezone:** all day and month logic is in `Asia/Singapore` (the app's
  `APP_TIMEZONE`). "This month" means the calendar month there, not UTC.

## Data model (Turso / libSQL)

All money is **integer cents**. Each row keeps its original `amount` and
`currency` plus **`amount_sgd`**, the value in SGD at that day's exchange rate.
Every total, budget and chart uses `amount_sgd`. Currencies are **SGD, MYR and
USD** only. Format money as `S$4.50`, `RM45.00`, `$10.00`, and show
`RM45.00 (S$14.02)` when the original isn't SGD.

| Table | What matters |
|---|---|
| `users` | `id`, `telegram_chat_id` (unique), `status`, `is_admin`. Never expose `llm_api_key_encrypted` or `webhook_api_key`. |
| `transactions` | Expenses. `merchant`, `category`, `source` (`text`, `voice`, `receipt`, `apple_pay`, `recurring`, `split`), `note`, `recurring_id`. **Two times:** `spent_at` = when the money was spent (use it for every total, chart and month), `created_at` = when it was logged (use it for "recently added"). `spent_at` can be null on a few rows, so always read `coalesce(spent_at, created_at)`. |
| `income` | `amount`, `currency`, `amount_sgd`, `source` (a label such as "Salary"), `received_at`. Never mixed into spending. |
| `budgets` | Monthly limits. `category` is one of the ten categories **or `Overall`** (all spending). One row per user per category. `amount_sgd` is the limit. Budgets aren't versioned: past months are judged against today's amounts. |
| `budget_alerts` | Dedup of alerts already sent (threshold `80`, `100`, or `0` = pace), per budget per `YYYY-MM`. Bot-internal. |
| `recurring_transactions` | Monthly templates (`day_of_month` 1–31) that the bot logs automatically. |
| `holdings` | Portfolio. Stocks and ETFs carry a statement `price` and `price_as_of`, with no live quotes. Crypto is priced live from CoinGecko by plutus-ai; cash is at face value. |
| `split_sessions`, `fx_rates` | Bot-internal. Ignore. |

Categories (exact strings): `Food, Transport, Groceries, Entertainment, Bills,
Health, Education, Travel, Shopping, Others`.

Derived numbers must match what the bot says; plutus-ai already computes them:

- **Budget status:** spent this month against `amount_sgd`, as a percentage.
  The Overall budget counts all spending.
- **Pace:** `projected = spent ÷ day of month × days in month`, shown only from
  the 7th. A budget is "heading over" when the projection exceeds it.
- **Savings rate:** `(income − spending) ÷ income` for the month.
- **Month review:** spending against the month before, change per category,
  top merchants (case-folded), income, and budgets kept or missed.

## How plutus-web should get the data (recommended)

**Call a JSON API on plutus-ai. Don't read Turso directly.** plutus-ai owns the
schema, runs its migrations at build time, and already has user-scoped service
functions for every number above (`getSpendingSummary`, `getBudgetStatus`,
`listTransactionsBetween`, `collectMonthReview`, `getPortfolioSummary`,
`setTransactionCategory`, `correctTransaction`, `deleteTransaction`, …).
Reading Turso from plutus-web would duplicate the rules (the `spent_at`
coalesce, the SGD conversion, pace, the Overall budget), which then drift, and
it would put a database token into a second deployment.

The read-only part of this API exists (see [Status](#status)); the rest goes in **plutus-ai**, as Hono routes
under `/api/web/*` in `src/webhook/`, following its existing conventions:
secret checked with `safeEqual`, 503 when unconfigured, every service call
scoped by user id. The contract to ask for:

```
POST   /api/web/session                  body: { initData } → { token, user: { id, isAdmin } }
GET    /api/web/summary?month=YYYY-MM     totals, by category, income, savings rate
GET    /api/web/transactions?from=&to=&category=&q=&cursor=   newest spent_at first
PATCH  /api/web/transactions/:id          { category?, amount?, currency?, merchant?, date? }
DELETE /api/web/transactions/:id
GET    /api/web/budgets?month=YYYY-MM     status per budget, incl. projected_sgd
PUT    /api/web/budgets/:category         { amount, currency }     (category may be Overall)
DELETE /api/web/budgets/:category
GET    /api/web/income?from=&to=
POST   /api/web/income                    { amount, currency, source, date }
DELETE /api/web/income/:id
GET    /api/web/review?month=YYYY-MM      the month review, as data rather than text
GET    /api/web/portfolio                 net worth, allocation, holdings
```

Return money as integer cents plus currency, and dates as ISO strings. Let
plutus-web do the formatting.

## Auth: Telegram is the identity

Users have no password or email with Plutus; their identity is their Telegram
account. Two options:

1. **Telegram Mini App (recommended first).** The bot gets a menu button that
   opens plutus-web inside Telegram. The page reads
   `window.Telegram.WebApp.initData` and sends it to plutus-ai, which
   **validates it on the server**:
   - Build the data-check string from every field except `hash`, sorted by
     key, as `key=value` lines joined with `\n`.
   - Compute `secret = HMAC_SHA256(key = "WebAppData", message = bot token)`.
   - Accept only if `hex(HMAC_SHA256(key = secret, message = data-check string))`
     equals `hash` (constant-time compare), and `auth_date` is recent (say,
     under a day old).
   - Then map the Telegram user id to `users.telegram_chat_id`. For a private
     chat the chat id equals the user id. Require `status = 'approved'`.

   Issue a short-lived session token (built: a 1-hour bearer token, held in memory).
   **Only plutus-ai knows the bot token, so validation must happen there**, not
   in plutus-web.
2. **Plain website with the Telegram Login Widget.** Same idea with a
   different check: `secret = SHA256(bot token)`, then HMAC-SHA256 of the
   data-check string. This needs the site's domain registered with @BotFather
   (`/setdomain`).

Never accept a Telegram user id from the client without one of those checks.

## Hosting

- **Vercel**, in the same team as plutus-ai, region **`hnd1`** so it sits next
  to plutus-ai and Turso. The Hobby plan is fine for personal use.
- Suggested stack: **Next.js (App Router)** with TypeScript. Keep it
  server-light: plutus-ai does the data work, and plutus-web renders it.
- Environment: `PLUTUS_API_URL`, the production URL of plutus-ai. No database
  credentials and no bot token.
- A different origin from plutus-ai means plutus-ai needs CORS for the web
  origin, or plutus-web should proxy through its own route handlers. The proxy
  is simpler and keeps the session token in an httpOnly cookie.
- Inside Telegram, respect the Mini App theme (`Telegram.WebApp.themeParams`),
  and design mobile-first: most use happens on a phone.

## Suggested first slice

1. plutus-ai: `/api/web/session` (initData validation) + `/api/web/summary` +
   `/api/web/transactions`, with tests in plutus-ai's style.
2. plutus-web: a Mini App page showing this month's totals, a category
   breakdown and the transaction list, opened from a bot menu button.
3. Then budgets (with pace), the month review, editing, and the portfolio.

## Decisions (confirmed with the user, 2026-09-24)

- **Mini App only.** No standalone site or Login Widget for now.
- **Read-only first.** Editing (PATCH/DELETE) comes in a later slice.
- **Admins get an Admin tab** listing users, with those waiting for approval
  first. It's read-only: approving and rejecting stay `/approve` and `/reject`
  in the bot.
- **Category mix is the first chart**: horizontal bars, sorted, one series
  color, and a value at each tip.

## Status

Built in slice 1:

- **plutus-ai** ([src/webhook/routes/web.ts](../plutus-ai/src/webhook/routes/web.ts)):
  `POST /session`, `GET /me`, `GET /summary?month=`, `GET /transactions`
  (`from`/`to` are inclusive `YYYY-MM-DD`, `category`, `q` = merchant
  substring, `cursor`, `limit` ≤ 100; returns `{ transactions, nextCursor }`),
  and `GET /admin/users`. The session token is a 1-hour HMAC token under
  plutus-ai's `WEB_SESSION_SECRET` (not a JWT library). Routes return 503
  unless both `TELEGRAM_BOT_TOKEN` and `WEB_SESSION_SECRET` are set.
  `npm run telegram:webhook -- menu <url>` sets the bot's Dashboard button.
- **plutus-web**: Overview (month switcher, spent vs last month, income,
  savings rate, category bars), Expenses (search, category filter, grouped
  by day, load more), and Admin.

Next: budgets with pace, the month review as data, editing, the portfolio.

To deploy: set `WEB_SESSION_SECRET` on plutus-ai, create this Vercel project
with `PLUTUS_API_URL`, then run the `menu` command with this site's URL.
