# Design System Strategy: Analytical Noir

## 1. Overview & Creative North Star
The Creative North Star for this system is **"The Sovereign Intelligence."**

Unlike standard consumer interfaces that prioritize "friendliness," this system is built for high-stakes decision-making. It rejects the generic, rounded-corner aesthetic of modern SaaS in favor of a rigid, architectural precision. By utilizing **intentional asymmetry** and **tonal layering**, we create a digital environment that feels like a high-end command center—serious, authoritative, and intellectually demanding.

We break the "template" look by avoiding traditional grids in favor of "Strategic Clusters." Elements are grouped by cognitive priority rather than mathematical spacing, using the interplay between the stark, technical precision of `Space Grotesk` and the prestigious, historical weight of `Newsreader`.

---

## 2. Colors: The Depth of Strategy
Our palette is not merely a background; it is an atmospheric depth map. We utilize a "Dark-on-Dark" philosophy to reduce eye strain during intensive simulation sessions.

### Surface Hierarchy & Nesting
We achieve depth through **Nesting** rather than elevation.
* **Base Layer:** `surface` (#131313) is your infinite canvas.
* **Secondary Zones:** Use `surface_container_low` for large navigational sidebars.
* **Active Focus:** Use `surface_container_high` for primary data modules.
* **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Boundaries are defined solely by the transition between `surface_container_low` and `surface_container_highest`.

### Signature Textures & Glass
* **The Command Gradient:** For primary CTAs and critical status indicators, use a subtle linear gradient from `primary` (#ffba20) to `primary_container` (#bc8700). This adds a "metallic" tactical feel.
* **Tactical Glass:** Floating overlays (e.g., Map Detail Popups) must use `surface_variant` at 60% opacity with a `20px` backdrop blur. This allows the simulation map to bleed through, maintaining spatial awareness.

---

## 3. Typography: The Tension of Data and History
The typographic system creates a dialogue between the "Present Moment" (Data) and "Historical Consequence" (Narrative).

* **Display & Headline (Newsreader):** Used for the "War Chronicle" and high-level simulation titles. This serif choice lends a literary, authoritative weight to the simulation's outcomes.
* **UI & Title (Inter):** Used for standard interface labels and navigation. It provides a clean, neutral balance to the serif headers.
* **Labels (Space Grotesk):** This is our "Technical" font. Use `label-md` and `label-sm` for all telemetry, coordinates, and military unit data. Its geometric construction evokes a command-center aesthetic.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are too "soft" for a strategic engine. We replace them with **Ambient Tonal Density.**

* **The Layering Principle:** To lift a component, do not add a shadow. Instead, place a `surface_container_highest` card atop a `surface_dim` background.
* **Ambient Shadows:** If a floating element (like a context menu) requires separation, use an extra-diffused shadow: `box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5)`. The shadow must be tinted with a hint of `secondary` to feel integrated.
* **The Ghost Border:** For high-density data tables where separation is critical, use the `outline_variant` at **15% opacity**. It should be felt, not seen.

---

## 5. Components: Precision Primitives

### Tactical Buttons
* **Primary:** Sharp corners (`0px`). Background: `primary` gradient. Text: `on_primary` (all-caps `label-md`).
* **Secondary:** No background. `1px` Ghost Border using `outline_variant`.
* **Interactions:** On hover, buttons should not "glow"; they should shift in tonal value (e.g., from `primary` to `primary_fixed`).

### Strategic Cards & Data Clusters
* **Forbid Dividers:** Do not use horizontal lines to separate list items. Use a `0.6rem` (`3`) vertical spacing gap or a subtle background shift to `surface_container_low`.
* **Strategic Chips:** Used for unit types (Infantry, Economic, Diplomatic). Use `secondary_container` with `on_secondary_container` text. Keep corners square to maintain the "Noir" aesthetic.

### Specialized Components
* **The Branching Timeline:** A horizontal visualization using `outline` for the main axis. Active nodes use `primary`, while projected/alternate history branches use `outline_variant` with a dashed stroke.
* **Threat Assessment Gauges:** Utilize a stepped color scale. Stable is `secondary`, Caution is `primary`, and Critical Threat is `tertiary` (#ffb4ac). Avoid "bright" greens; use the nuanced "Command-Center Blue" (`secondary`) for "Safe" states.

---

## 6. Do’s and Don’ts

### Do
* **DO** use strict 0px border-radii for all containers to reinforce the "Analytical Noir" rigidity.
* **DO** use `Space Grotesk` for any numeric data or coordinates to ensure a technical, high-fidelity look.
* **DO** employ asymmetrical layouts—for example, a heavy 3-column data grid offset by a wide, serif-led narrative column.

### Don’t
* **DON'T** use standard grey shadows. They muddy the deep blacks of the `surface`.
* **DON'T** use rounded corners (`0px` is the system standard).
* **DON'T** use "Safety Green" for success states. Use the sophisticated `secondary` (#a4c9ff) to represent stability and the amber `primary` for caution.