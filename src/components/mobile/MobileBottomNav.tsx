import { ShellBottomNav } from '@/components/layout/ShellBottomNav';
import { useShellConfig } from '@/hooks/useShellConfig';
export function MobileBottomNav({ familySlug }: { familySlug?: string; className?: string }) {
  const shell = useShellConfig();
  if (shell?.insideShell) return null;
  return <ShellBottomNav familySlug={familySlug} />;
}
export default MobileBottomNav;
