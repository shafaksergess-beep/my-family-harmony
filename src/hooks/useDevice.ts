import { useContext } from 'react';
import { DeviceContext } from '@/contexts/DeviceContext';
export function useDevice() {
  const device = useContext(DeviceContext);
  if (!device) throw new Error('useDevice must be used within DeviceProvider');
  return device;
}
