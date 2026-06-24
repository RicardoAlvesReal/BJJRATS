import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

export function useSessionTab<T extends string>(
  storageKey: string,
  allowedValues: readonly T[],
  fallback: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(storageKey) as T | null;
      return stored && allowedValues.includes(stored) ? stored : fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, value);
    } catch {
      // Navegação continua funcionando em navegadores sem sessionStorage.
    }
  }, [storageKey, value]);

  return [value, setValue];
}
