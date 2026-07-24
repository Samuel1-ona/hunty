"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  children: React.ReactNode;
}

type SetOpen = React.Dispatch<React.SetStateAction<boolean>>;

interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

interface DropdownMenuContentProps {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
  setOpen?: SetOpen;
}

interface DropdownMenuItemProps {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block w-full" ref={containerRef}>
      {React.Children.map(children, (child) => {
        if (
          React.isValidElement<DropdownMenuTriggerProps>(child) &&
          child.type === DropdownMenuTrigger
        ) {
          return React.cloneElement(child, {
            onClick: () => setOpen(!open),
          });
        }
        if (
          React.isValidElement<DropdownMenuContentProps>(child) &&
          child.type === DropdownMenuContent
        ) {
          return (
            <AnimatePresence>
              {open && React.cloneElement(child, { setOpen })}
            </AnimatePresence>
          );
        }
        return child;
      })}
    </div>
  );
}

export function DropdownMenuTrigger({
  children,
  onClick,
}: DropdownMenuTriggerProps) {
  return <div onClick={onClick}>{children}</div>;
}

export function DropdownMenuContent({
  children,
  className,
  setOpen,
}: DropdownMenuContentProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={
        prefersReducedMotion ? false : { opacity: 0, y: 10, scale: 0.95 }
      }
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
      exit={prefersReducedMotion ? {} : { opacity: 0, y: 10, scale: 0.95 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.2, ease: "easeOut" }
      }
      className={cn(
        "absolute bottom-full left-0 right-0 mb-2 z-50 min-w-[8rem] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 text-slate-950 shadow-xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50",
        className,
      )}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement<DropdownMenuItemProps>(child)) {
          return React.cloneElement(child, {
            onClick: (e: React.MouseEvent<HTMLDivElement>) => {
              child.props.onClick?.(e);
              setOpen?.(false);
            },
          });
        }
        return child;
      })}
    </motion.div>
  );
}

export function DropdownMenuItem({
  children,
  className,
  onClick,
}: DropdownMenuItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-xl px-3 py-2 text-sm outline-none transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50",
        className,
      )}
    >
      {children}
    </div>
  );
}
