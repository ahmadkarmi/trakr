# trakr

# Trakr - Modern Audit Management

A comprehensive audit management platform built with React (web) and React Native (mobile) in a monorepo architecture.

## 🏗️ Architecture

This project uses a monorepo structure with npm workspaces:

```
Trakr/
├── apps/
│   ├── web/          # React web application (Vite)
│   └── mobile/       # React Native mobile app (Expo)
├── packages/
│   └── shared/       # Shared types, utilities, and services
└── docs/             # Documentation and feature requests
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm 9+
- For mobile development: Expo CLI

### Installation

```bash
# Install all dependencies
npm install

# Install dependencies for all workspaces
npm run install:all
```

### Development

```bash
# Start web development server
npm run dev:web

# Start mobile development server  
npm run dev:mobile

# Start both simultaneously (root workspace)
npm run dev
```

### Building

```bash
# Build web application
npm run build:web

# Build mobile application
npm run build:mobile
```

## 📱 Applications

### Web App (`apps/web`)
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Data Fetching:** TanStack Query
- **Routing:** React Router v6
- **UI Components:** Headless UI + custom components

### Mobile App (`apps/mobile`)
- **Framework:** React Native + Expo
- **Design System:** UI Kitten + Eva Design
- **Navigation:** Expo Router
- **State Management:** Zustand
- **Data Fetching:** TanStack Query
- **UI:** UI Kitten components with custom theme

### Shared Package (`packages/shared`)
- **Types:** TypeScript interfaces for all data models
- **Utils:** Common utility functions (date formatting, scoring, etc.)
- **Services:** Mock data and API functions
- **Build:** TypeScript compilation to CommonJS

## 👥 User Roles

- **🕵️‍♂️ Auditor:** Complete assigned audits with photo attachments
- **🏬 Branch Manager:** Review and approve/reject branch audits  
- **🛠️ Admin:** Manage survey templates, users, and system settings
- **🧭 Super Admin:** Full system control and analytics access

## 🔐 RLS & Roles (Supabase)

This project enables Row Level Security (RLS) on production and staging. A dev-mode toggle allows permissive behavior during local development and migration.

### Dev Mode Toggle

- Dev mode is controlled via `public.app_config` key `dev_mode`.
- When `dev_mode=true`, RLS policies include a permissive OR-condition so local dev and tests work without friction.
- To flip dev mode:

```sql
-- Disable dev-mode (production/staging)
update public.app_config set value='false' where key='dev_mode';

-- Re-enable dev-mode (local dev)
update public.app_config set value='true' where key='dev_mode';
```

The helper functions used by policies:

- `public.is_dev_mode()`
- `public.current_user_org_id()`
- `public.is_admin()`

These functions are `SECURITY DEFINER` with `search_path=public` to avoid recursion issues and ensure predictable behavior under RLS.

### Role Capabilities

- Admin
  - Read/write all org-scoped tables.
  - Create/update/delete surveys, branches, zones, assignments.
  - Edit audits regardless of status; approve/reject; manage audit photos.
- Branch Manager
  - Read org-scoped data.
  - Update managed branch details; approve/reject audits for their branch.
- Auditor
  - Read org-scoped data.
  - Update their assigned audits when status is not SUBMITTED/APPROVED.
  - Upload/remove their audit photos.

### RLS Overview by Table

- `organizations`
  - SELECT: same org (via `current_user_org_id()`), or dev-mode.
  - INSERT/UPDATE/DELETE: admin-only (or dev-mode).

- `users`
  - SELECT: self or admin (or dev-mode).
  - UPDATE: self or admin (or dev-mode).
  - INSERT/DELETE: admin-only (or dev-mode).

- `branches`
  - SELECT: same org (or dev-mode).
  - UPDATE: admin or branch manager for that branch (or dev-mode).
  - INSERT/DELETE: admin-only (or dev-mode).

- `zones`, `zone_branches`, `zone_assignments`
  - SELECT: same org (or dev-mode).
  - All writes: admin-only (or dev-mode).

- `surveys`, `survey_sections`, `survey_questions`
  - SELECT: same org (or dev-mode).
  - All writes: admin-only (or dev-mode).

- `audits`
  - SELECT: same org (or dev-mode).
  - UPDATE: assignee when status NOT IN (SUBMITTED, APPROVED), or admin (or dev-mode).
  - INSERT/DELETE: admin-only (or dev-mode).

- `audit_photos`
  - SELECT: audit belongs to same org (or dev-mode).
  - INSERT: assignee or admin (or dev-mode).
  - DELETE: assignee or admin (or dev-mode).

- `auditor_branch_assignments`
  - SELECT: same org (or dev-mode).
  - All writes: admin-only (or dev-mode).

- `activity_logs`
  - SELECT: logs created by users in same org (or dev-mode).
  - INSERT: dev-mode only (in prod, these are typically written by server-side flows).

### Testing with RLS

When `dev_mode=false`, tests require an authenticated session. The web test setup (`apps/web/src/setupTests.ts`) can auto sign-in if you provide credentials via env:

```
VITE_TEST_EMAIL=auditor@trakr.com
VITE_TEST_PASSWORD=<your-password>
```

These are read by vitest and used to call `supabase.auth.signInWithPassword` before tests run. You can set them in your shell before invoking tests, or use a `.env.local` not committed to source control.

## 🎯 Key Features

- **Multi-platform:** Consistent experience across web and mobile
- **Role-based Access:** Different dashboards and permissions per role
- **Audit Wizard:** Step-by-step guided audit completion
- **Photo Attachments:** Upload and manage audit photos
- **PDF Export:** Generate comprehensive audit reports
- **CSV Export:** Export audit data and analytics
- **Approval Workflow:** Branch manager review and approval process
- **Activity Logging:** Comprehensive audit trail
- **Responsive Design:** Mobile-first, modern UI

## 🛠️ Development

### Code Quality

```bash
# Lint all workspaces
npm run lint

# Type check all workspaces  
npm run type-check

# Clean all build artifacts
npm run clean
```

### Project Structure

```
apps/web/src/
├── components/     # Reusable UI components
├── screens/        # Page-level components
├── stores/         # Zustand state stores
└── styles/         # Global styles and themes

apps/mobile/
├── app/            # Expo Router pages
└── src/
    ├── components/ # React Native components
    ├── stores/     # Zustand state stores
    └── styles/     # React Native styles

packages/shared/src/
├── types/          # TypeScript interfaces
├── utils/          # Utility functions
└── services/       # API and mock data
```

## 📋 Feature Requests

Use the template in `docs/FEATURE_REQUEST.md` to propose new features.

## 📄 License

MIT License - see LICENSE file for details.
# CI/CD Pipeline Test
