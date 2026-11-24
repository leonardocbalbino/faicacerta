import { Redirect, Tabs } from 'expo-router';
import { BookOpen, House, Languages } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePrefs } from '@/lib/prefs';
import { colors, fonts } from '@/theme';

/** Barra inferior. Simulado, Jornada e Turma entram nas próximas etapas. */
export default function TabsLayout() {
  const { onboarded } = usePrefs();
  const insets = useSafeAreaInsets();
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.ink },
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: colors.navInactive,
        tabBarStyle: {
          backgroundColor: colors.nav,
          borderTopColor: colors.navBorder,
          height: 60 + insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Início', tabBarIcon: ({ color }) => <House size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="apostila"
        options={{
          title: 'Apostila',
          tabBarIcon: ({ color }) => <BookOpen size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="glossario"
        options={{
          title: 'Glossário',
          tabBarIcon: ({ color }) => <Languages size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
