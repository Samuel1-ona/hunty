import { ThemedCustomText } from '@components/themed';
import { useTheme } from '@providers/ThemeProvider';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderRenderArgs {
  tintColor?: string;
  canGoBack: boolean;
}

interface StackHeaderProps {
  navigation: {
    canGoBack: () => boolean;
    goBack: () => void;
  };
  options: {
    title?: string;
    headerTitle?: unknown;
    headerTintColor?: string;
    headerRight?: unknown;
  };
  route: {
    name: string;
  };
}

const getTitle = (options: StackHeaderProps['options'], routeName: string): string => {
  if (typeof options.headerTitle === 'string') return options.headerTitle;
  if (typeof options.title === 'string') return options.title;
  return routeName;
};

export function StackHeader({ navigation, options, route }: StackHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const canGoBack = navigation.canGoBack();
  const tintColor = options.headerTintColor || '#ffffff';
  const title = getTitle(options, route.name);
  const rightAction =
    typeof options.headerRight === 'function'
      ? (options.headerRight as (props: HeaderRenderArgs) => React.ReactNode)({
          tintColor,
          canGoBack,
        })
      : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.primary, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.leftSlot}>
          {canGoBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={8}
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <ThemedCustomText
                variant="label"
                lightColor={tintColor}
                darkColor={tintColor}
                weight="600"
              >
                Back
              </ThemedCustomText>
            </Pressable>
          ) : null}
        </View>

        <ThemedCustomText
          variant="label"
          lightColor={tintColor}
          darkColor={tintColor}
          weight="700"
          numberOfLines={1}
          style={styles.title}
        >
          {title}
        </ThemedCustomText>

        <View style={styles.rightSlot}>{rightAction}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  content: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftSlot: {
    minWidth: 72,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rightSlot: {
    minWidth: 72,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 8,
  },
});
