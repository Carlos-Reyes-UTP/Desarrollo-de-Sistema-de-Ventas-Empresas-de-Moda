# Backup antes de fase 2 (sidebar rail en escritorio)

Aquí está el **estado previo** a la fase 2:

- `SidebarMenu.tsx`: botón escritorio `fixed`, drawer con `z-[9998]` / `z-[10000]` (sin rail `aside`).
- `Layout.tsx`: columna principal sin `min-w-0` (solo se añadió en fase 2 para el flex con rail).

## Restaurar el comportamiento anterior

Desde `src/shared/layout` en PowerShell:

```powershell
Copy-Item _backup_pre_phase2\SidebarMenu.tsx .\SidebarMenu.tsx -Force
Copy-Item _backup_pre_phase2\Layout.tsx .\Layout.tsx -Force
```

Si solo quieres quitar el rail y mantener `min-w-0` en el layout, restaura solo `SidebarMenu.tsx`.
