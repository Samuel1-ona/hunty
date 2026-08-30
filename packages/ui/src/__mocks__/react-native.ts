import React from 'react';

export const View = React.forwardRef<HTMLDivElement, any>(
  ({ testID, style, children, ...props }, ref) => {
    return React.createElement(
      'div',
      {
        'data-testid': testID,
        style: typeof style === 'object' ? style : undefined,
        ref,
        ...props,
      },
      children
    );
  }
);
View.displayName = 'View';

export const Text = React.forwardRef<HTMLSpanElement, any>(
  ({ testID, style, children, ...props }, ref) => {
    return React.createElement(
      'span',
      {
        'data-testid': testID,
        style: typeof style === 'object' ? style : undefined,
        ref,
        ...props,
      },
      children
    );
  }
);
Text.displayName = 'Text';

export const Pressable = React.forwardRef<HTMLButtonElement, any>(
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
    const computedStyle = typeof style === 'function' ? style({ pressed: false }) : style;
    return React.createElement(
      'button',
      {
        'data-testid': testID,
        'aria-label': accessibilityLabel,
        role: accessibilityRole || 'button',
        disabled,
        onClick: disabled ? undefined : onPress,
        onMouseDown: disabled ? undefined : onPressIn,
        onMouseUp: disabled ? undefined : onPressOut,
        style: typeof computedStyle === 'object' ? computedStyle : undefined,
        ref,
        ...props,
      },
      typeof children === 'function' ? children({ pressed: false }) : children
    );
  }
);
Pressable.displayName = 'Pressable';

export const ActivityIndicator = ({ color, size, ...props }: any) => {
  return React.createElement('div', { 'data-testid': 'activity-indicator', ...props });
};

export const StyleSheet = {
  create: <T extends Record<string, any>>(styles: T): T => styles,
};

export const useColorScheme = () => 'light';
