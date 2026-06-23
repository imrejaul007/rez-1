import { useRef, useEffect, useCallback } from 'react';

export function useIsMounted() {
  const ref = useRef(true);
  useEffect(() => {
    ref.current = true;
    return () => { ref.current = false; };
  }, []);
  return useCallback(() => ref.current, []);
}
