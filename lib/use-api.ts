'use client';

import { useEffect, useState } from 'react';

export type Loadable<T> =
  | { state: 'loading' }
  | { state: 'ready'; data: T }
  | { state: 'error'; message: string };

/**
 * Runs `load` whenever `key` changes and keeps the result for that key only,
 * so a slow response for last month can't overwrite this month's.
 */
export function useLoad<T>(key: string, load: () => Promise<T>): Loadable<T> {
  const [result, setResult] = useState<{ key: string; value: Loadable<T> } | null>(null);

  useEffect(() => {
    let current = true;
    load().then(
      (data) => current && setResult({ key, value: { state: 'ready', data } }),
      (error: unknown) =>
        current &&
        setResult({
          key,
          value: { state: 'error', message: error instanceof Error ? error.message : 'Something went wrong' },
        }),
    );
    return () => {
      current = false;
    };
    // `load` is rebuilt every render; `key` names everything it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return result?.key === key ? result.value : { state: 'loading' };
}
