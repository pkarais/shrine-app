# Design System Document

## 1. Overview & Creative North Star: "The Sacred Blueprint"

This design system is built to honor the dual identity of a National Landmark: its spiritual gravity and its operational complexity. We move away from the "utility-first" clutter of standard SaaS apps, opting instead for **The Sacred Blueprint**. 

The "North Star" of this system is **Reverent Precision**. We treat every screen like a contemporary architectural plan for a historic site. By utilizing intentional white space, high-contrast typography, and a "no-line" philosophy, we create a tool that feels calm in a crisis and respectful of its surroundings. The UI does not shout; it guides.

### Editorial Strategy
*   **Intentional Asymmetry:** Use the large `display-lg` type off-center to create a sense of modern editorial prestige. 
*   **Breath as Utility:** White space isn't "empty"—it is a functional buffer for staff working in high-pressure, high-traffic environments.
*   **Layered Solemnity:** We use depth and tonal shifts to create a sense of permanence and quality, mirroring the stone and gold of the physical site.

---

## 2. Colors: Depth and Divinity

The palette is anchored in the deep blues of the Aegean and the gilded accents of Orthodox iconography, translated for a high-performance digital interface.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` section sitting on a `surface` background creates a natural, sophisticated break without the "cheapness" of a stroke.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper.
*   **Base:** `surface` (#f8f9fa) for the primary canvas.
*   **Nesting:** Use `surface-container-low` for large structural sidebars and `surface-container-highest` (#e1e3e4) for active, high-priority interactive zones.
*   **The Glass & Gradient Rule:** For floating navigation or urgent overlays, use `surface` with a 70% opacity and a `20px` backdrop-blur. 

### Signature Textures
Apply a subtle linear gradient to primary action buttons and headers: 
*   **Direction:** 135deg
*   **From:** `primary` (#002c5e) 
*   **To:** `primary_container` (#004286)
This creates a "soulful" depth that flat hex codes cannot replicate.

---

## 3. Typography: The Editorial Voice

We pair **Manrope** for structural headings (Modern, geometric, authoritative) with **Inter** for high-utility data (Neutral, ultra-legible).

*   **Display (Manrope):** Use `display-lg` and `display-md` for high-level summaries (e.g., "Daily Visitors"). These should be set with a `-0.02em` letter spacing to feel tight and custom.
*   **Headlines (Manrope):** `headline-sm` is your workhorse for section titles.
*   **Body (Inter):** All operational data, messaging, and tool descriptions use `body-md`. It is optimized for "staff on the move" reading.
*   **Labels (Inter):** `label-md` should be used for status badges (e.g., "In Progress") and should always be set in uppercase with `0.05em` letter spacing for an architectural feel.

---

## 4. Elevation & Depth: Tonal Layering

We reject traditional drop shadows in favor of **Tonal Layering**. Depth is achieved by stacking the surface-container tiers.

*   **The Layering Principle:** To lift a card, place a `surface-container-lowest` (#ffffff) card on top of a `surface-container` (#edeeef) background. This creates a soft "natural lift."
*   **Ambient Shadows:** When a floating element (like a mobile FAB or Tooltip) is required, use a shadow with a `24px` blur, `0px` offset, and 6% opacity using the `on-surface` color.
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use `outline-variant` (#c4c5d5) at **15% opacity**. Never use 100% opaque lines.
*   **Glassmorphism:** Use for "Messaging" overlays to maintain the context of the landmark map or calendar beneath it.

---

## 5. Components: High-Utility Primitives

### Buttons
*   **Primary:** A "Gold-Standard" action. Background: `secondary` (#735c00); Text: `on-secondary` (#ffffff). Shape: `md` (0.375rem).
*   **Secondary:** Ghost-style. No background. `primary` text with a `Ghost Border`.

### Input Fields
*   **Architecture:** Use `surface-container-low` as the field background. No bottom line.
*   **Focus State:** Transition the background to `surface-container-highest` and add a `2px` "Ghost Border" of `primary`.

### Cards & Lists
*   **Strict Rule:** No dividers. Separate list items using `8px` of vertical white space (Spacing `2`). 
*   **Grouping:** Group related tools inside a `surface-container-low` wrapper with an `xl` (0.75rem) roundedness to soften the "industrial" feel.

### Landmark-Specific Components
*   **The Liturgy Calendar:** A high-utility grid using `surface-container-lowest` for days with events and `surface` for empty days. Gold (`secondary`) dots denote high-priority religious feasts.
*   **Status Badges:** Use `tertiary_container` (#8d0201) with `on_tertiary_container` for "Security Alerts" and `primary_fixed` for "General Tasks."

---

## 6. Do’s and Don’ts

### Do
*   **DO** use `48px` (Spacing `12`) of padding between major sections to allow the design to breathe.
*   **DO** use gold (`secondary`) sparingly—only for high-value "moments of truth" like task completion or sacred event markers.
*   **DO** use `manrope` for numbers. They feel more designed and intentional.

### Don’t
*   **DON'T** use pure black (#000000). Use `on-surface` (#191c1d) for all text to keep the "High-End Editorial" softness.
*   **DON'T** use standard 1px lines to separate sidebar items. Use a `4px` left-aligned "Active Bar" in `primary` for the selected state.
*   **DON'T** crowd the screen. If a staff member cannot read the UI from arm's length while walking, increase the white space.