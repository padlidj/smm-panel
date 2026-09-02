# SMM Panel — Design Spec

## Stack
- **Frontend + Backend:** Next.js 14 App Router (TypeScript)
- **Database:** PostgreSQL 16 via Prisma ORM
- **UI:** Tailwind CSS + lucide-react icons, dark theme
- **Auth:** NextAuth.js (credentials provider, bcrypt)
- **Payment:** Midtrans Snap + VT-Web
- **Cron:** systemd timer, standalone Node/tsx scripts in `cron/`
- **Deploy:** VPS bare Node, CloudPanel nginx reverse proxy, systemd service

## Architecture

```
smm-panel/
├── app/
│   ├── (public)/              → landing, auth (login/register/reset)
│   ├── (dashboard)/           → user panel, sidebar+topbar layout
│   │   ├── order/
│   │   ├── order/refill/
│   │   ├── deposit/
│   │   ├── ticket/
│   │   └── service/
│   ├── (admin)/               → admin panel, sidebar+topbar layout
│   │   ├── user/
│   │   ├── order/
│   │   ├── order/refill/
│   │   ├── service/
│   │   ├── deposit/
│   │   ├── ticket/
│   │   ├── admin/
│   │   ├── settings/
│   │   ├── log/
│   │   └── page/
│   └── api/                   → API routes (no layout)
│       ├── auth/
│       ├── order/
│       ├── deposit/
│       ├── midtrans/webhook
│       ├── ticket/
│       ├── service/
│       └── reseller/          → standard SMM API
├── components/
│   ├── ui/                    → button, input, card, table, modal, badge, toast, select, tabs, pagination
│   ├── layout/                → sidebar, topbar, footer, theme-toggle
│   ├── forms/                 → order-form, deposit-form, ticket-form, service-form
│   ├── tables/                → order-table, deposit-table, user-table, ticket-table, balance-log-table
│   ├── order/                 → order-card, order-status-badge, service-selector
│   ├── deposit/               → payment-method-card, snap-redirect
│   └── admin/                 → admin-sidebar, admin-stat-card, admin-chart
├── lib/
│   ├── prisma.ts              → Prisma client singleton
│   ├── midtrans.ts            → Midtrans Snap + VT-Web helper
│   ├── balance.ts             → balance transaction helper (FOR UPDATE)
│   ├── provider.ts            → generic provider executor (dot-path extract, no eval)
│   ├── email.ts               → email helper (sendgrid/nodemailer)
│   └── auth.ts                → auth config + middleware
├── cron/
│   ├── order-status.ts        → 2m interval, poll Pending/Processing orders
│   ├── refund.ts              → 5m interval, refund Error/Partial orders
│   ├── service-sync.ts        → 30m interval, sync services from providers
│   ├── deposit-expire.ts      → 10m interval, cancel expired Pending deposits
│   └── delete-user.ts         → 1w interval, cleanup unactivated users
├── prisma/
│   └── schema.prisma
├── middleware.ts              → auth guard, admin guard
├── tailwind.config.ts
└── .env
```

## Database Schema (Prisma)

### User
- `id` (Int, PK, autoincrement)
- `username` (String, unique)
- `email` (String, unique)
- `password` (String, bcrypt hash)
- `full_name` (String?)
- `balance` (Decimal, default 0)
- `role` (Enum: USER, ADMIN)
- `status` (Enum: ACTIVE, BANNED, UNVERIFIED)
- `api_key` (String?)
- `api_whitelist_ips` (String?)
- `notification` (JSON, email notif preferences)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### ServiceCategory
- `id` (Int, PK)
- `name` (String)
- `status` (Boolean, default true)
- `created_at`

### Service
- `id` (Int, PK)
- `category_id` (FK → ServiceCategory)
- `provider_id` (FK → ServiceProvider)
- `name` (String)
- `type` (Enum: DEFAULT, COMMENT_LIKES, CUSTOM_COMMENTS, SUBSCRIPTIONS)
- `price` (Int, in IDR per 1000)
- `profit` (Int, in IDR per 1000)
- `min` (Int)
- `max` (Int)
- `description` (Text?)
- `status` (Boolean, default true)
- `provider_service_id` (String?)
- `refill_provider_service_id` (String?)
- `created_at`, `updated_at`

### ServiceProvider
- `id` (Int, PK)
- `name` (String, unique)
- `provider_id` (String) — API param ID
- `provider_key` (String) — API key
- `provider_secret` (String?) — secret
- `status` (Boolean, default true)
- `is_refill_support` (Boolean, default false)
- `profile_config` (JSON) — endpoint + request/response mapping for balance check
- `order_config` (JSON) — endpoint + request/response mapping for placing order
- `status_config` (JSON) — endpoint + request/response mapping + status_value mapping
- `service_config` (JSON) — endpoint + request/response mapping + profit/price setting + looping
- `refill_config` (JSON?) — endpoint + request/response mapping for refill
- `refill_status_config` (JSON?) — endpoint + request/response mapping + status_value for refill
- `currency` (Enum: IDR, USD, default IDR)
- `created_at`, `updated_at`

### Order
- `id` (Int, PK)
- `user_id` (FK → User)
- `service_id` (FK → Service)
- `provider_id` (FK → ServiceProvider)
- `service_name` (String)
- `target` (String)
- `quantity` (Int)
- `price` (Decimal, total charged to user)
- `profit` (Decimal, total profit)
- `remains` (Int, default 0)
- `start_count` (Int, default 0)
- `status` (Enum: PENDING, PROCESSING, SUCCESS, ERROR, PARTIAL)
- `is_refund` (Boolean, default false)
- `is_api` (Boolean, default false)
- `provider_order_id` (String?)
- `provider_order_log` (Text?)
- `provider_status_log` (Text?)
- `custom_comments` (Text?)
- `username` (String?)
- `ip_address` (String?)
- `location` (String?)
- `created_at`
- `updated_at`

### OrderRefill
- `id` (Int, PK)
- `order_id` (FK → Order)
- `user_id` (FK → User)
- `target` (String)
- `quantity` (Int)
- `price` (Decimal)
- `profit` (Decimal)
- `status` (Enum: PENDING, PROCESSING, SUCCESS, ERROR)
- `provider_refill_id` (String?)
- `created_at`, `updated_at`

### Deposit
- `id` (Int, PK)
- `user_id` (FK → User)
- `amount` (Decimal)
- `fee` (Decimal, default 0)
- `net` (Decimal)
- `method` (String)
- `status` (Enum: PENDING, SUCCESS, FAILED, EXPIRED)
- `midtrans_order_id` (String?)
- `snap_token` (String?)
- `snap_redirect_url` (String?)
- `ip_address` (String?)
- `created_at`, `updated_at`

### DepositMethod
- `id` (Int, PK)
- `payment` (String) — group name
- `method` (String) — display name
- `type` (Enum: MANUAL, AUTO)
- `min` (Decimal)
- `max` (Decimal)
- `fee_percent` (Decimal)
- `status` (Boolean, default true)
- `created_at`

### Ticket
- `id` (Int, PK)
- `user_id` (FK → User)
- `subject` (String)
- `message` (Text)
- `status` (Enum: OPEN, REPLIED, CLOSED)
- `created_at`, `updated_at`

### TicketReply
- `id` (Int, PK)
- `ticket_id` (FK → Ticket)
- `user_id` (FK → User) — nullable, for admin replies
- `is_admin` (Boolean)
- `message` (Text)
- `created_at`

### BalanceLog
- `id` (Int, PK)
- `user_id` (FK → User)
- `type` (Enum: PLUS, MINUS)
- `action` (String) — Order, Refund, Deposit, Admin, Refill
- `amount` (Decimal)
- `balance_before` (Decimal)
- `balance_after` (Decimal)
- `description` (String?)
- `created_at`

### CustomPrice
- `id` (Int, PK)
- `user_id` (FK → User, unique with service_id)
- `service_id` (FK → Service)
- `price` (Decimal)
- `profit` (Decimal)
- `created_at`, `updated_at`

### ServiceFavorite
- `id` (Int, PK)
- `user_id` (FK → User)
- `service_id` (FK → Service)
- `created_at`

### ServiceLog
- `id` (Int, PK)
- `user_id` (FK → User?)
- `service_id` (FK → Service)
- `provider_id` (FK → ServiceProvider)
- `logs` (Text)
- `created_at`

### Admin (multi-level)
- `id` (Int, PK)
- `username` (String, unique)
- `email` (String, unique)
- `password` (String)
- `level` (Enum: ADMIN, SUPERADMIN)
- `status` (Boolean, default true)
- `created_at`, `updated_at`

### LoginLog
- `id` (Int, PK)
- `user_id` (Int?)
- `username` (String)
- `type` (Enum: USER, ADMIN)
- `ip_address` (String)
- `user_agent` (String?)
- `location` (String?)
- `status` (Enum: SUCCESS, FAILED)
- `created_at`

### WebsiteConfig
- `id` (Int, PK)
- `key` (String, unique)
- `value` (JSON)
- `created_at`, `updated_at`

### WebsiteInformation
- `id` (Int, PK)
- `title` (String)
- `content` (Text)
- `status` (Boolean)
- `created_at`, `updated_at`

### WebsitePage
- `id` (Int, PK)
- `title` (String)
- `slug` (String, unique)
- `content` (Text)
- `status` (Boolean)
- `created_at`, `updated_at`

## Core Flows

### Order (Single)
1. User selects category → service, enters target + quantity
2. Server validates: service active, qty within min/max, balance >= price
3. `prisma.$transaction`:
   - `SELECT user.balance FOR UPDATE` (row lock)
   - Check balance
   - `INSERT Order`
   - `UPDATE user.balance -= price`
   - `INSERT BalanceLog`
4. After commit: POST to provider via `provider.ts` executor
5. Provider ok → `UPDATE order SET provider_order_id, status=Processing`
6. Provider fail → `UPDATE order SET status=Error, provider_order_log=response`
   - Immediate refund via transaction

### Order (Bulk)
- Same as single but batch: validate all items first, then process in one transaction
- Each line = separate Order record

### Deposit
1. User selects method + amount
2. `POST /api/deposit` → generate Midtrans Snap token
3. Save Deposit record (status=Pending, snap_token)
4. Frontend opens Snap popup / redirects to VT-Web
5. Midtrans sends webhook `POST /api/midtrans/webhook`
6. Verify signature: `sha512(order_id + status_code + gross_amount + server_key)`
7. If `transaction_status` in (settlement, capture):
   - `prisma.$transaction`: UPDATE Deposit status=Success, credit user balance, INSERT BalanceLog
   - Idempotent: skip if already Success
8. Frontend: poll order status or show success page

### Provider Generic Config
Each provider stores JSON config in `ServiceProvider` fields:
```json
{
  "endpoint": "https://provider.com/api",
  "request": {
    "action": "order",
    "service": "{service}",
    "target": "{target}",
    "quantity": "{quantity}"
  },
  "response": {
    "order_id": "data.order_id"
  }
}
```
- `{placeholder}` replaced with actual values
- Response extracted via `lodash.get(response, path)` — no `eval()`
- Status mapping: `status_value` maps provider strings to panel statuses

### Cron Jobs
| Cron | Interval | Action |
|---|---|---|
| order-status | 2m | Poll Pending/Processing orders, update status via provider |
| refund | 5m | Refund Error/Partial orders, proportional from remains |
| service-sync | 30m | Pull services from provider, upsert with profit margin |
| deposit-expire | 10m | Cancel Pending deposits >24h |
| delete-user | 1w | Delete unactivated users >7 days |

## Midtrans Integration
- **Snap**: modal popup, user stays on site
- **VT-Web**: redirect to Midtrans payment page
- Both supported: user selects mode in deposit form
- Webhook endpoint: `/api/midtrans/webhook` — no auth, signature verified
- Sandbox toggle via `MIDTRANS_IS_PRODUCTION` env

## Auth
- NextAuth.js with credentials provider
- Admin: `/admin` routes check `session.user.role === ADMIN`
- Middleware: protect `/dashboard` and `/admin` routes
- Session: JWT (no DB session needed)

## Deployment
- **Domain:** `smm.kuygas.my.id` (subdomain, need A record to VPS IP)
- **App:** systemd service `smm-panel`, port 3000
- **Nginx:** CloudPanel reverse proxy to 127.0.0.1:3000
- **Cron:** systemd timers per cron script
- **Build:** `npm run build` → `output: "standalone"` → `node .next/standalone/server.js`
- **Deploy:** `git pull → npm ci → npx prisma migrate deploy → npm run build → systemctl restart smm-panel`

## YAGNI (Skipped for v1)
- OVO/GoPay manual login scrape
- Bank mutation auto-match (Midtrans covers this)
- Affiliate/referral system
- Multi-language support (UI stays Bahasa Indonesia)