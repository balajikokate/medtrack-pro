---
name: Clinical Precision
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434653'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737784'
  outline-variant: '#c3c6d5'
  surface-tint: '#1d59c1'
  primary: '#003c90'
  on-primary: '#ffffff'
  primary-container: '#0f52ba'
  on-primary-container: '#bcceff'
  inverse-primary: '#b0c6ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#004b31'
  on-tertiary: '#ffffff'
  tertiary-container: '#006544'
  on-tertiary-container: '#58e7ab'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b0c6ff'
  on-primary-fixed: '#001945'
  on-primary-fixed-variant: '#00419c'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-caps:
    fontFamily: inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: jetbrainsMono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 24px
  gutter: 16px
---

## Brand & Style
The design system is engineered for high-stakes healthcare environments where clarity, speed of recognition, and trust are paramount. The brand personality is professional, sterile, and hyper-efficient. It avoids decorative elements in favor of a utilitarian aesthetic that reduces cognitive load during inventory audits and surgical prep.

The visual style is **Corporate / Modern** with a lean towards **Minimalism**. It utilizes a "Systematic Clarity" approach: every line, color, and shadow must serve a functional purpose. The interface should feel like a high-end medical instrument—precise, reliable, and durable. High whitespace is used not just for aesthetics, but to prevent data overcrowding and ensure touch-targets are unmistakable in fast-paced clinical settings.

## Colors
The palette is rooted in "Clinical Blues" and "Sterile Whites" to evoke a sense of cleanliness and institutional trust. 

- **Primary (Sapphire Blue):** Used for primary actions, active states, and critical navigation elements. It conveys authority and stability.
- **Secondary (Slate):** Used for secondary UI elements and metadata to maintain a professional, low-distraction environment.
- **Tertiary (Success Green):** Reserved exclusively for positive inventory status, successful shipments, and "in-stock" indicators.
- **Neutral (Ice):** A cool-toned gray scale used for backgrounds and surfaces to reduce eye strain under harsh hospital lighting.

Functional colors (Error/Warning) are high-chroma to ensure immediate detection of expired stock or critical shortages.

## Typography
Legibility is the primary driver for the typographic scale. This design system utilizes a dual-font approach:

- **Manrope** is used for headlines and page titles to provide a modern, refined character that feels approachable yet professional.
- **Inter** is the workhorse for all body copy and form labels, chosen for its exceptional readability in dense data grids.
- **JetBrains Mono** is introduced specifically for SKU numbers, batch codes, and quantities. The monospaced nature ensures that numerical data aligns perfectly in tables, making it easier for staff to scan and compare values quickly.

For mobile devices, `display-lg` should scale down to `24px` to ensure critical titles do not wrap awkwardly.

## Layout & Spacing
The layout follows a strict **8px grid system** to ensure mathematical consistency across all views. 

- **Desktop:** 12-column fluid grid with 24px outer margins and 16px gutters. Heavy use of sidebars for navigation to keep the primary workspace focused on data.
- **Tablet:** 8-column grid. The sidebar collapses into a rail to maximize screen real estate for tables.
- **Mobile:** 4-column grid with 16px margins. Complex tables should reflow into card-based layouts for better vertical scanning.

Spacing between related items (e.g., an input and its label) should use `sm` (8px), while spacing between sections uses `lg` (24px) or `xl` (32px) to create clear visual grouping.

## Elevation & Depth
In this design system, depth is used sparingly to signify "interactive layers" versus "static surfaces." 

1.  **Level 0 (Background):** Neutral Ice (`#F8FAFC`). Flat.
2.  **Level 1 (Cards/Surface):** White (`#FFFFFF`). Uses a subtle 1px border (`#E2E8F0`) rather than a shadow to maintain a clean, clinical look.
3.  **Level 2 (Dropdowns/Modals):** High-diffused ambient shadow. Use a `0px 4px 20px rgba(15, 82, 186, 0.08)` shadow. Note the slight blue tint in the shadow to maintain color harmony with the primary brand.
4.  **Level 3 (Active Overlays):** Used for urgent alerts. Border weight increases to 2px with the brand primary or error color.

The goal is a "flat-plus" look where hierarchy is established primarily through borders and subtle tonal shifts.

## Shapes
The design system uses **Soft** geometry. A base corner radius of `4px` (0.25rem) is applied to buttons, inputs, and small components. Larger containers like cards use `8px`. 

This radius is intentional: it is soft enough to feel modern and accessible, but sharp enough to maintain a sense of professional discipline and precision. Circular "pill" shapes are reserved exclusively for status badges (tags) to distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Solid Primary Blue with white text. High contrast. 4px radius.
- **Secondary:** White background with 1px Slate border.
- **Success:** Solid Success Green, used only for "Confirm Receipt" or "Finalize Audit" actions.

### Data Tables (Critical Component)
- **Header:** Light gray background (`#F1F5F9`), uppercase labels using `label-caps`.
- **Rows:** White background with thin horizontal dividers. Hover state uses a subtle blue tint (`#F0F7FF`).
- **Cells:** Use `data-mono` for all numerical values.

### Input Fields
- Standard 1px border. On focus, the border thickens to 2px Primary Blue with a soft 2px blue outer glow.
- Error states must include both a red border and a small icon for accessibility.

### Status Badges
- Used for "In Stock," "Low Stock," or "Expired."
- Use "Pill" shape (fully rounded).
- Backgrounds should be low-opacity versions of the status color (e.g., 10% Green) with high-contrast text for legibility.

### Inventory Cards
- For mobile views, cards replace table rows. They should feature a clear header with the item name and a dedicated "Quantity" badge in the top-right corner using the `data-mono` font.