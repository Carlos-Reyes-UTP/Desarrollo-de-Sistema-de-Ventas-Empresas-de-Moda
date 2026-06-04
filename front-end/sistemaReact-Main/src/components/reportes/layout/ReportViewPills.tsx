interface ReportViewPillsProps<T extends string> {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
  className?: string;
}

/** Selector de vista (barras / torta / tabla) alineado al design system. */
export function ReportViewPills<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: ReportViewPillsProps<T>) {
  return (
    <div
      className={`flex flex-wrap gap-1 p-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg-muted)] w-fit ${className}`}
      role="tablist"
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
            value === opt.id ? 'app-btn-primary shadow-sm' : 'app-text-muted hover:app-heading'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
