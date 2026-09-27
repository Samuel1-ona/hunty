import React from "react";

export const View = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
  ({ testID, style, children, ...props }, ref) => {
    return React.createElement(
      "div",
      { "data-testid": testID, style: typeof style === "object" ? style : undefined, ref, ...props },
      children as React.ReactNode
    );
  }
);
View.displayName = "View";

export const Text = React.forwardRef<HTMLSpanElement, Record<string, unknown>>(
  ({ testID, style, children, ...props }, ref) => {
    return React.createElement(
      "span",
      { "data-testid": testID, style: typeof style === "object" ? style : undefined, ref, ...props },
      children as React.ReactNode
    );
  }
);
Text.displayName = "Text";

export const Pressable = React.forwardRef<HTMLButtonElement, Record<string, unknown>>(
  (
    {
      testID,
      style,
      onPress,
      onPressIn,
      onPressOut,
      disabled,
      accessibilityLabel,
      accessibilityRole,
      children,
      ...props
    },
    ref
  ) => {
    const computedStyle =
      typeof style === "function" ? (style as (s: { pressed: boolean }) => unknown)({ pressed: false }) : style;
    return React.createElement(
      "button",
      {
        "data-testid": testID,
        "aria-label": accessibilityLabel,
        role: accessibilityRole || "button",
        disabled,
        onClick: disabled ? undefined : (onPress as React.MouseEventHandler),
        onMouseDown: disabled ? undefined : (onPressIn as React.MouseEventHandler),
        onMouseUp: disabled ? undefined : (onPressOut as React.MouseEventHandler),
        style: typeof computedStyle === "object" ? computedStyle : undefined,
        ref,
        ...props,
      },
      typeof children === "function"
        ? (children as (s: { pressed: boolean }) => React.ReactNode)({ pressed: false })
        : (children as React.ReactNode)
    );
  }
);
Pressable.displayName = "Pressable";

export const ActivityIndicator = ({ ...props }: Record<string, unknown>) => {
  return React.createElement("div", { "data-testid": "activity-indicator", ...props });
};

export const StyleSheet = {
  create: <T extends Record<string, Record<string, unknown>>>(styles: T): T => styles,
};

export const useColorScheme = () => "light";
