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
