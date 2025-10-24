# Design Guidelines - Colombus Consulting Premium LMS

## Design Approach

**Selected Approach:** Enterprise Design System with Premium Aesthetic
**Reference Inspiration:** LinkedIn Learning (professional polish), Coursera for Business (sophisticated enterprise feel), Notion (clean information hierarchy)
**Rationale:** This internal LMS requires the visual credibility of a paid platform while maintaining functional efficiency. The design balances premium aesthetics with enterprise productivity needs, creating trust through refined visual treatment.

## Color System

**Primary Palette:**
- Deep Teal: #00313F (primary brand, headers, key CTAs, active states)
- Bright Cyan: #009ECB (accents, links, interactive elements, focus states)
- Orange: #FF8200 (warnings, attention indicators, P1 priority badges)
- Pure White: #FFFFFF (surfaces, cards, input backgrounds)

**Supporting Colors:**
- Slate Gray: #64748B (secondary text, borders)
- Light Gray: #F8FAFC (page backgrounds, subtle surfaces)
- Success Green: #10B981 (confirmations, completed states)
- Error Red: #EF4444 (validation errors, critical alerts)

**Application Rules:**
- Page backgrounds: Light Gray (#F8FAFC)
- Card surfaces: Pure White with subtle shadow elevation
- Primary buttons: Deep Teal background, white text
- Secondary buttons: White background, Deep Teal border and text
- Text hierarchy: Deep Teal for headers, Slate Gray for body, Bright Cyan for links
- Status badges: Deep Teal (Validé), Orange (En attente), Slate Gray (Complété)

## Typography

**Font Families:**
- Primary: Inter (Google Fonts) - All UI elements
- Monospace: JetBrains Mono - Codes, technical references

**Type Scale:**
- Display (Login/Welcome): text-4xl (36px) / font-bold
- Page Titles: text-3xl (30px) / font-semibold / Deep Teal
- Section Headers: text-2xl (24px) / font-semibold / Deep Teal
- Card Titles: text-lg (18px) / font-semibold
- Body Text: text-base (16px) / font-normal / Slate Gray
- Secondary Text: text-sm (14px) / font-normal
- Labels/Badges: text-xs (12px) / font-semibold / uppercase / tracking-wider

**Premium Typography Treatment:**
- Letter spacing: tracking-tight for large headings, tracking-wide for labels
- Line height: leading-relaxed (1.625) for body text for optimal readability
- Font weights: Use semibold (600) and bold (700) liberally for hierarchy

## Layout System

**Spacing Primitives:** Tailwind units of 4, 6, 8, 12, 16, 20, 24 for generous, premium spacing

**Container Structure:**
- Maximum content width: max-w-7xl
- Sidebar navigation: Fixed w-72 (288px) with Deep Teal background
- Main content padding: p-8 (desktop), p-6 (tablet), p-4 (mobile)
- Card spacing: gap-6 between cards, gap-8 between major sections
- Form field spacing: space-y-6 within forms for breathing room

**Elevation System (Shadows):**
- Level 1 (Cards): shadow-sm with hover:shadow-md transition
- Level 2 (Modals, Dropdowns): shadow-lg
- Level 3 (Navigation, Header): shadow-md with subtle bottom border
- Interactive elements: Lift on hover with shadow transition (duration-200)

## Navigation & Core Layout

**Top Navigation Bar:**
- Height: h-20 (increased for premium feel)
- Background: White with shadow-md
- Layout: Logo (left, h-8) + Role switcher (center) + User profile dropdown (right)
- User avatar: w-10 h-10 rounded-full with border-2 border-Bright-Cyan when active

**Sidebar Navigation:**
- Fixed left sidebar (w-72)
- Background: Deep Teal (#00313F)
- Menu items: White text, rounded-lg, p-4, Heroicons (24px) + label
- Active state: Bright Cyan background with white text
- Hover state: Semi-transparent white background
- Collapse to w-20 on tablet, hamburger on mobile

**Role Switcher:**
- Premium dropdown with shadow-lg
- Current role: Badge with icon, Deep Teal background
- Dropdown items: White surface, hover state with Light Gray background

## Dashboard Components

**Stat Cards (Premium Treatment):**
- White background, rounded-xl, p-8
- Shadow-sm with hover:shadow-md
- Layout: Icon (w-12 h-12, Bright Cyan background, rounded-lg) + Number (text-4xl font-bold Deep Teal) + Label (text-sm Slate Gray)
- Spacing: space-y-3 internal
- Optional accent: Top border-t-4 in Bright Cyan

**Section Headers:**
- Margin bottom: mb-8
- Pattern: Title (text-2xl font-semibold Deep Teal) + Optional subtitle (text-sm Slate Gray) + Action button (right-aligned)
- Divider: Optional subtle border-b in Light Gray

**Training List Cards:**
- White background, rounded-lg, p-6
- Border: border border-slate-200
- Shadow-sm with hover:shadow-md, hover:border-Bright-Cyan transition
- Layout: Status badge (top-left) + Title (text-lg font-semibold) + Metadata row (icons + text-sm) + CTA button (bottom-right)
- Spacing: space-y-4 internal

## Catalog & Search

**Search Bar (Premium):**
- Height: h-14
- White background, rounded-xl, shadow-md
- Full-width with Heroicons search icon (left, 24px, Slate Gray) + Input (text-base) + Clear button (right when active)
- Focus state: ring-2 ring-Bright-Cyan, shadow-lg
- Placeholder: "Rechercher une formation..." in Slate Gray

**Filter Panel:**
- White background, rounded-xl, p-6, shadow-sm
- Sticky on desktop (top-24)
- Filter groups with text-sm font-semibold Deep Teal headers
- Checkboxes: Custom styled with Bright Cyan checked state
- Active filter count: Badge with Bright Cyan background
- Reset button: text-sm Bright Cyan text with hover underline

**Training Cards (Catalog):**
- White background, rounded-xl, overflow-hidden
- Optional thumbnail: 80px square with rounded-t-xl treatment
- Content padding: p-6
- Badge row: Niveau + Modalité badges (text-xs, rounded-full, px-3 py-1)
- Title: text-xl font-semibold Deep Teal, mb-3
- Description: text-sm Slate Gray, line-clamp-2, mb-4
- Metadata: Icons + text (durée, sessions) in text-sm
- CTA button: Full-width, Bright Cyan background, white text, rounded-lg, py-3
- Hover: shadow-lg, scale-[1.02] transition

## Forms & Inputs (Premium)

**Input Fields:**
- Height: h-12
- White background, rounded-lg
- Border: border-2 border-slate-200
- Focus: border-Bright-Cyan, ring-4 ring-Bright-Cyan/10
- Labels: text-sm font-semibold Deep Teal, mb-2
- Helper text: text-xs Slate Gray, mt-2

**Buttons:**
- Primary: px-8 py-3, rounded-lg, font-semibold, Deep Teal background, white text, shadow-sm, hover:shadow-md
- Secondary: px-8 py-3, rounded-lg, font-semibold, white background, Deep Teal border-2 and text, hover:bg-Light-Gray
- Accent CTA: Bright Cyan background, white text
- Warning: Orange background, white text
- Disabled: opacity-50, cursor-not-allowed

**Priority Selection (Critical Component):**
- Radio cards: White background, rounded-lg, p-4, border-2
- Unselected: border-slate-200
- Selected: border-Bright-Cyan, bg-Bright-Cyan/5, shadow-md
- Disabled: opacity-50, border-slate-200
- Labels: text-base font-semibold with quota count
- Description: text-sm Slate Gray

## Data Display

**Tables:**
- White background, rounded-xl, overflow-hidden, shadow-sm
- Header: Deep Teal background, white text, font-semibold, p-4
- Rows: border-b border-slate-100, p-4, hover:bg-Light-Gray
- Cell alignment: Left for text, right for numbers/actions
- Sortable headers: Heroicons chevron indicator

**Badges:**
- Rounded-full, px-3 py-1, text-xs font-semibold, uppercase, tracking-wide
- P1: Orange background, white text
- P2: Bright Cyan background, white text
- P3: Slate Gray background, white text
- Status badges: Deep Teal (Validé), Orange (En attente), Slate Gray (Complété)

**Progress Bars:**
- Background: Light Gray, h-3, rounded-full
- Fill: Bright Cyan, rounded-full, transition-all
- Label: text-sm Slate Gray, mb-1

## Images

**Application Type:** Functional enterprise application - minimal hero imagery

**Login/Welcome Page:**
- Use abstract geometric pattern or subtle gradient background (Deep Teal to Bright Cyan)
- Centered login card with white background, rounded-2xl, shadow-2xl, p-12
- Logo prominent at top

**Training Cards (Optional Thumbnails):**
- Small 80x80px category indicator images, rounded-lg
- Fallback: Icon on Bright Cyan background gradient

**User Avatars:**
- Circular, w-10 h-10 or w-12 h-12
- Border-2 in Bright Cyan for active/online users
- Fallback: Initials on Deep Teal background

**No Large Hero Images** - This is a productivity tool focused on information clarity

## Responsive Behavior

**Breakpoints:**
- Mobile (< 768px): Single column, bottom nav, stacked cards, hamburger menu
- Tablet (768px-1024px): Two-column grids, collapsed sidebar (w-20 icon-only)
- Desktop (1024px+): Full three-column catalog, persistent sidebar (w-72)

**Mobile Adaptations:**
- Reduce padding: p-4 instead of p-8
- Simplify cards: Show essential info only
- Bottom sheet for filters instead of sidebar
- Horizontal scroll for tables with sticky first column

## Animation & Interaction

**Transition Duration:** 200ms for all interactive elements

**Hover States:**
- Cards: shadow-sm → shadow-md, slight scale-[1.01]
- Buttons: shadow-sm → shadow-md, subtle brightness increase
- Links: Underline animation, Bright Cyan color

**Loading States:**
- Spinner: Bright Cyan animated ring
- Skeleton: Light Gray shimmer animation
- Progress: Bright Cyan indeterminate bar

**Avoid:** Auto-playing animations, scroll-triggered effects, excessive motion

## Premium Design Details

**Micro-interactions:**
- Success states: Brief Bright Cyan checkmark animation
- Error shake: Subtle horizontal shake on validation errors
- Dropdown reveal: Fade-in with slide-down (10px)

**Visual Refinements:**
- Generous whitespace between sections (space-y-8 or gap-8)
- Consistent rounded corners (rounded-lg for cards, rounded-xl for containers)
- Subtle borders on white surfaces for definition (border-slate-200)
- Icons always paired with labels for clarity
- Strategic use of Deep Teal for visual anchors and hierarchy

This premium design system creates an enterprise-grade LMS that feels polished, trustworthy, and sophisticated while maintaining excellent usability and information clarity.