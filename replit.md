# Localfy - Ecossistema de Vendas WaaS Automatizado

## Overview

Localfy is an end-to-end sales automation platform designed for web agencies (WaaS - Website as a Service). The platform solves two major problems for site agencies: slow prospecting and product intangibility.

The core value proposition is transforming website sales from a slow consultative service into an instant shelf product. The system automatically discovers businesses without websites, generates personalized demo sites (previews), and delivers qualified opportunities directly to salespeople.

**Key Modules:**
- **Lead Radar**: Automated discovery of businesses without websites using map APIs
- **Magic Builder**: Dynamic template-based preview site generator
- **CRM Kanban**: Lead management with status tracking
- **Partner Portal**: Seller-facing dashboard with commissions

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful JSON APIs under `/api/*` prefix
- **Authentication**: Replit OpenID Connect (OIDC) integration with Passport.js
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` for shared types between frontend/backend
- **Migrations**: Drizzle Kit with `db:push` command

### Key Design Patterns
- **Monorepo Structure**: Client (`client/`), server (`server/`), and shared (`shared/`) directories
- **Path Aliases**: `@/` for client source, `@shared/` for shared modules
- **Storage Abstraction**: `IStorage` interface in `server/storage.ts` for database operations
- **Type Safety**: Zod schemas derived from Drizzle tables for runtime validation

### Authentication Flow
- Replit Auth integration with OIDC
- Session stored in PostgreSQL `sessions` table
- User data stored in `users` table
- Protected routes use `isAuthenticated` middleware

## External Dependencies

### Database
- **PostgreSQL**: Primary database (requires `DATABASE_URL` environment variable)
- **Drizzle ORM**: Database queries and schema management

### Authentication
- **Replit OIDC**: OpenID Connect authentication via Replit
- **Passport.js**: Authentication middleware
- **express-session**: Session management with PostgreSQL store

### Frontend Libraries
- **@tanstack/react-query**: Server state management and caching
- **Radix UI**: Accessible UI primitives (dialog, dropdown, tabs, etc.)
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

### Build & Development
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **TSX**: TypeScript execution for development

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `ISSUER_URL`: Replit OIDC issuer (defaults to https://replit.com/oidc)
- `REPL_ID`: Replit environment identifier

## Recent Changes (January 2026)

### Completed Implementation
- Full PostgreSQL schema with relations (sellers, leads, templates, commissions)
- RESTful API with Zod validation on all create/update routes
- Replit Auth integration with protected routes
- Modern SaaS design system with blue/purple color scheme

### Pages Implemented
- **Landing** (`/`): Marketing page for unauthenticated users
- **Dashboard** (`/dashboard`): Stats overview with Total Leads, MRR, Conversion Rate, Active Sellers
- **CRM** (`/crm`): Kanban pipeline with 5 columns (Novos, Distribuidos, Em Negociacao, Venda Fechada, Perdidos)
- **Lead Radar** (`/radar`): Simulated search for businesses without websites
- **Magic Builder** (`/builder`): Template gallery for preview site generation
- **Partner App** (`/partner`): Seller's mobile-first view with commission tracking
- **Sellers** (`/sellers`): Admin panel for managing sales team
- **Preview** (`/ver/:slug`): Public preview pages with category-specific templates

### Category Templates
- Gastronomy: Orange/red theme with restaurant-focused features
- Health & Beauty: Pink/purple theme with appointment scheduling
- Services: Blue/indigo theme with quote requests
- Retail: Green/teal theme with product catalog
- Generic: Neutral theme for institutional sites