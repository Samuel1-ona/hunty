"use client";

import { TOAST_MOBILE_BREAKPOINT_PX, ToastPosition, resolveToastPosition } from "@hunty/ui/toast";
import { useEffect, useState } from "react";

export function useToastPosition(): ToastPosition {
  const [position, setPosition] = useState(ToastPosition.TopRight);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${TOAST_MOBILE_BREAKPOINT_PX - 1}px)`);

    const sync = () => {
      setPosition(resolveToastPosition(window.innerWidth));
    };

    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
    };
  }, []);

  return position;
}
