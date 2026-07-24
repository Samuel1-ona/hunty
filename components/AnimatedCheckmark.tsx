"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Check, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface AnimatedCheckmarkProps {
  asCircle?: boolean
  className?: string
  size?: number
}

export function AnimatedCheckmark({
  asCircle = false,
  className,
  size = 16,
}: AnimatedCheckmarkProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    const Icon = asCircle ? CheckCircle2 : Check
    return <Icon className={className} style={{ width: size, height: size }} />
  }

  return (
    <motion.div
      initial={{ scale: 0, rotate: -15 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={cn("flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {asCircle ? (
        <CheckCircle2 style={{ width: size, height: size }} />
      ) : (
        <Check style={{ width: size, height: size }} />
      )}
    </motion.div>
  )
}
