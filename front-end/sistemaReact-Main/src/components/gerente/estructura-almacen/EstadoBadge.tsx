const EstadoBadge = ({ activo }: { activo: boolean }) => (
  <span
    className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
      activo
        ? 'bg-[var(--app-accent)] text-[var(--app-accent-fg)]'
        : 'bg-[var(--app-bg-muted)] text-[var(--app-text-muted)]'
    }`}
  >
    {activo ? 'Activo' : 'Inactivo'}
  </span>
);

export default EstadoBadge;
