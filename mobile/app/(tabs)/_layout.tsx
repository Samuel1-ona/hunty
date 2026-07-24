import { Tabs } from 'expo-router';
import { useTheme } from '@providers/ThemeProvider';
import { StackHeader } from '@components/navigation/StackHeader';

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        header: (props) => <StackHeader {...props} />,
        headerTintColor: '#ffffff',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? '#9ca3af' : '#6b7280',
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        sceneStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Tabs.Screen name="hunts" options={{ title: 'Hunts' }} />
      <Tabs.Screen name="play" options={{ title: 'Map', headerShown: false }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
