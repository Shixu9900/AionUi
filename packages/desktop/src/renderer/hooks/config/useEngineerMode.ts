import { useConfig } from './useConfig';

export function useEngineerMode(): boolean {
  const [value] = useConfig('ui.engineerMode');
  return value !== false;
}
