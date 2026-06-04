# UI Audit Report

## 1. Themes and CSS (R1)
**Findings**:
- **Hardcoded Colors**: Several components use hardcoded tailwind colors (e.g., `bg-white`, `border-gray-200`) instead of semantic theme variables (`bg-app-bg`, `border-app-border`).
- **Sidebar & Header**: Uses `bg-white` and hardcoded text colors instead of the current theme variables.
- **Login Page exception**: *Per the user's explicit instructions, the Login Page (`src/pages/auth/LoginPage.tsx`) should NOT be affected by dynamic themes and must retain its own specific color scheme.*

**Recommendations**:
- Except for the Login page, replace hardcoded tailwind colors with CSS variable references (`bg-[var(--app-bg)]`, etc.) in the global configuration.
- Audit `.tsx` files for `bg-white`, `text-gray-900`, `border-gray-200` and map them to appropriate theme custom properties.

## 2. Interactive States (R2)
**Findings**:
- **Missing Focus/Active States**: Many actionable elements (buttons, close icons) lack proper `:focus` and `:active` pseudo-classes, reducing accessibility.
  - *Example*: `src/components/catalogo/GestionCodigosBarras.tsx` - Close modal buttons use `hover:text-gray-900` but lack `focus:ring` or `active:scale`.
  - *Example*: `src/pages/usuarios/GestionUsuariosPage.tsx` - Alert close buttons miss `active:` states.
- **Inconsistent Transitions**: Some elements use `transition-colors` or `transition-all`, missing out on the standard global transition `transition-google` defined in `src/index.css`.

**Recommendations**:
- Apply `focus:outline-none focus:ring-2 focus:ring-black/10` and `active:scale-95` to standalone icon buttons.
- Standardize on `transition-google` (or the equivalent defined global class) for all interactive element state transitions to ensure a cohesive feel across the system.

## 3. Structural and Visual Bugs (R3)
**Findings**:
- **Z-Index Conflicts**: The system has competing high z-index values, specifically in modals and dropdowns. 
  - *Example*: `src/components/reportes/ProductosMasVendidos.tsx` has classes like `z-index: 99999 !important` for tooltip wrappers which can conflict with standard modals.
- **Scroll Behaviors in Modals**: Containers often have `overflow-y-auto` wrapped around absolute dropdowns that break out of the container bounds.
  - *Example*: `src/components/almacen/MoverMercaderiaModal.tsx` contains absolute lists for autocomplete suggestions that get clipped.
- **Body Scroll Lock**: The custom hook `useModalBodyScrollLock.ts` manages body scroll but doesn't correctly compensate for the scrollbar width on all operating systems, causing layout shifts (reflow) when modals are opened.

**Recommendations**:
- Implement a standardized z-index scale (e.g., dropdown=40, modal=50, tooltip=60) instead of using `99999 !important`.
- Use `ModalPortal` or a similar React Portal mechanism to render dropdowns/autocomplete lists directly into the `body` so they don't get clipped by `overflow-y-auto` parent containers.
- Update `useModalBodyScrollLock.ts` to calculate the exact `scrollbarWidth` and add it as padding to `document.body` when `overflow: hidden` is applied.
