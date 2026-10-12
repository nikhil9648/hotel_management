# Hotel & Restaurant — UI design system

**Scope:** Frontend presentation only for the existing hotel and restaurant management app. The product uses one dark, premium visual language across guest pages and staff workspaces, with restrained gold accents and enough contrast for fast operational scanning.

> The requested UI/UX Pro Max skill was not present in the repository or installed skill locations available during this work. Its search workflow could not be run. This system was defined manually from the project brief; no claim of Pro Max validation is made.

## Color tokens

The canonical CSS variables are in `src/index.css`.

| Token | Value | Use |
|---|---|---|
| Canvas | `#101216` | Main application background |
| Sidebar | `#151920` | Staff navigation |
| Surface | `#1B2028` | Cards and content panels |
| Raised surface | `#222935` | Selected and elevated elements |
| Primary text | `#F1F0EC` | Titles and high-priority content |
| Secondary text | `#A6AFBD` | Body copy and table content |
| Muted text | `#778292` | Hints and metadata |
| Border | `#303744` | Dividers and control outlines |
| Gold | `#D6B36A` | Primary actions and current navigation |
| Gold hover | `#E7C985` | Hover emphasis |
| Success | `#43B581` | Paid, ready, available states |
| Warning | `#E7A94B` | Pending and attention states |
| Error | `#E16D75` | Errors and destructive actions |
| Information | `#72A7E8` | Informational states |

Color is semantic: gold is reserved for primary emphasis, while status colors communicate state. Panels use charcoal rather than pure black.

## Type

- Application UI: DM Sans, with system sans-serif fallbacks.
- Brand and primary page headings: Playfair Display used sparingly.
- Financial values: retain source values; use tabular numerals when a page supports them (`font-variant-numeric: tabular-nums`).
- Operational page headings stay compact; table labels are 11px uppercase with letter spacing; body copy is 14–16px.

Fonts currently load from Google Fonts with local system fallbacks.

## Spacing, radius, and elevation

- Base spacing rhythm: 4px; common steps 8, 12, 16, 20, 24, 32, 40px.
- Card/control radius: 9–14px; pills use full radius.
- Borders are 1px solid `--border`.
- Elevation is a restrained dark shadow (`--shadow`), used for separation rather than glow.

## Layout

- Customer navigation is a compact top bar with brand, existing destinations, account identity, and existing logout.
- Staff workspaces use a fixed-width desktop sidebar and flexible content area. Mobile navigation wraps into a scrollable row; content and tables can scroll within their own bounds.
- Page content is capped near 1240px where existing markup has max-width utilities; forms and dashboards reflow to a single column on small screens.
- Breakpoints: 480px (small mobile), 640px (mobile), 768px (tablet/navigation), 900px (topbar), 1024px (desktop), and 1280px (wide content).
- Tables preserve columns and use local horizontal overflow on narrow viewports.

## Components and states

- Cards use `--surface`, border, and consistent radius.
- Inputs have a dark inset surface, clear labels, and a gold focus outline.
- Primary actions use gold; destructive actions use muted red; disabled controls reduce opacity and remain visibly disabled.
- Existing page-level status labels map to semantic success, warning, error, or information colors.
- Loading, error, and empty states remain driven by each page's existing data and state. The design layer must not add placeholder business values.
- Interaction transitions are short and reduced-motion preferences are honored.

## Accessibility

- Maintain keyboard-visible focus, semantic anchors/buttons, and text contrast on every surface.
- Preserve labels and existing validation. Target controls at least 42px high where practical.
- Avoid color-only status communication when existing labels are available.
- On mobile, keep navigation and tables usable without page-wide horizontal overflow.

## Data tables and charts

- Table headers use muted uppercase labels, rows use subtle separators, and hover is only a light background cue.
- Do not invent charts or metrics. Add visualizations only when the existing API response provides suitable real data.
- Monetary values, taxes, totals, and statuses remain exactly as returned or calculated by the current app logic.

## Implementation note

The frontend now uses Tailwind CSS 3 through PostCSS because the existing JSX already uses Tailwind utilities and the project did not previously include the Tailwind dependency or configuration. The utility layer generates from `src/**/*.{js,ts,jsx,tsx}`; `src/index.css` holds semantic hospitality tokens and presentation overrides. No component library or icon package was added. Service calls, route definitions, and business behavior were not changed.
