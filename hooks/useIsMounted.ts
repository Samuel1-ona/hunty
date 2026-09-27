import { useEffect, useState } from "react";

/**
 * Returns true only after the component has mounted on the client.
 * This prevents SSR hydration mismatches when accessing browser-only APIs
 * like localStorage or the Freighter extension.
 *

 */
export function useIsMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
