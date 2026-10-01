"use client";

import { useEffect, useState } from "react";

export function useKeyboardInset(): number {
  const [keyboardInsetHeight, setKeyboardInsetHeight] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateInset = () => {
      const viewport = window.visualViewport;
      if (!viewport) {
        setKeyboardInsetHeight(0);
        return;
      }

      const inset = Math.max(0, window.innerHeight - viewport.height);
      setKeyboardInsetHeight(inset);
    };

    updateInset();
    window.addEventListener("resize", updateInset);
    window.visualViewport?.addEventListener("resize", updateInset);
    window.visualViewport?.addEventListener("scroll", updateInset);

    return () => {
      window.removeEventListener("resize", updateInset);
      window.visualViewport?.removeEventListener("resize", updateInset);
      window.visualViewport?.removeEventListener("scroll", updateInset);
    };
  }, []);

  return keyboardInsetHeight;
}
