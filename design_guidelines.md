# Design Guidelines - Colombus Consulting LMS

## Design Approach

**Selected Approach:** Design System - Modern Enterprise Application
**Inspiration:** Linear (clean interface, excellent information hierarchy), Notion (flexible content organization), Microsoft 365 (professional enterprise feel)
**Rationale:** As an internal productivity tool with complex data management, the design prioritizes clarity, efficiency, and learnability over visual experimentation. The interface should feel professional, trustworthy, and familiar to corporate users.

## Core Design Principles

1. **Information Clarity:** Dense data presented through clear hierarchy and strategic whitespace
2. **Role-Based Consistency:** Each user role maintains consistent patterns while showing relevant information
3. **Efficiency First:** Minimize clicks, maximize scannability, streamline workflows
4. **Trust & Professionalism:** Corporate aesthetic that reinforces confidence in the system

---

## Typography

**Font Families:**
- Primary: Inter (via Google Fonts CDN) - Excellent for UI, highly legible at all sizes
- Monospace: JetBrains Mono - For codes (QR codes, session IDs)

**Type Scale:**
- Page Titles: text-3xl (30px) / font-semibold
- Section Headers: text-xl (20px) / font-semibold  
- Card Titles: text-lg (18px) / font-medium
- Body Text: text-base (16px) / font-normal
- Secondary/Meta: text-sm (14px) / font-normal
- Labels/Badges: text-xs (12px) / font-medium uppercase tracking-wide

---

## Layout System

**Spacing Primitives:** Consistently use Tailwind units of **2, 4, 6, 8, 12, 16** (e.g., p-4, m-6, gap-8)

**Container Structure:**
- Maximum content width: max-w-7xl for main application area
- Sidebar navigation: Fixed w-64 (256px)
- Main content padding: p-6 to p-8
- Card spacing: gap-4 between cards, gap-6 between sections
- Form field spacing: space-y-4 within forms

**Grid Patterns:**
- Training catalog: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 with gap-6
- Dashboard metrics: grid-cols-2 md:grid-cols-4 with gap-4
- Data tables: Full-width with responsive horizontal scroll on mobile

---

## Component Library

### Navigation & Layout

**Top Navigation Bar:**
- Height: h-16
- Contains: Colombus Consulting logo (left), role switcher (center), user profile menu (right)
- Subtle bottom border for separation

**Sidebar Navigation:**
- Fixed left sidebar (w-64)
- Menu items with icon (from Heroicons) + label
- Active state indicated with subtle background and border accent
- Collapsed state on mobile (hamburger menu)

**Role Switcher:**
- Dropdown component showing current role
- Quick toggle between Consultant/RH/Formateur/Manager demo profiles
- Icon indicating active role type

### Dashboard Components

**Stat Cards:**
- Compact cards displaying key metrics (formations à venir, compteur P1/P2)
- Layout: Icon (top-left) + Number (large, prominent) + Label (below)
- Card padding: p-6
- Subtle border, rounded-lg

**Section Headers:**
- Clear visual separation between dashboard sections
- Pattern: Title (text-xl font-semibold) + optional action button (right-aligned)
- Bottom margin: mb-6

**Training List Items:**
- Horizontal card layout with: Status badge (left) + Training info (center) + Action button (right)
- Padding: p-4
- Include: Training title, date/time, location/modality, instructor name
- Hover state: subtle background change

### Catalog & Search

**Search Bar:**
- Prominent placement at top of catalog
- Full-width input with search icon (left) and clear button (right when active)
- Height: h-12
- Rounded-lg
- Placeholder: "Rechercher une formation par mots-clés..."

**Filter Panel:**
- Sticky sidebar (on desktop) or collapsible panel (mobile)
- Organized filter groups: Thème, Modalité, Niveau, Durée
- Checkboxes for multi-select, badges showing active filter count
- "Réinitialiser" button to clear all filters

**Training Cards:**
- Vertical card layout with clear hierarchy
- Structure: Badge row (niveau + modalité) → Title → Short description → Metadata row (durée, prochaine session) → CTA button
- Padding: p-6
- Border, rounded-lg
- Hover: subtle lift effect (shadow transition)

### Detailed Training View

**Hero Section (Minimal):**
- Training title (text-3xl font-bold)
- Metadata badges: Niveau, Durée, Modalité
- No large image - focus on information
- Padding: py-8

**Content Sections:**
- Structured tabs or sections: Descriptif | Sessions disponibles | Formateurs
- Each section with clear h2 headers (text-xl font-semibold mb-4)

**Session Selection:**
- List of session cards showing: Date/time, Location, Capacity (X/Y inscrits), Formateur
- Visual indicators: Available (enabled), Full (disabled/greyed), Selected (highlighted)
- Spacing: space-y-3 between session options

**Priority Selection (Critical Component):**
- Radio button group with clear labels: P1 (1/an), P2 (1/an), P3 (illimité)
- Visual feedback for disabled options when quota reached
- Explanation text below each option (text-sm)
- Prominent placement before submission

### Forms & Inputs

**Input Fields:**
- Consistent height: h-12
- Border with rounded-md
- Focus state with ring
- Labels: block mb-2 text-sm font-medium
- Helper text: text-xs mt-1

**Buttons:**
- Primary: px-6 py-3 rounded-md font-medium
- Secondary: Same size, different visual treatment
- Icon buttons: w-10 h-10 rounded-md for compact actions
- Disabled state clearly differentiated

**Alerts & Notifications:**
- Banner style for system messages (top of page)
- Inline alerts for form validation (below relevant field)
- Toast notifications for success/error actions (top-right corner)
- Alert types: Info, Success, Warning, Error (differentiated by icon and visual treatment)

### Data Display

**Tables:**
- Clean, scannable rows with zebra striping (subtle)
- Header row: font-semibold, slightly elevated background
- Cell padding: px-6 py-4
- Sortable columns with indicator icons
- Actions column (right-aligned) with icon buttons

**Badges:**
- Small, pill-shaped indicators for status/tags
- Padding: px-2.5 py-0.5, text-xs, rounded-full
- Types: Status (Validé, En attente, Complété), Priority (P1, P2, P3), Modality (Présentiel, Distanciel)

**Progress Indicators:**
- Capacity bars showing X/Y inscrits
- Visual fill representing percentage
- Height: h-2, rounded-full

### Role-Specific Components

**RH Dashboard:**
- Multi-tab interface: Catalogue | Sessions | Inscriptions | Reporting
- Data-dense tables with filters and sorting
- Bulk action checkboxes and action bar

**Consultant Dashboard:**
- Widget-based layout emphasizing upcoming trainings
- Quick access to catalog search
- Clear P1/P2 quota display (visual gauge)

---

## Animations

**Minimal Motion Philosophy:**
- Transition duration: 150-200ms for most interactions
- Use: Hover states, dropdown menus, modal appearances
- Avoid: Auto-playing carousels, scroll-triggered animations, excessive motion
- Exception: Loading spinners for async operations

---

## Images

**No Hero Images Required**
This is a functional enterprise application, not a marketing site. Focus on information architecture over visual storytelling.

**Icon Usage:**
- Heroicons (via CDN) for all interface icons
- Consistent 20px or 24px sizing
- Use outline style for navigation, solid for emphasis

**User Avatars:**
- Circular, 32px or 40px diameter
- Fallback to initials when no photo (2-letter monogram)

**Training Thumbnails (Optional):**
- If training cards include images: Small 80x80px thumbnails, rounded corners
- Otherwise, rely on iconography to indicate training category

---

## Responsive Behavior

**Breakpoints:**
- Mobile: Base (< 768px) - Single column, collapsible sidebar, simplified tables
- Tablet: md (768px+) - Two-column grids, persistent filters
- Desktop: lg (1024px+) - Full three-column catalog grid, sidebar always visible

**Mobile Priorities:**
- Bottom navigation for primary actions
- Collapsible filter panels
- Simplified cards showing essential info only
- Horizontal scrollable tables for data preservation

This design system creates a professional, efficient, and scalable foundation for the Colombus Consulting LMS, prioritizing user productivity and data clarity across all roles.