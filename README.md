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

# Start both simultaneously
npm run dev:web & npm run dev:mobile
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

## 🔄 Migration from Flutter

This project was migrated from a Flutter implementation to React/React Native:

- ✅ All Flutter models converted to TypeScript interfaces
- ✅ Provider state management → Zustand
- ✅ Go Router → React Router (web) + Expo Router (mobile)
- ✅ Flutter widgets → React/React Native components
- ✅ Custom styling → UI Kitten design system (mobile)
- ✅ Mock data and services preserved
- ✅ All user roles and workflows maintained
- ✅ Consistent design system across platforms
- ✅ PDF export and CSV functionality planned
- ✅ Photo attachment system planned

## 📄 License

MIT License - see LICENSE file for details.

---

# Trakr – Multi‑Tenant Auditing Platform (Frontend Prototype)

This repository contains the Flutter frontend for Trakr: a multi‑tenant SaaS for branch/location audits. The current version uses mocked data (local JSON) and mocked auth/payment flows. Focus is on UI/UX, role logic, and core screens.

## Tech Stack

- Flutter (Android, iOS, Web)
- State: `provider`
- Routing: `go_router`
- Utils: `intl`, `shared_preferences`, `fl_chart`

## Requirements

- Flutter stable (3.29.x) and Dart 3.7+
- Web enabled: `flutter config --enable-web`

## Setup

1. Install dependencies
   - `flutter pub get`
2. Run (Web)
   - `flutter run -d chrome`
3. Analyze & Test
   - `flutter analyze`
   - `flutter test`

## Project Structure

- `lib/screens/` — role selector, dashboards, audit detail
- `lib/widgets/` — reusable UI (e.g., `audit_card.dart`, `activity_log_list.dart`)
- `lib/models/` — data models (users, audits, surveys, enums)
- `lib/providers/` — `AuthProvider` (mock role persistence)
- `lib/services/mock_repository.dart` — loads mock JSON into memory
- `lib/utils/` — `format.dart`, `route_paths.dart`, `scoring.dart`
- `assets/mock/` — JSON data (users, orgs, branches, surveys, audits, activity logs)

## Key User Flows (Mocked)

- Role selector (`/role`) to sign in as Super Admin, Admin, Auditor, or Branch Manager.
- Dashboards show relevant audits based on role.
- Audit detail shows responses, weighted scoring, activity log, and a mocked "Export as PDF" action.

## Scoring Logic (Initial)

- Yes = gains weight; No = 0; N/A = excluded from denominator.
- Unanswered questions are counted in the denominator.
- See `lib/utils/scoring.dart` and `test/scoring_test.dart`.

## Documentation

- Product requirements: `docs/FEATURE_REQUEST.md`

## Next Steps

- Replace `MockRepository` with real backend (Supabase/Firestore).
- Real auth (e.g., Supabase Auth) and payments (Stripe/Paddle).
- PDF export implementation.
- Advanced analytics & filters using `fl_chart`.
