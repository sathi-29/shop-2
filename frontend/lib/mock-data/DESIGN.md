---
name: Modern Commerce Interface
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#9d4300'
  on-secondary: '#ffffff'
  secondary-container: '#fd761a'
  on-secondary-container: '#5c2400'
  tertiary: '#004c76'
  on-tertiary: '#ffffff'
  tertiary-container: '#00659a'
  on-tertiary-container: '#bedfff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb690'
  on-secondary-fixed: '#341100'
  on-secondary-fixed-variant: '#783200'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.005em
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.005em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-md: 1.25rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
---

## Brand & Style

The design system establishes a high-clarity, modern, and trustworthy shopping environment engineered for speed, frictionless decision-making, and high-contrast mobile accessibility. It combines functional minimalism with purposeful bursts of vibrant intent.

### Visual Philosophy
- **Restrained Authority:** Functional whitespace and clean slate neutrals frame products without distraction, positioning the catalog front and center.
- **Conversion Hierarchy:** Strategic bifurcation between navigational structure and critical transactional moments. Indigo commands system navigation and authority, while warm vibrant orange signals immediate conversion actions.
- **Tactile Accessibility:** High tactile feedback through touch-first geometric surfaces, visible system status lines, and deliberate interactive sizing engineered for seamless single-thumb operation.

## Colors

The palette employs a functional hierarchy designed for high readability, explicit visual feedback, and high-conversion interaction patterns.

### Palette Architecture
- **Primary Indigo (`#4F46E5`):** Guides user orientation, brand touchpoints, active states, key selection indicators, and focused elements.
- **Secondary Orange (`#F97316`):** Dedicated exclusively to conversion: "Add to Cart", "Instant Checkout", urgent notifications, and promotional callouts. It must never compete with decorative system elements.
- **Info Sky (`#0284C7`):** Utilized for metadata tags, tracking timelines, and non-blocking announcements.
- **Feedback Semantics:**
  - Success: `#10B981` (Surface/Border), `#059669` (Text/Icon on light backgrounds).
  - Destructive/Error: `#EF4444` (Action/Surface), `#DC2626` (Text/Icon on light backgrounds).
  - Warning: `#F59E0B` (Stock scarcity badges, rating stars, alert notices).

### Neutral & Surface Foundation
- **Light Mode:** Canvas Background (`#F8FAFC`), Elevated Card Surfaces (`#FFFFFF`), Muted Containers/Troughs (`#F1F5F9`), Structural Borders (`#E2E8F0`). Text hierarchy scales from Primary Slate (`#0F172A`) to Secondary Slate (`#475569`) down to De-emphasized Slate (`#94A3B8`).
- **Dark Mode:** Canvas Base (`#0B0F19`), Card Containers (`#1E293B`), Hover/Muted Surfaces (`#334155`), Structural Hairlines (`#1E293B`). Text scales from Primary High-Contrast (`#F8FAFC`) to Secondary Muted (`#94A3B8`).

## Typography

The typographic hierarchy relies on Inter's tall x-height, clear aperture shapes, and balanced vertical metrics.

### Typographic Rules
- **Numerical Dominance:** Product pricing and inventory counters utilize weight `600` or `700` with tabular lining figures (`font-variant-numeric: tabular-nums`) to prevent layout shifting during price updates or multi-currency conversions.
- **Optical Hierarchy:** Product titles inside lists use `title-md` clamped to a maximum of 2 lines. Secondary product specifications and delivery estimates map strictly to `body-md` and `body-sm`.
- **Letter Spacing:** Tighter letter spacing on display headlines retains density on handheld displays, while positive tracking on labels ensures instant legibility at glance speeds.

## Layout & Spacing

A modular fluid-grid approach designed around a 4px base rhythm, scaling into distinct 16px (`space-md`), 20px (`space-lg`), and 24px (`space-xl`) padding blocks.

### Breakpoint Structure
- **Mobile (< 640px):** 4-column fluid layout. Canvas margin: `1rem` (16px), column gutter: `1rem` (16px). Product listings default to 1 full-width card or a tight 2-column grid.
- **Tablet (640px - 1024px):** 8-column layout. Margin: `1.5rem` (24px), gutter: `1.25rem` (20px). Accommodates dual browsing panels and split detail views.
- **Desktop (> 1024px):** 12-column layout. Margin: `2rem` (32px), gutter: `1.5rem` (24px), maximum container constraint: 1280px centered.

### Structural Flow Rules
- Internal card padding follows `space-lg` (20px) on mobile and expands to `space-xl` (24px) on desktop interfaces.
- Stacked form fields and checkout rows maintain a uniform `space-md` (16px) separation.

## Elevation & Depth

Visual depth is achieved through low-contrast border boundaries combined with multi-stop, slate-and-indigo tinted ambient shadows. Avoid heavy, opaque drop shadows.

### Elevation Hierarchy
- **Level 0 (Flat Base):** Background canvas (`#F8FAFC` light / `#0B0F19` dark) with zero shadow.
- **Level 1 (Card Default):** Bounded by 1px border (`#E2E8F0` light / `#1E293B` dark) paired with `shadow-sm`: `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.03)`.
- **Level 2 (Hover & Active Product Tiles):** Lifted state during pointer or touch focus: `0 10px 15px -3px rgba(79, 70, 229, 0.06), 0 4px 6px -4px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Sticky Headers, Bottom Navigation, Drawers):** `0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.03)`.
- **Level 4 (Floating Modals & Checkout Sheets):** `0 25px 50px -12px rgba(15, 23, 42, 0.22)` with backdrop blur filter (`backdrop-blur-md`, 8px blur, `rgba(15, 23, 42, 0.4)` scrim).

## Shapes

The design system applies a calibrated shape language that moves from soft geometric containers to fully pill-shaped micro-elements.

### Geometry Specifications
- **Large Contextual Containers (`1rem` / 16px):** Product cards, checkout modules, review surfaces, and slide-up dialogs.
- **Interactive Controls (`0.75rem` - `0.875rem` / 12px - 14px):** Standard buttons, text input fields, drop-down menus, and quantity pickers.
- **Data & Filter Tokens (Pill / `9999px`):** Status chips, categorical filter tags, count indicators, discount badges, and floating action triggers.
- **Checkboxes & Segment Selectors (`0.25rem` / 4px):** Strict micro-radii to preserve recognizable affordances.

## Components

### Touch Targets & Hit Areas
All interactive targets must comply with a strict 48x48px bounding box on mobile devices. For elements visually smaller than 48px (e.g., standalone icons, quantity plus/minus buttons), use pseudo-element margins to preserve target size.

### Buttons & CTAs
- **Primary Conversion CTA ("Buy Now", "Checkout"):** Vibrant Orange background (`#F97316`), pure white text, 14px roundedness, 48px minimum height. Hover state: `#EA580C`. Focus-visible: 2px offset with `#F97316` ring.
- **Secondary System Action ("Filter", "Save to Wishlist"):** White background, Slate-200 border, Slate-900 text, 12px roundedness. Hover state: Indigo-tinted slate surface (`#F8FAFC`), Slate-300 border.
- **Subtle / Ghost Actions:** Transparent base with Slate-600 label, transitioning to light Slate-100 on hover.

### Form Inputs & Selectors
- **Height & Spacing:** 48px height with 14px horizontal padding and 12px roundedness.
- **Default State:** Canvas white, Slate-200 1px solid border, Slate-900 body typography.
- **Focus State:** Primary Indigo 1px border (`#4F46E5`) reinforced by a 3px soft outer ring (`rgba(79, 70, 229, 0.15)`).
- **Error State:** Destructive Red border (`#EF4444`) with an associated red warning ring and immediate inline validation text below the field.
- **Labeling:** Persistent bold floating or stacked top labels (`label-md`) with high-contrast `#475569` coloring.

### Chips & Badges
- **Pill Shape:** Enclosed with `rounded-full` (9999px) geometry.
- **Filter Chips:** 36px height, slate borders, text `label-md`. Active selection turns Primary Indigo (`#4F46E5`) with crisp white text.
- **Discount & Urgency Badges:** Compact 22px height, bold orange or green tinted backgrounds with high-contrast text (`label-sm`).

### Product Cards
- **Geometry:** 16px corner radius, Level 1 elevation, solid 1px structural outline.
- **Image Aspect Ratio:** 1:1 or 4:5 vertical ratio with neutral placeholder backgrounds (`#F1F5F9`).
- **Data Hierarchy:** Brand/Category (`label-sm`), Product Name (`title-md`), Pricing and Stock Status (`headline-md` tabular nums with secondary strikethrough comparison), followed by full-width 48px quick-add action.

### Iconography
- System icons must strictly use a 2px stroke width with rounded join and cap terminals, sized to a 24x24px viewbox with a uniform 20x20px optical center.