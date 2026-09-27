import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

type CustomToggleProps = {
  initialValue?: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
};

const trackVariants = cva(
  "relative inline-flex items-center h-8 w-16 rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      checked: {
        true: "bg-gradient-to-r from-green-500 to-green-600 shadow-lg shadow-green-200 focus:ring-green-500",
        false: "bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-200 focus:ring-red-500",
      },
      disabled: {
        true: "opacity-50 cursor-not-allowed",
        false: "cursor-pointer",
      },
    },
    defaultVariants: {
      checked: false,
      disabled: false,
    },
  }
);

const springConfig = { type: "spring" as const, stiffness: 500, damping: 30 };

const CustomToggle = ({
  initialValue = false,
  onChange,
  disabled = false,
}: CustomToggleProps) => {
  const [isToggled, setIsToggled] = useState(initialValue);

  const handleToggle = () => {
    if (disabled) return;
    const next = !isToggled;
    setIsToggled(next);
    onChange?.(next);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={disabled}
      className={cn(trackVariants({ checked: isToggled, disabled }))}
    >
      {/* Sliding thumb */}
      <motion.div
        animate={{ x: isToggled ? 32 : 0 }}
        transition={springConfig}
        className="absolute top-0.5 left-0.5 h-7 w-7 bg-white rounded-full shadow-md flex items-center justify-center"
      >
        {isToggled ? (
          <Check className="h-4 w-4 text-green-600" strokeWidth={3} />
        ) : (
          <X className="h-4 w-4 text-red-600" strokeWidth={3} />
        )}
      </motion.div>

      {/* Background icon hints */}
      <div className="absolute inset-0 flex items-center justify-between px-2">
        <Check
          className={cn(
            "h-4 w-4 text-white transition-opacity duration-200",
            isToggled ? "opacity-100" : "opacity-40"
          )}
          strokeWidth={2}
        />
        <X
          className={cn(
            "h-4 w-4 text-white transition-opacity duration-200",
            !isToggled ? "opacity-100" : "opacity-40"
          )}
          strokeWidth={2}
        />
      </div>
    </button>
  );
};

export default CustomToggle;
