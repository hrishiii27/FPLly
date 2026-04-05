# Design System Document: High-End Sports Editorial

## 1. Overview & Creative North Star

### Creative North Star: "The Kinetic Editorial"
This design system moves away from the sterile, cookie-cutter "SaaS dashboard" and toward the high-energy world of premium sports journalism. It bridges the gap between deep-data analytics and the tactile, expressive feel of a modern sports magazine. 

By rejecting the "dark mode" defaults of traditional FPL tools, we embrace a "Cream & Chrome" aesthetic—using a warm, paper-like foundation (`#fdffda`) contrasted with vibrant, punchy purples and emerald greens. The system breaks the grid through intentional asymmetry, overlapping card elements, and a typographic scale that values "vibe" as much as it values legibility. We are not just building a tool; we are building the definitive digital broadsheet for the modern manager.

---

## 2. Colors

The palette is rooted in high-contrast energy. Our primary purple drives action, while the secondary emerald green handles success states and positive financial metrics.

### Core Palette
*   **Primary (`#6236ff`):** Used for primary CTAs, active states, and brand-defining accents.
*   **Secondary (`#007348`):** Reserved for "Player Rising" indicators, positive ROI, and success confirmations.
*   **Tertiary/Error (`#c31c45`):** Reserved for "Player Falling," budget warnings, and critical alerts.
*   **Background (`#fdffda`):** The "Paper" base. This off-white/cream ensures the UI feels premium and editorial rather than digital and cold.

### The "No-Line" Rule
**Strict Mandate:** Designers are prohibited from using 1px solid borders to section off content. 
Boundaries must be defined solely through background color shifts or tonal transitions. Use `surface-container-low` (`#fcf9f1`) against the base `background` to create a section. If you need more definition, jump to `surface-container-high` (`#f0eee5`). Lines feel like a spreadsheet; tonal shifts feel like a magazine layout.

### Glass & Gradient Rule
To add "soul" to the data:
*   **Floating Elements:** Use `primary` or `surface` with a 60-80% opacity and a `backdrop-blur` of 12px-20px. 
*   **Signature CTAs:** Use a subtle linear gradient from `primary` to `primary_container` (`#a292ff`) at a 135-degree angle. This prevents buttons from looking flat and "default."

---

## 3. Typography

The typography strategy uses a "Triple-Threat" font stack to establish a clear editorial hierarchy.

*   **Display & Headlines (Epilogue):** Bold, wide, and expressive. Use `display-lg` (3.5rem) for hero stats and main titles. This font carries the weight of a headline on a front page.
*   **Titles & Body (Manrope):** A modern sans-serif that balances the "tech" side of analytics. Use `title-lg` (1.375rem) for card headers to ensure clarity.
*   **Labels (Space Grotesk):** Our "Data" font. Used for player prices, xG stats, and technical labels. The monospaced feel of `label-md` lends an air of mathematical precision to the analytics.

---

## 4. Elevation & Depth

We achieve hierarchy through **Tonal Layering** rather than structural scaffolding.

*   **The Layering Principle:** Treat the UI as stacked sheets of fine paper. 
    *   *Level 0:* `surface` (The desk)
    *   *Level 1:* `surface-container-low` (The magazine page)
    *   *Level 2:* `surface-container-lowest` (A focused white card sitting on the page)
*   **Ambient Shadows:** For floating action buttons or "Hero" player cards, use an extra-diffused shadow: `0px 20px 40px rgba(56, 56, 51, 0.06)`. Note the color: the shadow is a tinted version of `on-surface`, not pure black.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility (e.g., in high-contrast needs), use `outline-variant` (`#bbb9b3`) at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Cards & Data Lists
*   **Cards:** Use `rounded-lg` (1rem) as the standard. Cards should never have a border. Use `surface-container-lowest` for the card body to make it pop against the cream background.
*   **List Items:** Forbid the use of divider lines. Separate player rows using 1.4rem (`spacing-4`) of vertical white space or a subtle `surface-container-low` hover state.

### Buttons
*   **Primary:** `primary` background, `on-primary` text. `rounded-full` (pill shape).
*   **Secondary:** `secondary_container` background with `on-secondary_container` text. This is your "Go" button for transfers.
*   **Tertiary:** No background. Bold `primary` text with an underline on hover.

### Status Indicators (The "Pulse")
*   **Price Rise:** A bold `secondary` pill with `label-md` text.
*   **Price Fall:** A bold `tertiary` pill.
*   **Paper Texture:** Apply a 3% opacity grain overlay to primary status cards to mimic the "ink-on-paper" magazine feel.

### Input Fields
*   **Style:** Minimalist. No bottom line. Use a `surface-container-high` background with `rounded-md` corners. Focus state should be a 2px `primary` "Ghost Border" at 40% opacity.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical layouts. Let a player image overlap the edge of a card to create a sense of movement.
*   **Do** use `space-10` and `space-12` for section breathing room. High-end design requires "wasted" space.
*   **Do** mix your font weights. Pair a `display-sm` (Bold) headline with a `body-md` (Regular) subtext for maximum editorial impact.

### Don't:
*   **Don't** use pure black (`#000000`) for text. Always use `on-surface` (`#383833`) to maintain the organic, ink-on-paper feel.
*   **Don't** use "Card Shadows" on every element. If everything floats, nothing is important. Rely on tonal shifts first.
*   **Don't** use standard "Success Green" (#22C55E). Use our signature `secondary` emerald (`#007348`) to maintain the brand's sophisticated tone.