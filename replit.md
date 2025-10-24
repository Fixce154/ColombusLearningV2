# Colombus Consulting - Formation Management System

## Overview

This application is an internal Learning Management System (LMS) for Colombus Consulting, designed to centralize and streamline the entire training process. It provides a unified portal for consultants to browse training catalogs, register for sessions, and track professional development. HR administrators manage the training catalog and sessions, instructors handle availability and attendance, and managers monitor team progress. The platform supports a two-phase training workflow: consultants first express interest (with priority selection), allowing HR to assess demand before organizing sessions, followed by session enrollment and registration validation. The system incorporates a robust quota management system for P1/P2 priorities and a cancellation mechanism with quota refunds.

The application is a full-stack web application with a desktop-first, responsive design, aiming for a premium enterprise aesthetic and functional efficiency.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (October 24, 2025)

### Multi-Role System & Instructor Features
- **Schema Migration**: Migrated `role` (text) to `roles` (text[]) to support multiple simultaneous roles per user
- **Role Pattern**: All role checks now use `user.roles.includes("roleName")` pattern throughout the codebase
- **Business Rules Implementation**:
  - RH users have `roles: ["consultant", "rh"]` - Un RH est forcément consultant
  - Consultants have `roles: ["consultant"]` - Un consultant n'est pas forcément RH
  - Formateurs can have `roles: ["formateur"]` or be combined with other roles
  - Managers have `roles: ["consultant", "manager"]`
- **Sidebar Logic**: Consultant section displays for users with "consultant" OR "rh" role (fixes RH users seeing consultant features)
- **Become Instructor**: Added "Devenir formateur" button in sidebar for consultants to self-upgrade to instructor role
- **API Route**: POST /api/users/become-instructor endpoint with authentication guard and duplicate prevention
- **Instructor Pages**: Created three instructor pages:
  - InstructorFormations (/instructor-formations): View formations assigned to teach
  - InstructorAvailability (/instructor-availability): Manage teaching availability (placeholder)
  - InstructorSessions (/instructor-sessions): View scheduled sessions with filtering by instructor
- **Sidebar UX**: AppSidebar dynamically shows all relevant sections based on user's combined roles
- **Seed Data**: Updated seed.ts to use roles array and apply business rules correctly
- **Testing**: End-to-end Playwright verification of instructor activation flow, page navigation, and multi-role sidebar display

### RH CRUD Administration System
- **FormationManagement Page** (/formations): Complete CRUD interface for managing training catalog with form validation, real-time table updates, and confirmation dialogs
- **SessionManagement Page** (/sessions): Complete CRUD interface for scheduling sessions with datetime pickers and instructor assignment
- **Sidebar Reorganization**: RH users see two menu sections - "Mes formations" (consultant features) and "Administration RH" (admin tools)
- **API Routes**: Full CRUD endpoints (POST/PATCH/DELETE) for formations and sessions with RH role authorization
- **Schema Fix**: insertSessionSchema now accepts Date objects and ISO 8601 strings with automatic conversion
- **Bug Fixes**: Query parameter alignment (active=false), SelectItem empty value handling (__NONE__ sentinel), date serialization
- **Testing**: End-to-end Playwright verification of complete CRUD workflow

## System Architecture

### Frontend Architecture
- **Frameworks**: React with TypeScript, Vite for bundling, Wouter for routing, TanStack Query for server state.
- **UI/UX**: Shadcn/ui (New York style) with Radix UI primitives, Tailwind CSS for styling, custom CSS variables-based theming.
- **Design System**: Premium enterprise aesthetic (inspired by LinkedIn Learning/Coursera), custom color palette (Deep Teal, Bright Cyan, Orange), Inter font for UI, JetBrains Mono for technical content.
- **Form Handling**: React Hook Form with Zod for validation.
- **State Management**: TanStack Query for server state, session-based authentication with Express and PostgreSQL store, role-based UI rendering.

### Backend Architecture
- **Server**: Express.js with TypeScript.
- **Data Layer**: Drizzle ORM for PostgreSQL interactions, schema definitions in `shared/schema.ts`.
- **Database**: Neon serverless PostgreSQL.
- **Database Schema**:
    - **Users**: User profiles with **roles (text[] - multi-role support)**, seniority, business units, P1/P2 annual quota tracking.
    - **Formations**: Training catalog details (title, description, objectives, duration, modality, seniority, themes, tags).
    - **Formation Interests**: Tracks consultant interest (userId, formationId, priority, status, expressedAt), with unique constraint.
    - **Sessions**: Scheduled training instances (dates, location, capacity, instructorId, status).
    - **Registrations**: Links users to sessions (priority, status, timestamp).
    - **Attendance**: Digital sign-in sheets.
- **API**: RESTful, JSON format, `/api` prefix, credential-based authentication.

### Authentication & Authorization
- **Current**: Mock user switching, session-based with **multi-role support** (`roles: text[]`), UI layer role-based access control with dynamic sidebar sections.
- **Role System**: Users can have multiple simultaneous roles (consultant, RH, formateur, manager). All role checks use `user.roles.includes()` pattern.
- **Self-Service Upgrade**: Consultants can activate instructor role via "Devenir formateur" button (POST /api/users/become-instructor).
- **Planned**: Email-based authentication (magic link/SSO), Express session middleware with PostgreSQL store, API and UI level role-based permissions.

### Key Business Logic
- **Priority System**: Annual quota of 1 P1 and 1 P2 per consultant. P1 registrations guarantee validation; P2 and P3 follow. Quota usage tracked in user profiles.
- **Registration Workflow**: Consultants express interest, RH approves, then enroll in sessions with priority selection, seniority validation, and capacity checking.
- **Session Management**: Defined capacity limits, real-time enrollment tracking, status states (open, full, completed, cancelled), instructor assignment.

## External Dependencies

### Third-Party UI Libraries
- **Radix UI**: Accessible, unstyled component primitives.
- **Shadcn/ui**: Component library built on Radix UI.
- **Embla Carousel**: Touch-friendly carousel.
- **cmdk**: Command palette.
- **Lucide React**: Icon library.
- **class-variance-authority**: Component variant utility.
- **date-fns**: Date manipulation and formatting.

### Database & ORM
- **Neon Serverless PostgreSQL**: Managed PostgreSQL service.
- **Drizzle ORM**: TypeScript-first ORM.
- **Drizzle Kit**: CLI for migrations.
- **Drizzle Zod**: Schema validation integration.

### Form Handling
- **React Hook Form**: Form state management.
- **@hookform/resolvers**: Validation library integration.
- **Zod**: TypeScript-first schema validation.

### Development Tools
- **Vite**: Build tool with HMR.
- **@vitejs/plugin-react**: React integration.
- **esbuild**: JavaScript bundler for server.
- **tsx**: TypeScript execution for development server.

### Styling & Design
- **Tailwind CSS**: Utility-first CSS framework.
- **PostCSS**: CSS processing.
- **tailwind-merge**: Utility for merging Tailwind classes.
- **clsx**: Conditional class name utility.

### Fonts
- **Google Fonts**: Inter (UI), JetBrains Mono (technical content).