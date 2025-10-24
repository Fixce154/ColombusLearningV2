# Colombus Consulting - Formation Management System

## Overview

This application is an internal Learning Management System (LMS) for Colombus Consulting, designed to centralize and streamline the entire training process. The platform serves as a unified portal where consultants can browse training catalogs, register for sessions, and track their professional development. HR administrators manage the training catalog and sessions, instructors handle their availability and attendance tracking, and managers monitor their team's training progress.

The application is built as a full-stack web application with a desktop-first, responsive design approach, emphasizing a premium enterprise aesthetic while maintaining functional efficiency.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (October 24, 2025)

### Two-Phase Training Workflow Implementation
- **New Formation Interest System**: Consultants first express interest in a formation with priority selection (P1/P2/P3), allowing RH to assess demand before organizing sessions
- **Interest Expression**: Dedicated `formation_interests` table with unique constraint on (userId, formationId) prevents duplicate quota consumption
- **Complete Workflow**: Interest expression → RH approval → Session enrollment → Registration validation
- **Dashboard Updates**: New "Mes intentions de formation" section displays pending/approved/converted interests separately from session registrations
- **TrainingDetail Refactor**: Shows different UI states based on interest status (none → express interest, pending → info message, approved → session selection, converted → enrolled)

### Critical Bug Fixes & Security
- **Quota Bypass Prevention**: Added unique database index and runtime duplicate check to prevent multiple interest expressions for same formation
- **Session Enrollment Flow**: Restored ability to enroll in sessions after interest approval (interest.status: approved → converted)
- **Data Integrity**: All mutations properly invalidate TanStack Query caches for real-time UI updates

### Technical Implementation
- **Schema**: New `formation_interests` table with unique index on (userId, formationId), status field (pending/approved/converted/withdrawn)
- **API Routes**: POST /api/interests, GET /api/interests (filtered by user), PATCH /api/interests/:id for status updates
- **Storage Layer**: createFormationInterest with duplicate prevention, listFormationInterests with flexible filtering
- **Frontend**: PrioritySelector component, dual-dialog system (interest expression + session enrollment)
- **Quota Management**: P1/P2 quotas consumed at interest expression, enforced server-side with seniority validation

## System Architecture

### Frontend Architecture

**Framework & Tooling:**
- React with TypeScript as the primary UI framework
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management and data fetching
- React Hook Form with Zod resolvers for form handling and validation

**UI Component System:**
- Shadcn/ui component library (New York style variant) with Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- CSS variables-based theming system for consistent branding
- Component structure follows atomic design principles with reusable UI components in `client/src/components/ui/`

**Design System:**
- Premium enterprise aesthetic inspired by LinkedIn Learning and Coursera for Business
- Custom color palette: Deep Teal (#00313F) primary, Bright Cyan (#009ECB) accents, Orange (#FF8200) warnings
- Inter font family for UI elements, JetBrains Mono for technical content
- Comprehensive design guidelines documented in `design_guidelines.md`

**State Management Strategy:**
- TanStack Query for server state management with real-time data fetching and caching
- Role-based UI rendering with dynamic component visibility based on user role (consultant, rh, formateur, manager)
- Session-based authentication with express-session and PostgreSQL store
- All pages now connected to backend API (no mock data)

### Backend Architecture

**Server Framework:**
- Express.js as the HTTP server framework
- TypeScript for type safety across the entire stack
- Modular route registration system in `server/routes.ts`

**Data Layer:**
- Drizzle ORM for database interactions with PostgreSQL
- Schema definitions centralized in `shared/schema.ts` for type sharing between client and server
- Connection to Neon serverless PostgreSQL database via `@neondatabase/serverless`

**Database Schema Design:**
- **Users table**: Stores user profiles with role-based access (consultant, rh, formateur, manager), seniority levels, business units, and priority usage tracking (P1/P2 annual quotas)
- **Formations table**: Training catalog with detailed metadata including title, description, objectives, prerequisites, duration, modality (presentiel/distanciel/hybride), seniority requirements, themes, and tags
- **Formation Interests table**: NEW - Tracks consultant interest expressions before session enrollment. Fields: formationId, userId, priority (P1/P2/P3), status (pending/approved/converted/withdrawn), expressedAt. Unique index on (userId, formationId) prevents duplicate quota consumption.
- **Sessions table**: Scheduled training instances with dates, locations, capacity limits, instructor assignments, and status tracking
- **Registrations table**: Junction table linking users to sessions with priority levels (P1/P2/P3), status (pending/validated/completed/cancelled), and registration timestamps
- **Attendance table**: Digital sign-in sheets tracking participant presence with timestamps

**API Design:**
- RESTful API structure with `/api` prefix for all routes
- JSON request/response format
- Credential-based authentication (future SSO integration planned)

### Authentication & Authorization

**Current Implementation:**
- Mock user switching mechanism for development and demonstration
- Session-based approach with role stored in user object
- Role-based access control at the UI layer

**Planned Approach:**
- Email-based authentication (magic link or SSO)
- Express session middleware with PostgreSQL session store (`connect-pg-simple`)
- Role-based permissions enforced at both API and UI levels

### Storage & Session Management

**In-Memory Storage:**
- Temporary `MemStorage` implementation in `server/storage.ts` for development
- Interface-based design (`IStorage`) to facilitate future database integration
- CRUD operations abstracted for easy swapping to database-backed storage

**Session Strategy:**
- Stateful sessions with server-side storage
- Session data persisted in PostgreSQL for production scalability

### Development Workflow

**Build Process:**
- Development mode: Vite HMR with Express middleware integration
- Production build: Vite builds client assets, esbuild bundles server code
- Type checking with TypeScript compiler in `check` script

**Code Organization:**
- Monorepo structure with shared types in `shared/` directory
- Path aliases configured: `@/` for client source, `@shared/` for shared types, `@assets/` for static files
- Component examples in `client/src/components/examples/` for design system documentation

**Quality Assurance:**
- Test IDs embedded in components for automated testing readiness
- Strict TypeScript configuration with comprehensive type coverage
- ESM module system throughout the stack

### Key Business Logic

**Priority System:**
- Annual quota: 1 P1 (strategic priority) and 1 P2 (standard priority) per consultant
- P1 registrations guarantee validation within 48 hours
- P2 registrations processed after P1, P3 registrations are standard queue
- Priority usage tracked in user profile (`p1Used`, `p2Used` fields)

**Registration Workflow:**
- Consultants browse catalog and select sessions
- Priority selection during registration
- Seniority validation against training requirements
- Capacity checking before enrollment confirmation
- Status progression: pending → validated → completed/cancelled

**Session Management:**
- Sessions have defined capacity limits with real-time enrollment tracking
- Status states: open, full, completed, cancelled
- Instructor assignment and location allocation
- Date-based filtering for upcoming vs. past sessions

## External Dependencies

### Third-Party UI Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled component primitives (accordion, alert-dialog, avatar, checkbox, dialog, dropdown-menu, label, popover, progress, radio-group, scroll-area, select, separator, slider, switch, tabs, toast, tooltip, etc.)
- **Embla Carousel**: Touch-friendly carousel component
- **cmdk**: Command palette component for search interfaces
- **Lucide React**: Icon library for consistent iconography
- **class-variance-authority**: Utility for managing component variants
- **date-fns**: Date manipulation and formatting library

### Database & ORM
- **Neon Serverless PostgreSQL**: Managed PostgreSQL database service
- **Drizzle ORM**: TypeScript-first ORM with schema-as-code approach
- **Drizzle Kit**: CLI tools for migrations and schema management
- **Drizzle Zod**: Schema validation integration with Zod

### Form Handling
- **React Hook Form**: Performant form state management
- **@hookform/resolvers**: Integration layer for validation libraries
- **Zod**: TypeScript-first schema validation

### Development Tools
- **Vite**: Fast build tool with HMR support
- **@vitejs/plugin-react**: React integration for Vite
- **@replit/vite-plugin-runtime-error-modal**: Error overlay for development
- **@replit/vite-plugin-cartographer**: Replit-specific development tooling
- **esbuild**: JavaScript bundler for server code
- **tsx**: TypeScript execution for development server

### Styling & Design
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing with Autoprefixer
- **tailwind-merge**: Utility for merging Tailwind classes
- **clsx**: Conditional class name utility

### Fonts
- **Google Fonts**: Inter (primary UI font family, weights 300-700)
- **Google Fonts**: JetBrains Mono (monospace for technical content)