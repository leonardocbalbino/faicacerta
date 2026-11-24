import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TechniqueRow } from '@/components/technique-row';
import { IconButton, StateView, Text } from '@/components/ui';
import { useTechniquesById } from '@/lib/api';
import { usePrefs } from '@/lib/prefs';
import { colors, GUTTER } from '@/theme';

/** Técnicas favoritas (do aparelho e, com login, de todos os aparelhos). */
export default function Favoritas() {
  const insets = useSafeAreaInsets();
  const { favoriteIds } = usePrefs();
  const query = useTechniquesById(favoriteIds);
  // Mantém a ordem de quando foram favoritadas (mais recente primeiro).
  const byId = new Map((query.data ?? []).map((t) => [t.id, t]));
  const items = favoriteIds.flatMap((id) => {
    const t = byId.get(id);
    return t ? [t] : [];
  });

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <FlatList
        data={items}
        keyExtractor={(t) => t.id}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <IconButton accessibilityLabel="Voltar" onPress={() => router.back()}>
              <ChevronLeft size={22} color={colors.text} />
            </IconButton>
            <Text variant="display" size={30}>
              Favoritas
            </Text>
          </View>
        }
        renderItem={({ item }) => <TechniqueRow technique={item} />}
        ListEmptyComponent={
          <StateView
            loading={favoriteIds.length > 0 && query.isPending}
            error={query.error}
            onRetry={() => query.refetch()}
            empty="Toque no coração de uma técnica para guardar aqui."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: GUTTER },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 18 },
});
