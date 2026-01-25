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

### Category Templates (Professional Preview Sites)
Each category has a fully-designed preview page with:
- **Fixed header** with business logo and WhatsApp CTA button
- **Hero section** with large product/service image and compelling headline
- **Info cards** showing address, hours, and contact info
- **Products/services grid** with 3 items and WhatsApp order buttons
- **Customer reviews** section with fake testimonials
- **Google Maps embed** with address
- **Professional footer** with business info, links, and social icons
- **WhatsApp floating button** (bottom-right corner)

Category themes and stock images:
- **Gastronomy** (Orange #FF6B35): Burger/food images, "Nosso Cardapio", X-Tudo, Hamburguer Artesanal, Combo Familia
- **Health & Beauty** (Pink #E91E8C): Salon/spa images, "Nossos Servicos", Corte Feminino, Coloracao, Tratamento Facial
- **Services** (Blue #3B82F6): Gym/professional images, consultoria, servico completo, manutencao
- **Retail** (Green #10B981): Store/shopping images, produtos destaque, lancamentos, promocoes
- **Generic** (Purple #8B5CF6): Office/corporate images, servico premium, atendimento VIP

Stock images are stored in `client/src/assets/images/` organized by category prefix.

### Authentication System
- **Email/Password Login**: Traditional login with bcrypt password hashing
- Login page at `/login` with tabs for login and registration
- Sessions stored in PostgreSQL with 7-day expiry

### Admin Configuration
- Admin email: `fl.italo.araujo@gmail.com`
- First user to register with this email automatically becomes admin
- Only the admin can create, update, and delete sellers
- Regular users see only the Partner App (Minha Carteira)
- Admin users see full admin menu (Dashboard, Lead Radar, CRM, Vendedores, Partner App)

### CRM History & Activity Tracking (January 2026)
- **lead_activities table**: Stores all activities for each lead (calls, status changes, notes, assignments)
- **Status Change Notes**: When changing a lead's status, a modal requires the user to explain the reason
- **Call Registration**: "Registrar Ligacao" button in Partner App allows sellers to log calls with optional notes
- **History Dialog**: Both Partner App and Leads page have a history button to view complete activity timeline
- **Activity Types**: status_change, call, note, site_generated, assignment

### API Endpoints for CRM History
- `GET /api/leads/:id/activities` - Get all activities for a lead
- `POST /api/leads/:id/activities` - Create a new activity
- `PATCH /api/leads/:id/status` - Update lead status with required note
- `POST /api/leads/:id/call` - Register a call for a lead