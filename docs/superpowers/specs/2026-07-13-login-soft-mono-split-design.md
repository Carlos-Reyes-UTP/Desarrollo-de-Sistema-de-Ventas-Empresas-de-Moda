# Login Soft Monochrome Split — Design Spec

**Date:** 2026-07-13  
**Status:** Approved (visual direction)  
**Scope:** Redesign visual de `LoginPage` (UI only; auth logic unchanged)

## Decision summary

| Choice | Selection |
|--------|-----------|
| Style | Boutique suave (formas soft, atmósfera, tipografía amable) |
| Layout | Split 50/50: marca izquierda, formulario derecha |
| Palette | Monocromo alineado al sistema (blanco / negro / grises) |
| Left panel | Gris claro soft (no negro) — “aún más suave” |
| Right panel | Blanco / `#fafafa` con form centrado |

Mockups de referencia: `.superpowers/brainstorm/login-1783980080/content/preview-split-soft-light.html`

## Goals

- Login más moderno y amable, sin romper la identidad B&N de DK-SYSTEM.
- Mantener auth actual (`AuthContext.iniciarSesion`, validaciones, recordarme, toggle clave, errores).
- Mobile: solo form a pantalla completa; panel de marca oculto en `< md` (mismo patrón actual).

## Non-goals

- Cambiar flujo de auth, JWT, rutas o API.
- Implementar “¿Olvidó su Clave?” (seguir placeholder/`#` como hoy).
- Nuevos temas dinámicos en login (sigue `data-theme="classic"`).
- Rediseño de `AuthLoadingScreen`.

## Layout

```
Desktop (md+):
┌──────────────────────┬──────────────────────┐
│  Brand panel         │  Form panel          │
│  gris claro soft     │  blanco              │
│  logo + DK-SYSTEM    │  título + copy       │
│  “Bienvenido         │  usuario / clave     │
│   de nuevo”          │  recordar / forgot   │
│  tagline moda        │  CTA negro pill      │
│  © footer            │  links legales       │
└──────────────────────┴──────────────────────┘

Mobile:
┌──────────────────────┐
│  Form panel full     │
│  (+ logo DK-SYSTEM   │
│   compacto arriba)   │
└──────────────────────┘
```

## Visual tokens

| Token | Value |
|-------|--------|
| Brand panel bg | Gradiente soft `#f4f4f4` → `#ececec` → `#e8e8e8` + orbes blancos/transparentes |
| Form bg | `#ffffff` / `#fafafa` |
| Text primary | `#0a0a0a` |
| Text muted | `#737373` / `#a3a3a3` |
| Input fill | `#f5f5f5`, border `#eeeeee`, radius ~14px |
| CTA | Negro `#0a0a0a`, pill `rounded-full` |
| Divider | Opcional `border-left: 1px solid #f0f0f0` entre paneles |
| Font | DM Sans existente; títulos semibold tracking tight; labels 11px muted |

## Copy (tono más humano)

Reemplazar copy “arquitectónico” actual por:

| Elemento | Texto |
|----------|--------|
| Left headline | Bienvenido de nuevo |
| Left support | Sistema de gestión para empresas de moda |
| Form title | Iniciar sesión |
| Form support | Ingresa tus credenciales para continuar |
| Labels | Usuario / Contraseña (dejar “Identidad de Terminal” / “Clave de Acceso”) |
| CTA | INICIAR SESIÓN / PROCESANDO… (sin cambio de semántica) |

Feature grid (Análisis / Inventario / Facturación / CRM) del panel oscuro actual: **eliminar** del nuevo panel light para no sobrecargar.

## Behavior (preserve)

- State: `usuario`, `clave`, `mostrarClave`, `error`, `recordarme`, `iniciando`
- `sessionStorage` de usuario pendiende login
- Submit → `iniciarSesion` → navigate `/`
- PWA drag region superior
- Autofill styling adaptado al fill `#f5f5f5`
- Focus return a clave en error

## Motion

- Orbes del panel izquierdo con animación ambient sutil (reusar/adaptar keyframes actuales, más suaves, menor contraste).
- Transiciones focus en inputs y hover CTA.
- Entrada opcional leve fade/slide del form (CSS only, ~300–400ms). Sin librerías nuevas.

## Accessibility

- Contraste AA texto negro sobre gris claro / blanco.
- Labels asociadas a inputs.
- Toggle visibilidad de clave con `type="button"` y texto/ícono claro.
- Error role/alert accesible (mantener mensaje visible).

## File impact

| File | Change |
|------|--------|
| `front-end/sistemaReact-Main/src/pages/auth/LoginPage.tsx` | Rediseño JSX + estilos Tailwind/inline animations |
| CSS themes globales | Sin cambios obligatorios |

## Approaches considered

1. **Card centrada pastel** — descartado (paleta vs sistema B&N; luego layout cambió a split).
2. **Split + panel negro** — cercano al actual; menos “suave”.
3. **Split soft light monocromo** — **elegido**: soft en atmosfera/formas, color de marca.

## Success criteria

- En desktop se lee como una composición split soft B&N, no como el panel negro denso actual.
- Misma funcionalidad de login.
- Mobile usable, con marca compacta.
- Visualmente coherente con el resto de la app classic (negro/gris/blanco).
