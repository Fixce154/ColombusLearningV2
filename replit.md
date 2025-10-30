# Colombus Consulting - Formation Management System

## Overview
This application is an internal Learning Management System (LMS) for Colombus Consulting, designed to centralize and streamline the entire training process. It provides a unified portal for consultants to browse training catalogs, register for sessions, and track professional development. HR administrators manage the training catalog and sessions, instructors handle availability and attendance, and managers monitor team progress. The platform supports a two-phase training workflow: consultants first express interest (with priority selection) for demand assessment, followed by session enrollment and registration validation. It includes robust quota management for P1/P2 priorities and a cancellation mechanism with quota refunds. The application is a full-stack web application with a desktop-first, responsive design, aiming for a premium enterprise aesthetic and functional efficiency.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Frameworks**: React with TypeScript, Vite for bundling, Wouter for routing, TanStack Query for server state.
- **UI/UX**: Shadcn/ui (New York style) with Radix UI primitives, Tailwind CSS for styling, custom CSS variables-based theming.
- **Design System**: Premium enterprise aesthetic (inspired by LinkedIn Learning/Coursera), custom color palette (Deep Teal, Bright Cyan, Orange), Inter font for UI, JetBrains Mono for technical content.
- **Form Handling**: React Hook Form with Zod for validation.
- **State Management**: TanStack Query for server state, session-based authentication, role-based UI rendering.

### Backend Architecture
- **Server**: Express.js with TypeScript.
- **Data Layer**: Drizzle ORM for PostgreSQL interactions, schema definitions in `shared/schema.ts`.
- **Database**: Neon serverless PostgreSQL.
- **Database Schema**:
    - **Users**: User profiles with `roles` (text[] - multi-role support), seniority, business units, P1/P2 annual quota tracking.
    - **Formations**: Training catalog details.
    - **Formation Interests**: Tracks consultant interest (userId, formationId, priority, status, expressedAt).
    - **Sessions**: Scheduled training instances (dates, location, capacity, instructorId, status).
    - **Registrations**: Links users to sessions.
    - **Attendance**: Digital sign-in sheets.
    - **instructor_formations**: Links instructors to formations they teach (many-to-many).
    - **instructor_availabilities**: Stores instructor availability dates for formations (instructorId, formationId, dates array, with unique constraint).
- **API**: RESTful, JSON format, `/api` prefix, credential-based authentication.

### Authentication & Authorization
- **Current**: Mock user switching, session-based with multi-role support (`roles: text[]`), UI layer role-based access control with dynamic sidebar sections.
- **Role System**: Users can have multiple simultaneous roles (consultant, RH, formateur, manager). All role checks use `user.roles.includes()` pattern.
- **Self-Service Upgrade/Downgrade**: Consultants can activate/deactivate instructor role via dedicated buttons, with session assignment validation for resignation.
- **Production Configuration**: Session middleware configured with `proxy: true` to trust Replit reverse proxy for proper HTTPS cookie handling in production deployments.

### Key Business Logic
- **Priority System**: Annual quota of 1 P1 and 1 P2 per consultant. P1 registrations guarantee validation; P2 and P3 follow. Quota usage tracked in user profiles. Quota refunds automatically on intention rejection or deletion.
- **Registration Workflow**: Consultants express interest (which can be auto-validated if approved), RH approves, then enroll in sessions with priority selection, seniority validation, and capacity checking.
- **Session Management**: Defined capacity limits, real-time enrollment tracking, status states (open, full, completed, cancelled), instructor assignment.
- **RH Administration**: Comprehensive CRUD interfaces for formations, sessions, and consultants, including consultant archiving and hard deletion with associated data cleanup.
- **Instructor Features**: Instructors can view assigned formations, manage teaching availability with multi-date selection and duration validation, and view scheduled sessions. They can also self-assign/unassign formations to teach.
- **Instructor Availability System**: Complete CRUD interface for instructors to set availability dates for formations they teach. Includes dual validation (client and server) for future dates only (same day at midnight allowed) and exact date count matching formation duration (e.g., "2 jours" requires exactly 2 dates). Real-time validation messages indicate missing or excess dates with precise feedback.

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