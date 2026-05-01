"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Optimistic state hook: aplica uma alteracao imediatamente, chama o async runner
 * e faz rollback automatico se ele lançar. Devolve o estado atual + setter direto.
 */
export function useOptimistic<T>(initial: T) {
  const [state, setState] = useState<T>(initial);
  const lastStable = useRef<T>(initial);

  const commit = useCallback((next: T) => {
    lastStable.current = next;
    setState(next);
  }, []);

  const run = useCallback(
    async <R>(
      nextState: T,
      runner: () => Promise<R>,
      options: { onError?: (err: unknown, prev: T) => void } = {},
    ): Promise<R | null> => {
      const prev = lastStable.current;
      lastStable.current = nextState;
      setState(nextState);
      try {
        const res = await runner();
        return res;
      } catch (err) {
        lastStable.current = prev;
        setState(prev);
        options.onError?.(err, prev);
        return null;
      }
    },
    [],
  );

  return { state, setState: commit, run } as const;
}
