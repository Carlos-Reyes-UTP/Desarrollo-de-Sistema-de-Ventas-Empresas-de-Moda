import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface ReportPageActionsContextValue {
  actions: ReactNode;
  setActions: (node: ReactNode) => void;
}

const ReportPageActionsContext = createContext<ReportPageActionsContextValue | null>(null);

export const ReportPageActionsProvider = ({ children }: { children: ReactNode }) => {
  const [actions, setActions] = useState<ReactNode>(null);
  const value = useMemo(() => ({ actions, setActions }), [actions]);
  return (
    <ReportPageActionsContext.Provider value={value}>{children}</ReportPageActionsContext.Provider>
  );
};

export function useReportPageActions() {
  const ctx = useContext(ReportPageActionsContext);
  if (!ctx) {
    throw new Error('useReportPageActions debe usarse dentro de ReportPageActionsProvider');
  }
  return ctx;
}
