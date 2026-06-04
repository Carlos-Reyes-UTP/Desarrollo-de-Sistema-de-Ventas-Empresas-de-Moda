# Handoff Report: Structural Visual Bugs (R3) Audit

## Observation

1. **Conflicting z-index elements:**
   - Path: `c:\Users\Jeremy\Desktop\Dakani-System\Desarrollo-de-Sistema-de-Ventas-Empresas-de-Moda\front-end\sistemaReact-Main\src\components\reportes\ProductosMasVendidos.tsx` (Lines 1515, 1521, 1526)
   - Code snippet observed: `z-index: 99999 !important;` and `z-index: 99998;`

2. **Contrast and Readability:**
   - Path: `c:\Users\Jeremy\Desktop\Dakani-System\Desarrollo-de-Sistema-de-Ventas-Empresas-de-Moda\front-end\sistemaReact-Main\src\components\categorias\GestionCategorias.tsx` (Lines 107, 114)
   - Code snippet observed: `className="p-2.5 bg-white hover:bg-black hover:text-white rounded-xl transition-all shadow-sm border border-gray-100 text-gray-400"`

3. **Layout reflows (jumps):**
   - Path: `c:\Users\Jeremy\Desktop\Dakani-System\Desarrollo-de-Sistema-de-Ventas-Empresas-de-Moda\front-end\sistemaReact-Main\src\shared\ui\useModalBodyScrollLock.ts` (Lines 13, 20)
   - Code snippet observed: `document.body.style.overflow = 'hidden';` and `document.body.style.overflow = '';`

4. **Defective scroll behaviors in Modals/Containers:**
   - Path: `c:\Users\Jeremy\Desktop\Dakani-System\Desarrollo-de-Sistema-de-Ventas-Empresas-de-Moda\front-end\sistemaReact-Main\src\components\almacen\MoverMercaderiaModal.tsx` (Lines 460, 537)
   - Code snippet observed: `<ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto...">` inside an `overflow-y-auto flex-1` container.

## Logic Chain

1. **Z-index:** Arbitrary high z-index values like `99999` combined with `!important` break stacking context rules. If multiple components (like tooltips or toast notifications) use similar values, or try to override it, they conflict and create rendering overlaps. 
2. **Contrast:** The combination of `bg-white` and `text-gray-400` produces a contrast ratio of roughly 2.46:1, which fails WCAG AA guidelines (requiring at least 4.5:1 for normal text). This makes the buttons hard to read for users with visual impairments.
3. **Reflows:** Hiding the `overflow` on the `body` removes the vertical scrollbar. Without applying compensating `padding-right` equivalent to the scrollbar width, the entire page layout will shift to the right when a modal opens, and shift back when it closes, resulting in a noticeable layout jump (reflow).
4. **Defective scroll behavior:** Absolutely positioned dropdowns (`ul` lists) inside a scrollable modal container (`overflow-y-auto`) can get clipped when opened near the bottom boundary. It will also unnecessarily force the modal body to scroll to accommodate the absolute element's height instead of "breaking out" of the modal.

## Caveats

- I did not test the UI interactively. The scroll jump and contrast issues are deduced based on standard layout behavior and CSS values.
- I haven't audited third-party dependencies which might inject additional CSS or manage dropdowns differently.

## Conclusion

The React codebase contains potential structural visual bugs: arbitrary high z-indexes breaking stacking contexts, uncompensated body scroll-locking causing layout jumps, absolute dropdowns being clipped inside scrollable modals, and buttons lacking sufficient contrast. Fixing these issues will make the application visually robust and accessible.

## Verification Method

1. **Z-index:** Open `ProductosMasVendidos` view and trigger the dropdown. Open a global toast notification and verify if it renders below the dropdown.
2. **Contrast:** Use browser DevTools (Lighthouse or Accessibility tab) on the `GestionCategorias` page to verify contrast ratios of the action buttons.
3. **Reflow:** Open any Modal (like `AppModal`) on Windows and observe the background page content shifting.
4. **Scroll Defect:** Open the `MoverMercaderiaModal`, scroll to the bottom, and open the destination combo or autocomplete dropdown. Observe if it clips or spawns an inner scrollbar in the modal body.

### Suggested Fixes Snippets:

**1. Conflicting z-index:**
Instead of arbitrary values, use CSS variables or a coordinated scale (e.g. `z-50`).
```css
/* src/components/reportes/ProductosMasVendidos.tsx */
.dropdown-backdrop {
  z-index: 40;
}
.dropdown-container {
  z-index: 50;
}
```

**2. Contrast:**
```tsx
/* src/components/categorias/GestionCategorias.tsx */
// Replace text-gray-400 with text-gray-600
className="p-2.5 bg-white hover:bg-black hover:text-white rounded-xl transition-all shadow-sm border border-gray-100 text-gray-600"
```

**3. Layout reflows:**
```typescript
/* src/shared/ui/useModalBodyScrollLock.ts */
if (scrollLockCount === 1) {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.classList.add('modal-open');
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = `${scrollbarWidth}px`;
}
// ...
if (scrollLockCount === 0) {
  document.documentElement.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
}
```

**4. Defective scroll behaviors:**
```tsx
/* src/components/almacen/MoverMercaderiaModal.tsx */
// Render the dropdown using a Portal to prevent it from being clipped by the overflow-y-auto parent.
{comboAbierto && !cargandoDestinos && (
  <ModalPortal>
    <ul className="..." style={{ position: 'fixed', top: inputRect.bottom, left: inputRect.left, width: inputRect.width }}>
      {/* List items */}
    </ul>
  </ModalPortal>
)}
```
