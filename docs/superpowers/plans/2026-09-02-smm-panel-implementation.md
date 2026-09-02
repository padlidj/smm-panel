# SMM Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack SMM panel from scratch: user panel, admin panel, order system, deposit (Midtrans), provider integration, ticket support, and cron jobs.

**Architecture:** Next.js 14 App Router (TypeScript) + Prisma (PostgreSQL) + Tailwind CSS. Single deployable app. API routes for client-server communication. Standalone Node scripts for cron. systemd for supervision.

**Tech Stack:** Next.js 14, TypeScript, Prisma, PostgreSQL 16, Tailwind CSS, lucide-react, NextAuth.js, Midtrans Snap/VT-Web, lodash.get, bcryptjs, tsx

**Spec:** `docs/superpowers/specs/2026-09-02-smm-panel-design.md`

## Global Constraints

- All user-facing UI in Bahasa Indonesia
- Dark theme default (Tailwind dark mode)
- All balance operations use `prisma.$transaction` with `FOR UPDATE` row lock
- Provider response extraction via `lodash.get()` — never `eval()`
- Midtrans webhook verifies signature key before processing
- Table pagination: server-side (Prisma skip/take), not client-side
- Node >= 20, TypeScript strict mode
- `protected $guarded = []` pattern from Laravel reference is NOT used — explicit field validation instead
- File structure: `app/` for pages/routes, `components/` for React components, `lib/` for utilities, `cron/` for standalone scripts

---

### Task 1: Project Scaffolding + Prisma Schema

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `lib/prisma.ts`
- Create: `.env`
- Create: `.gitignore`

**Interfaces:**
- Consumes: Postgres DB `smm_panel` (pre-created, user `padsu`)
- Produces: `lib/prisma.ts` → re-exported `prisma` client singleton
- Produces: `prisma/schema.prisma` → all models from spec
- Produces: `prisma/seed.ts` → seed admin user, sample categories, config

- [ ] **Step 1: Init Next.js project**

```bash
cd /home/padsu/scripts/smm-panel
npm init -y
npm install next@14 react react-dom
npm install typescript @types/react @types/node --save-dev
npm install prisma @prisma/client
npm install tailwindcss postcss autoprefixer lucide-react
npm install next-auth@4 bcryptjs @types/bcryptjs
npm install lodash.get @types/lodash
npm install tsx --save-dev
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
};
export default nextConfig;
```

- [ ] **Step 4: Write `prisma/schema.prisma` with all models**

Full schema with all models from spec: User, ServiceCategory, Service, ServiceProvider, Order, OrderRefill, Deposit, DepositMethod, Ticket, TicketReply, BalanceLog, CustomPrice, ServiceFavorite, ServiceLog, Admin, LoginLog, WebsiteConfig, WebsiteInformation, WebsitePage.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  USER
  ADMIN
}

enum UserStatus {
  ACTIVE
  BANNED
  UNVERIFIED
}

enum OrderStatus {
  PENDING
  PROCESSING
  SUCCESS
  ERROR
  PARTIAL
}

enum RefillStatus {
  PENDING
  PROCESSING
  SUCCESS
  ERROR
}

enum DepositStatus {
  PENDING
  SUCCESS
  FAILED
  EXPIRED
}

enum DepositMethodType {
  MANUAL
  AUTO
}

enum TicketStatus {
  OPEN
  REPLIED
  CLOSED
}

enum BalanceType {
  PLUS
  MINUS
}

enum LoginLogType {
  USER
  ADMIN
}

enum LoginLogStatus {
  SUCCESS
  FAILED
}

enum AdminLevel {
  ADMIN
  SUPERADMIN
}

enum ServiceType {
  DEFAULT
  COMMENT_LIKES
  CUSTOM_COMMENTS
  SUBSCRIPTIONS
}

enum Currency {
  IDR
  USD
}

model User {
  id              Int       @id @default(autoincrement())
  username        String    @unique
  email           String    @unique
  password        String
  full_name       String?
  balance         Decimal   @default(0) @db.Decimal(15, 0)
  role            UserRole  @default(USER)
  status          UserStatus @default(UNVERIFIED)
  api_key         String?
  api_whitelist_ips String?
  notification    Json      @default("{\"order\":\"1\"}")
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  orders          Order[]
  order_refills   OrderRefill[]
  deposits        Deposit[]
  tickets         Ticket[]
  ticket_replies  TicketReply[]
  balance_logs    BalanceLog[]
  custom_prices   CustomPrice[]
  service_favorites ServiceFavorite[]
  service_logs    ServiceLog[]
  login_logs      LoginLog[] @relation("UserLoginLogs")

  @@map("users")
}

model Admin {
  id         Int        @id @default(autoincrement())
  username   String     @unique
  email      String     @unique
  password   String
  level      AdminLevel @default(ADMIN)
  status     Boolean    @default(true)
  created_at DateTime   @default(now())
  updated_at DateTime   @updatedAt

  @@map("admins")
}

model ServiceCategory {
  id         Int      @id @default(autoincrement())
  name       String
  status     Boolean  @default(true)
  created_at DateTime @default(now())

  services   Service[]

  @@map("service_categories")
}

model ServiceProvider {
  id                   Int      @id @default(autoincrement())
  name                 String   @unique
  provider_id          String
  provider_key         String
  provider_secret      String?
  status               Boolean  @default(true)
  is_refill_support    Boolean  @default(false)
  profile_config       Json?
  order_config         Json?
  status_config        Json?
  service_config       Json?
  refill_config        Json?
  refill_status_config Json?
  currency             Currency @default(IDR)
  created_at           DateTime @default(now())
  updated_at           DateTime @updatedAt

  services             Service[]
  orders               Order[]
  service_logs         ServiceLog[]

  @@map("service_providers")
}

model Service {
  id                      Int         @id @default(autoincrement())
  category_id             Int
  provider_id             Int
  name                    String
  type                    ServiceType @default(DEFAULT)
  price                   Int
  profit                  Int
  min                     Int
  max                     Int
  description             String?
  status                  Boolean     @default(true)
  provider_service_id     String?
  refill_provider_service_id String?
  created_at              DateTime    @default(now())
  updated_at              DateTime    @updatedAt

  category                ServiceCategory @relation(fields: [category_id], references: [id])
  provider                ServiceProvider @relation(fields: [provider_id], references: [id])
  orders                  Order[]
  order_refills           OrderRefill[]
  custom_prices           CustomPrice[]
  service_favorites       ServiceFavorite[]
  service_logs            ServiceLog[]

  @@map("services")
}

model Order {
  id                  Int         @id @default(autoincrement())
  user_id             Int
  service_id          Int
  provider_id         Int
  service_name        String
  target              String
  quantity            Int
  price               Decimal     @db.Decimal(15, 0)
  profit              Decimal     @db.Decimal(15, 0)
  remains             Int         @default(0)
  start_count         Int         @default(0)
  status              OrderStatus @default(PENDING)
  is_refund           Boolean     @default(false)
  is_api              Boolean     @default(false)
  provider_order_id   String?
  provider_order_log  String?
  provider_status_log String?
  custom_comments     String?
  username            String?
  ip_address          String?
  location            String?
  created_at          DateTime    @default(now())
  updated_at          DateTime    @updatedAt

  user                User        @relation(fields: [user_id], references: [id])
  service             Service     @relation(fields: [service_id], references: [id])
  service_provider    ServiceProvider @relation(fields: [provider_id], references: [id])
  order_refills       OrderRefill[]

  @@map("orders")
}

model OrderRefill {
  id                  Int          @id @default(autoincrement())
  order_id            Int
  user_id             Int
  target              String
  quantity            Int
  price               Decimal      @db.Decimal(15, 0)
  profit              Decimal      @db.Decimal(15, 0)
  status              RefillStatus @default(PENDING)
  provider_refill_id  String?
  created_at          DateTime     @default(now())
  updated_at          DateTime     @updatedAt

  order               Order        @relation(fields: [order_id], references: [id])
  user                User         @relation(fields: [user_id], references: [id])

  @@map("order_refills")
}

model Deposit {
  id                Int           @id @default(autoincrement())
  user_id           Int
  amount            Decimal       @db.Decimal(15, 0)
  fee               Decimal       @default(0) @db.Decimal(15, 0)
  net               Decimal       @db.Decimal(15, 0)
  method            String
  status            DepositStatus @default(PENDING)
  midtrans_order_id String?
  snap_token        String?
  snap_redirect_url String?
  ip_address        String?
  created_at        DateTime      @default(now())
  updated_at        DateTime      @updatedAt

  user              User          @relation(fields: [user_id], references: [id])

  @@map("deposits")
}

model DepositMethod {
  id           Int              @id @default(autoincrement())
  payment      String
  method       String
  type         DepositMethodType
  min          Decimal          @db.Decimal(15, 0)
  max          Decimal          @db.Decimal(15, 0)
  fee_percent  Decimal          @default(0) @db.Decimal(5, 2)
  status       Boolean          @default(true)
  created_at   DateTime         @default(now())

  @@map("deposit_methods")
}

model Ticket {
  id         Int          @id @default(autoincrement())
  user_id    Int
  subject    String
  message    String
  status     TicketStatus @default(OPEN)
  created_at DateTime     @default(now())
  updated_at DateTime     @updatedAt

  user       User         @relation(fields: [user_id], references: [id])
  replies    TicketReply[]

  @@map("tickets")
}

model TicketReply {
  id         Int      @id @default(autoincrement())
  ticket_id  Int
  user_id    Int?
  is_admin   Boolean  @default(false)
  message    String
  created_at DateTime @default(now())

  ticket     Ticket   @relation(fields: [ticket_id], references: [id])
  user       User?    @relation(fields: [user_id], references: [id])

  @@map("ticket_replies")
}

model BalanceLog {
  id             Int         @id @default(autoincrement())
  user_id        Int
  type           BalanceType
  action         String
  amount         Decimal     @db.Decimal(15, 0)
  balance_before Decimal     @db.Decimal(15, 0)
  balance_after  Decimal     @db.Decimal(15, 0)
  description    String?
  created_at     DateTime    @default(now())

  user           User        @relation(fields: [user_id], references: [id])

  @@map("balance_logs")
}

model CustomPrice {
  id         Int      @id @default(autoincrement())
  user_id    Int
  service_id Int
  price      Decimal  @db.Decimal(15, 0)
  profit     Decimal  @db.Decimal(15, 0)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  user       User     @relation(fields: [user_id], references: [id])
  service    Service  @relation(fields: [service_id], references: [id])

  @@unique([user_id, service_id])
  @@map("custom_prices")
}

model ServiceFavorite {
  id         Int      @id @default(autoincrement())
  user_id    Int
  service_id Int
  created_at DateTime @default(now())

  user       User     @relation(fields: [user_id], references: [id])
  service    Service  @relation(fields: [service_id], references: [id])

  @@unique([user_id, service_id])
  @@map("service_favorites")
}

model ServiceLog {
  id          Int      @id @default(autoincrement())
  user_id     Int?
  service_id  Int
  provider_id Int
  logs        String
  created_at  DateTime @default(now())

  service     Service  @relation(fields: [service_id], references: [id])
  provider    ServiceProvider @relation(fields: [provider_id], references: [id])
  user        User?    @relation(fields: [user_id], references: [id])

  @@map("service_logs")
}

model LoginLog {
  id         Int            @id @default(autoincrement())
  user_id    Int?
  username   String
  type       LoginLogType
  ip_address String
  user_agent String?
  location   String?
  status     LoginLogStatus
  created_at DateTime       @default(now())

  user       User?          @relation("UserLoginLogs", fields: [user_id], references: [id])

  @@map("login_logs")
}

model WebsiteConfig {
  id         Int      @id @default(autoincrement())
  key        String   @unique
  value      Json
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@map("website_configs")
}

model WebsiteInformation {
  id         Int      @id @default(autoincrement())
  title      String
  content    String
  status     Boolean  @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@map("website_informations")
}

model WebsitePage {
  id         Int      @id @default(autoincrement())
  title      String
  slug       String   @unique
  content    String
  status     Boolean  @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@map("website_pages")
}
```

- [ ] **Step 5: Write `lib/prisma.ts`**

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 6: Write `prisma/seed.ts`**

```ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash('admin123', 10);
  
  // Seed admin
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', email: 'admin@smm.local', password: adminPass, level: 'SUPERADMIN' },
  });

  // Seed default configs
  const defaults = [
    { key: 'main', value: { website_name: 'SMM Panel', website_url: 'https://smm.kuygas.my.id', is_register_enabled: true, is_reset_password_enabled: false, is_maintenance: false, logo: '' } },
    { key: 'notification', value: { email: '', order: '1', deposit: '1', ticket: '1' } },
  ];
  for (const config of defaults) {
    await prisma.websiteConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: { key: config.key, value: config.value },
    });
  }

  // Seed deposit methods
  const methods = [
    { payment: 'Bank Transfer', method: 'BCA', type: 'AUTO' as const, min: 10000, max: 10000000, fee_percent: 0 },
    { payment: 'Bank Transfer', method: 'Mandiri', type: 'AUTO' as const, min: 10000, max: 10000000, fee_percent: 0 },
    { payment: 'E-Wallet', method: 'GoPay', type: 'AUTO' as const, min: 5000, max: 5000000, fee_percent: 0 },
    { payment: 'E-Wallet', method: 'OVO', type: 'AUTO' as const, min: 5000, max: 5000000, fee_percent: 0 },
  ];
  for (const method of methods) {
    await prisma.depositMethod.upsert({
      where: { id: 0 }, // force create
      update: {},
      create: method,
    });
  }

  console.log('Seed completed');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

- [ ] **Step 7: Write `.env`**

```
DATABASE_URL="postgresql://padsu:padsu_smm_local_dev@localhost:5432/smm_panel"
NEXTAUTH_SECRET="smm-panel-local-dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
MIDTRANS_SERVER_KEY=""
MIDTRANS_CLIENT_KEY=""
MIDTRANS_IS_PRODUCTION=false
```

- [ ] **Step 8: Run Prisma migration + seed**

```bash
cd /home/padsu/scripts/smm-panel
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

- [ ] **Step 9: Verify migration**

```bash
cd /home/padsu/scripts/smm-panel
npx prisma studio & # verify tables exist
```

- [ ] **Step 10: Commit**

```bash
cd /home/padsu/scripts/smm-panel
git add .
git commit -m "feat: project scaffolding + prisma schema"
```

---

### Task 2: Auth System (NextAuth + Middleware + Login/Register)

**Files:**
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `lib/auth.ts`
- Create: `middleware.ts`
- Create: `app/(public)/auth/login/page.tsx`
- Create: `app/(public)/auth/register/page.tsx`
- Create: `app/(public)/auth/layout.tsx`
- Create: `app/(public)/layout.tsx`
- Create: `app/page.tsx` (landing page placeholder)
- Create: `app/globals.css`
- Create: `app/layout.tsx` (root layout)
- Create: `components/layout/theme-provider.tsx`
- Create: `components/ui/button.tsx`
- Create: `components/ui/input.tsx`
- Create: `components/ui/card.tsx`
- Create: `components/ui/select.tsx`
- Create: `components/ui/table.tsx`
- Create: `components/ui/modal.tsx`
- Create: `components/ui/badge.tsx`
- Create: `components/ui/toast.tsx`
- Create: `components/ui/loading.tsx`
- Create: `components/ui/pagination.tsx`

**Interfaces:**
- Produces: `lib/auth.ts` → `authOptions` (NextAuth config), `getServerSession()`
- Produces: `middleware.ts` → protects `/dashboard/*`, `/admin/*`
- Produces: `app/api/auth/[...nextauth]/route.ts` → NextAuth handler

- [ ] **Step 1: Create `lib/auth.ts`**

```ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        type: { label: 'Type', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const isAdmin = credentials.type === 'admin';
        
        if (isAdmin) {
          const admin = await prisma.admin.findUnique({ where: { username: credentials.username } });
          if (!admin || !admin.status) return null;
          const valid = await bcrypt.compare(credentials.password, admin.password);
          if (!valid) return null;
          return { id: String(admin.id), name: admin.username, email: admin.email, role: 'admin', level: admin.level };
        }

        const user = await prisma.user.findUnique({ where: { username: credentials.username } });
        if (!user || user.status === 'BANNED') return null;
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;
        return { id: String(user.id), name: user.username, email: user.email, role: 'user', balance: Number(user.balance) };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.level = (user as any).level;
        token.balance = (user as any).balance;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).level = token.level;
        (session.user as any).balance = token.balance;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
};
```

- [ ] **Step 2: Create `app/api/auth/[...nextauth]/route.ts`**

```ts
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 3: Create `middleware.ts`**

```ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (path.startsWith('/admin') && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (path.startsWith('/dashboard') || path.startsWith('/admin')) {
          return !!token;
        }
        return true;
      },
    },
  },
);

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
```

- [ ] **Step 4: Create `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 5: Create `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 6: Create basic UI components** (`button.tsx`, `input.tsx`, `card.tsx`, `select.tsx`, `table.tsx`, `modal.tsx`, `badge.tsx`, `toast.tsx`, `loading.tsx`, `pagination.tsx`)

Each is a minimal Tailwind component. Example `button.tsx`:

```tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
    const variants = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
    };
    const sizes = { sm: 'h-9 px-3 text-sm', md: 'h-10 px-4 py-2', lg: 'h-11 px-8 text-base' };
    return <button ref={ref} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
  }
);
Button.displayName = 'Button';
export { Button };
```

- [ ] **Step 7: Create `app/layout.tsx`** (root layout, dark mode provider)

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/layout/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SMM Panel',
  description: 'Social Media Marketing Panel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Create `app/(public)/auth/login/page.tsx`** — login form with username/password/type selector, POST to NextAuth

- [ ] **Step 9: Create `app/(public)/auth/register/page.tsx`** — register form, POST to `/api/auth/register`

- [ ] **Step 10: Create `app/api/auth/register/route.ts`** — hash password, create user, return success

- [ ] **Step 11: Create landing page `app/page.tsx`** — hero + service categories + how it works + footer

- [ ] **Step 12: Build + verify**

```bash
cd /home/padsu/scripts/smm-panel
npm run dev
# Test: visit /auth/login, login as admin/admin123, test redirect
```

- [ ] **Step 13: Commit**

```bash
git add .
git commit -m "feat: auth system + UI components + landing page"
```

---

### Task 3: Admin Layout + Dashboard + User/Service/Provider CRUD

**Files:**
- Create: `app/(admin)/layout.tsx`
- Create: `app/(admin)/page.tsx`
- Create: `components/layout/admin-sidebar.tsx`
- Create: `components/layout/admin-topbar.tsx`
- Create: `app/(admin)/user/list/page.tsx`
- Create: `app/(admin)/user/form/[id]/page.tsx`
- Create: `app/(admin)/service/list/page.tsx`
- Create: `app/(admin)/service/form/[id]/page.tsx`
- Create: `app/(admin)/service/category/list/page.tsx`
- Create: `app/(admin)/service/category/form/[id]/page.tsx`
- Create: `app/(admin)/service/provider/list/page.tsx`
- Create: `app/(admin)/service/provider/form/[id]/page.tsx`
- Create: `app/(admin)/service/provider/check-balance/[id]/route.ts`
- Create: `app/(admin)/order/list/page.tsx`
- Create: `app/(admin)/order/detail/[id]/page.tsx`
- Create: `app/(admin)/deposit/list/page.tsx`
- Create: `app/(admin)/deposit/method/list/page.tsx`
- Create: `app/(admin)/admin/list/page.tsx`
- Create: `app/(admin)/admin/form/[id]/page.tsx`
- Create: `app/(admin)/settings/website/page.tsx`
- Create: `app/(admin)/settings/bank/list/page.tsx`
- Create: `app/(admin)/log/user/login/page.tsx`
- Create: `app/(admin)/log/user/balance/page.tsx`
- Create: `app/(admin)/log/user/register/page.tsx`
- Create: `app/(admin)/log/admin/login/page.tsx`
- Create: `app/(admin)/ticket/list/page.tsx`
- Create: `app/(admin)/ticket/[id]/page.tsx`
- Create: `app/(admin)/page/notification/page.tsx`
- Create: `app/(admin)/page/hof/page.tsx`

**Interfaces:**
- Consumes: `authOptions` from Task 2
- Consumes: `prisma` from Task 1
- Consumes: UI components from Task 2

This is a large task. Each admin page follows the same pattern: server component fetch data, client component for interactions. Since this is a lot of files, batch by section.

- [ ] **Step 1: Create admin layout** (`app/(admin)/layout.tsx` + `admin-sidebar.tsx` + `admin-topbar.tsx`)

Admin sidebar has menu items: Dashboard, User, Order, Service (categories/providers/services), Deposit, Ticket, Admin, Settings, Logs, Pages.

- [ ] **Step 2: Create admin dashboard** (`app/(admin)/page.tsx`) — stat cards (total users, orders, deposits, balance), recent orders table

- [ ] **Step 3: Create user list page** — server-side pagination table with search, filter by status

- [ ] **Step 4: Create user form page** — edit user (balance, status, role)

- [ ] **Step 5: Create service category list + form** — simple CRUD

- [ ] **Step 6: Create service provider list + form** — the big one: provider config with JSON profile/order/status/service config

- [ ] **Step 7: Create service list + form** — select category, select provider, set price/profit, min/max, type

- [ ] **Step 8: Create order list page** — filter by status, date range, user

- [ ] **Step 9: Create deposit list + method list** — deposit management, method CRUD

- [ ] **Step 10: Create admin list + form** — multi-level admin management

- [ ] **Step 11: Create settings page** — website config (name, logo, maintenance, register toggle)

- [ ] **Step 12: Create log pages** — login/balance/register logs with pagination

- [ ] **Step 13: Create ticket list + reply** — admin ticket management

- [ ] **Step 14: Build + verify**

- [ ] **Step 15: Commit**

```bash
git add .
git commit -m "feat: admin panel layout + CRUD pages"
```

---

### Task 4: User Layout + Dashboard + Order + Deposit

**Files:**
- Create: `app/(dashboard)/layout.tsx`
- Create: `app/(dashboard)/page.tsx`
- Create: `components/layout/user-sidebar.tsx`
- Create: `components/layout/user-topbar.tsx`
- Create: `app/(dashboard)/order/new/page.tsx`
- Create: `app/(dashboard)/order/history/page.tsx`
- Create: `app/(dashboard)/order/detail/[id]/page.tsx`
- Create: `app/(dashboard)/order/refill/new/[orderId]/page.tsx`
- Create: `app/(dashboard)/order/refill/history/page.tsx`
- Create: `app/(dashboard)/deposit/new/page.tsx`
- Create: `app/(dashboard)/deposit/history/page.tsx`
- Create: `app/(dashboard)/ticket/list/page.tsx`
- Create: `app/(dashboard)/ticket/new/page.tsx`
- Create: `app/(dashboard)/ticket/[id]/page.tsx`
- Create: `app/(dashboard)/account/profile/page.tsx`
- Create: `app/(dashboard)/account/settings/page.tsx`
- Create: `app/(dashboard)/account/log/login/page.tsx`
- Create: `app/(dashboard)/account/log/balance/page.tsx`
- Create: `app/(dashboard)/service/[categoryId]/page.tsx`
- Create: `lib/balance.ts`
- Create: `lib/midtrans.ts`
- Create: `app/api/order/route.ts`
- Create: `app/api/order/status/route.ts`
- Create: `app/api/order/refill/route.ts`
- Create: `app/api/deposit/route.ts`
- Create: `app/api/deposit/methods/route.ts`
- Create: `app/api/midtrans/webhook/route.ts`
- Create: `app/api/balance/route.ts`
- Create: `app/api/ticket/route.ts`
- Create: `app/api/ticket/[id]/reply/route.ts`
- Create: `app/api/service/route.ts`
- Create: `app/api/auth/register/route.ts`

**Interfaces:**
- Consumes: `prisma` + `authOptions` from Tasks 1-2
- Produces: `lib/balance.ts` → `debitBalance(userId, amount, action, description)` and `creditBalance(userId, amount, action, description)` — both use `$transaction` with `FOR UPDATE`
- Produces: `lib/midtrans.ts` → `createSnapTransaction(orderId, amount, customer)` and `verifySignature(orderId, statusCode, grossAmount, signatureKey)`
- Produces: API routes for order, deposit, balance, ticket, service

- [ ] **Step 1: Create `lib/balance.ts`**

```ts
import { prisma } from './prisma';
import { BalanceType } from '@prisma/client';

export async function debitBalance(userId: number, amount: number, action: string, description?: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || Number(user.balance) < amount) throw new Error('Saldo tidak mencukupi');
    
    const balanceBefore = Number(user.balance);
    const balanceAfter = balanceBefore - amount;
    
    await tx.user.update({ where: { id: userId }, data: { balance: balanceAfter } });
    await tx.balanceLog.create({
      data: {
        user_id: userId, type: 'MINUS', action, amount,
        balance_before: balanceBefore, balance_after: balanceAfter, description,
      },
    });
    
    return { balanceBefore, balanceAfter };
  });
}

export async function creditBalance(userId: number, amount: number, action: string, description?: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User tidak ditemukan');
    
    const balanceBefore = Number(user.balance);
    const balanceAfter = balanceBefore + amount;
    
    await tx.user.update({ where: { id: userId }, data: { balance: balanceAfter } });
    await tx.balanceLog.create({
      data: {
        user_id: userId, type: 'PLUS', action, amount,
        balance_before: balanceBefore, balance_after: balanceAfter, description,
      },
    });
    
    return { balanceBefore, balanceAfter };
  });
}
```

- [ ] **Step 2: Create `lib/midtrans.ts`**

```ts
const MIDTRANS_API = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  ? 'https://app.midtrans.com/snap/v1'
  : 'https://app.sandbox.midtrans.com/snap/v1';

export async function createSnapTransaction(orderId: string, amount: number, customer: { name: string; email: string }) {
  const auth = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString('base64');
  
  const res = await fetch(`${MIDTRANS_API}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` },
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: amount },
      customer_details: { first_name: customer.name, email: customer.email },
      credit_card: { secure: true },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_messages?.[0] || 'Midtrans error');
  
  return { token: data.token, redirect_url: data.redirect_url };
}

export function verifySignature(orderId: string, statusCode: string, grossAmount: string, signatureKey: string) {
  const hash = require('crypto')
    .createHash('sha512')
    .update(orderId + statusCode + grossAmount + process.env.MIDTRANS_SERVER_KEY)
    .digest('hex');
  return hash === signatureKey;
}
```

- [ ] **Step 3: Create `app/api/order/route.ts`** — POST handler for single order

```ts
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { debitBalance } from '@/lib/balance';
import { executeProviderOrder } from '@/lib/provider';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = Number((session.user as any).id);
  const body = await req.json();
  const { service_id, target, quantity, custom_comments, username } = body;

  // Validate service
  const service = await prisma.service.findFirst({ where: { id: Number(service_id), status: true }, include: { provider: true } });
  if (!service) return NextResponse.json({ status: false, message: 'Layanan tidak tersedia.' });

  if (quantity < service.min || quantity > service.max) {
    return NextResponse.json({ status: false, message: `Jumlah minimal ${service.min}, maksimal ${service.max}.` });
  }

  // Check custom price
  const customPrice = await prisma.customPrice.findUnique({ where: { user_id_service_id: { user_id: userId, service_id: service.id } } });

  const pricePerUnit = customPrice ? Number(customPrice.price) : service.price;
  const profitPerUnit = customPrice ? Number(customPrice.profit) : service.profit;
  const totalPrice = Math.ceil((pricePerUnit / 1000) * quantity);
  const totalProfit = Math.ceil((profitPerUnit / 1000) * quantity);

  // Debit balance
  try {
    await debitBalance(userId, totalPrice, 'Order', `Pesanan #${service.name}`);
  } catch (e) {
    return NextResponse.json({ status: false, message: 'Saldo tidak mencukupi.' });
  }

  // Create order
  const order = await prisma.order.create({
    data: {
      user_id: userId, service_id: service.id, provider_id: service.provider_id,
      service_name: service.name, target: String(target), quantity, price: totalPrice, profit: totalProfit,
      status: 'PENDING', ip_address: req.headers.get('x-forwarded-for') || '',
      custom_comments, username,
    },
  });

  // Execute provider order (non-blocking, update in background)
  if (service.provider.name !== 'MANUAL') {
    executeProviderOrder(service.provider, order, { service, target, quantity, custom_comments, username })
      .then((result) => { /* update order with result */ })
      .catch(() => { /* mark as error */ });
  }

  return NextResponse.json({ status: true, order_id: order.id, message: 'Pesanan berhasil dibuat.' });
}
```

- [ ] **Step 4: Create `app/api/deposit/route.ts`** — POST handler, generates Midtrans snap token

- [ ] **Step 5: Create `app/api/midtrans/webhook/route.ts`** — POST handler, verify signature, update deposit, credit balance

- [ ] **Step 6: Create user dashboard page** — saldo, stat order, recent orders

- [ ] **Step 7: Create order new page** — single form (select category → select service → target + quantity → submit)

- [ ] **Step 8: Create order history page** — paginated table

- [ ] **Step 9: Create deposit new page** — select method, input amount, redirect to Midtrans

- [ ] **Step 10: Create deposit history page**

- [ ] **Step 11: Create ticket pages** — list, new, detail+reply

- [ ] **Step 12: Create account pages** — profile, settings, login log, balance log

- [ ] **Step 13: Build + verify**

- [ ] **Step 14: Commit**

```bash
git add .
git commit -m "feat: user panel + order + deposit + balance system"
```

---

### Task 5: Provider Executor + Cron Jobs + Reseller API

**Files:**
- Create: `lib/provider.ts`
- Create: `cron/order-status.ts`
- Create: `cron/refund.ts`
- Create: `cron/service-sync.ts`
- Create: `cron/deposit-expire.ts`
- Create: `cron/delete-user.ts`
- Create: `app/api/reseller/profile/route.ts`
- Create: `app/api/reseller/services/route.ts`
- Create: `app/api/reseller/order/route.ts`
- Create: `app/api/reseller/status/route.ts`
- Create: `app/api/reseller/refill/route.ts`

**Interfaces:**
- Consumes: `prisma` from Task 1, `balance.ts` from Task 4
- Produces: `lib/provider.ts` → `executeProviderOrder(provider, order, params)`, `checkProviderStatus(provider, order)`, `syncProviderServices(provider)`
- Produces: Standalone cron scripts (no Next.js dependency needed, use `tsx`)

- [ ] **Step 1: Create `lib/provider.ts`**

```ts
import { Prisma, ServiceProvider, Order, Service } from '@prisma/client';
import { prisma } from './prisma';
import get from 'lodash.get';

interface ProviderParams {
  service?: any;
  target?: string;
  quantity?: number;
  custom_comments?: string | null;
  username?: string | null;
}

function buildRequest(config: any, params: ProviderParams): Record<string, string> {
  const request: Record<string, string> = {};
  for (const [key, value] of Object.entries(config.request)) {
    if (key === 'action') {
      request.action = String(value);
    } else {
      // Replace placeholders
      let val = String(value);
      val = val.replace('{service}', params.service?.provider_service_id || '');
      val = val.replace('{target}', params.target || '');
      val = val.replace('{quantity}', String(params.quantity || 0));
      val = val.replace('{custom_comments}', params.custom_comments || '');
      val = val.replace('{username}', params.username || '');
      val = val.replace('{provider_id}', params.service?.provider?.provider_id || '');
      val = val.replace('{provider_key}', params.service?.provider?.provider_key || '');
      val = val.replace('{provider_secret}', params.service?.provider?.provider_secret || '');
      request[key] = val;
    }
  }
  return request;
}

function extractResponse(response: any, path: string): any {
  return get(response, path);
}

export async function executeProviderOrder(provider: any, order: any, params: ProviderParams) {
  const config = typeof provider.order_config === 'string' ? JSON.parse(provider.order_config) : provider.order_config;
  if (!config?.endpoint) return null;

  const payload = buildRequest(config, params);
  
  try {
    const res = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(payload),
    });
    const data = await res.json();
    
    if (res.ok) {
      const orderIdPath = config.response?.order_id;
      const providerOrderId = orderIdPath ? extractResponse(data, orderIdPath) : null;
      
      if (providerOrderId) {
        await prisma.order.update({
          where: { id: order.id },
          data: { provider_order_id: String(providerOrderId), status: 'PROCESSING', provider_order_log: JSON.stringify(data) },
        });
        return { success: true, providerOrderId };
      }
    }
    
    // Log error
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'ERROR', provider_order_log: JSON.stringify(data) },
    });
    await prisma.serviceLog.create({
      data: { user_id: order.user_id, service_id: order.service_id, provider_id: provider.id, logs: JSON.stringify(data) },
    });
    
    return { success: false, error: data };
  } catch (err) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'ERROR', provider_order_log: String(err) },
    });
    return { success: false, error: err };
  }
}

export async function checkProviderStatus(provider: any, order: any) {
  const config = typeof provider.status_config === 'string' ? JSON.parse(provider.status_config) : provider.status_config;
  if (!config?.endpoint || !order.provider_order_id) return null;

  const payload: Record<string, string> = { action: config.request.action || 'status' };
  for (const [key, value] of Object.entries(config.request)) {
    if (key === 'action') continue;
    let val = String(value);
    val = val.replace('{order_id}', order.provider_order_id);
    val = val.replace('{provider_id}', provider.provider_id);
    val = val.replace('{provider_key}', provider.provider_key);
    val = val.replace('{provider_secret}', provider.provider_secret || '');
    payload[key] = val;
  }

  try {
    const res = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(payload),
    });
    const data = await res.json();
    if (!res.ok) return null;

    const statusValue = config.response?.status ? extractResponse(data, config.response.status) : null;
    const startCount = config.response?.start_count ? Number(extractResponse(data, config.response.start_count)) : null;
    const remains = config.response?.remains ? Number(extractResponse(data, config.response.remains)) : null;

    // Map status
    const statusMap = config.status_value || {};
    const mappedStatus = statusValue ? Object.entries(statusMap).find(([_, v]) => String(v).toLowerCase() === String(statusValue).toLowerCase())?.[0] : null;

    return {
      status: mappedStatus ? String(mappedStatus).toUpperCase() : null,
      start_count: startCount,
      remains: remains,
      raw: data,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Create `cron/order-status.ts`**

```ts
import { prisma } from '../lib/prisma';
import { checkProviderStatus } from '../lib/provider';

async function main() {
  const orders = await prisma.order.findMany({
    where: { status: { in: ['PENDING', 'PROCESSING'] } },
    include: { service_provider: true },
    take: 150,
    orderBy: { id: 'desc' },
  });

  if (orders.length === 0) {
    console.log('Tidak ada pesanan yang harus diperbarui.');
    return;
  }

  for (const order of orders) {
    if (!order.service_provider || order.service_provider.name === 'MANUAL') continue;

    const result = await checkProviderStatus(order.service_provider, order);
    if (!result) continue;

    const updateData: any = {
      provider_status_log: JSON.stringify(result.raw),
      updated_at: new Date(),
    };

    if (result.status) updateData.status = result.status;
    if (result.start_count !== null) updateData.start_count = result.start_count;
    if (result.remains !== null) updateData.remains = result.remains;

    await prisma.order.update({ where: { id: order.id }, data: updateData });

    console.log(`Berhasil, ID: ${order.id} | Status: ${result.status || order.status}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
```

- [ ] **Step 3: Create `cron/refund.ts`**

```ts
import { prisma } from '../lib/prisma';
import { creditBalance } from '../lib/balance';

async function main() {
  const orders = await prisma.order.findMany({
    where: { status: { in: ['ERROR', 'PARTIAL'] }, is_refund: false },
    take: 50,
    orderBy: { id: 'desc' },
  });

  if (orders.length === 0) {
    console.log('Tidak ada pesanan yang gagal.');
    return;
  }

  for (const order of orders) {
    let amountRefund = Number(order.price);
    if (order.remains > 0 && order.remains <= order.quantity) {
      amountRefund = Math.ceil((Number(order.price) / order.quantity) * order.remains);
    }

    try {
      await creditBalance(order.user_id, amountRefund, 'Refund', `Pengembalian Dana Pesanan #${order.id}`);
      await prisma.order.update({ where: { id: order.id }, data: { is_refund: true, profit: order.remains > 0 ? Math.ceil((Number(order.profit) / order.quantity) * (order.quantity - order.remains)) : 0 } });
      console.log(`Berhasil, ID: ${order.id} | Jumlah: Rp ${amountRefund}`);
    } catch (e) {
      console.error(`Gagal refund ID: ${order.id} | ${e}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
```

- [ ] **Step 4: Create `cron/service-sync.ts`**

- [ ] **Step 5: Create `cron/deposit-expire.ts`** — cancel Pending deposits > 24h

- [ ] **Step 6: Create `cron/delete-user.ts`** — delete unactivated users > 7 days

- [ ] **Step 7: Create reseller API routes** — standard SMM API format

- [ ] **Step 8: Build + verify each cron script**

```bash
cd /home/padsu/scripts/smm-panel
npx tsx cron/order-status.ts
```

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat: provider executor + cron jobs + reseller API"
```

---

### Task 6: Deployment — systemd + Nginx + Timers

**Files:**
- Create: `deploy/smm-panel.service`
- Create: `deploy/cron-order-status.service`
- Create: `deploy/cron-order-status.timer`
- Create: `deploy/cron-refund.service`
- Create: `deploy/cron-refund.timer`
- Create: `deploy/cron-service-sync.service`
- Create: `deploy/cron-service-sync.timer`
- Create: `deploy/cron-deposit-expire.service`
- Create: `deploy/cron-deposit-expire.timer`
- Create: `deploy/nginx.conf`

**Interfaces:**
- Consumes: built app (`npm run build`)
- Consumes: cron scripts from Task 5

- [ ] **Step 1: Create `deploy/smm-panel.service`**

```ini
[Unit]
Description=SMM Panel - Next.js App
After=network.target postgresql.service

[Service]
Type=simple
User=padsu
WorkingDirectory=/home/padsu/scripts/smm-panel
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node /home/padsu/scripts/smm-panel/.next/standalone/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 2: Create each timer + service pair for cron** (order-status = 2m, refund = 5m, service-sync = 30m, deposit-expire = 10m, delete-user = weekly)

- [ ] **Step 3: Create `deploy/nginx.conf`**

```nginx
server {
    listen 80;
    server_name smm.kuygas.my.id;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name smm.kuygas.my.id;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

- [ ] **Step 4: Install systemd services**

```bash
sudo cp deploy/smm-panel.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable smm-panel
sudo systemctl start smm-panel
```

- [ ] **Step 5: Install cron timers**

```bash
for f in deploy/cron-*.service deploy/cron-*.timer; do
  sudo cp "$f" /etc/systemd/system/
done
sudo systemctl daemon-reload
for f in deploy/cron-*.timer; do
  timer=$(basename "$f" .timer)
  sudo systemctl enable "$timer"
  sudo systemctl start "$timer"
done
```

- [ ] **Step 6: Setup DNS** — point `smm.kuygas.my.id` A record to `43.129.57.93`

- [ ] **Step 7: Setup SSL via CloudPanel or certbot**

- [ ] **Step 8: Build app + verify**

```bash
cd /home/padsu/scripts/smm-panel
npm run build
sudo systemctl restart smm-panel
systemctl status smm-panel
journalctl -u smm-panel -n 20 --no-pager
```

- [ ] **Step 9: Verify cron timers active**

```bash
systemctl list-timers | grep cron
```

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: deployment files + systemd services + nginx config"
```