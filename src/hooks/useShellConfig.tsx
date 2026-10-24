import { createContext, useContext, useEffect, useId, type ReactNode } from 'react';
export interface ShellConfig { hideBottomNav?: boolean; title?: string }
export interface ShellContextValue { insideShell: boolean; keyboardOpen: boolean; config: ShellConfig; register: (id: string, config: ShellConfig | null) => void }
export const ShellContext = createContext<ShellContextValue | null>(null);
export function useShellConfig(config?: ShellConfig) {
  const shell = useContext(ShellContext);
  const id = useId();
  const register = shell?.register;
  useEffect(() => {
    if (!register || !config) return;
    register(id, config);
    return () => register(id, null);
  }, [register, id, config?.hideBottomNav, config?.title]);
  return shell;
}
// Declarative equivalent of a hideBottomNav route handle for BrowserRouter routes.
export function ShellRouteConfig({ children, ...config }: ShellConfig & { children: ReactNode }) {
  useShellConfig(config);
  return <>{children}</>;
}
