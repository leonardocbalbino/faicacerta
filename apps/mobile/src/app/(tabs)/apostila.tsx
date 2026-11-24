import { router } from 'expo-router';
import { Repeat } from 'lucide-react-native';
import { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdBanner } from '@/components/ad-banner';
import { TechniqueRow } from '@/components/technique-row';
import { BeltSwatch, Chip, IconButton, SearchField, StateView, Text } from '@/components/ui';
import { useBelt, useSearch } from '@/lib/api';
import { beltLabel, useJourney } from '@/lib/journey';
import { usePrefs } from '@/lib/prefs';
import { colors, GUTTER, radii } from '@/theme';

const ALL = '__all__';

/** Tela 02 — Apostila da faixa. */
export default function Apostila() {
  const insets = useSafeAreaInsets();
  const { journey, programs } = useJourney();
  const belt = useBelt(journey?.target.id);
  const { isMastered } = usePrefs();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState(ALL);
  const q = useDeferredValue(query.trim());
  const search = useSearch(q);

  const requirements = useMemo(() => belt.data?.requirements ?? [], [belt.data]);

  /** Chips: categoria de topo (Nage-waza, Katame-waza...). */
  const groups = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of requirements) {
      const top = r.technique.category.parent ?? r.technique.category;
      seen.set(top.id, top.name);
    }
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [requirements]);

  const normalized = normalize(q);
  const visible = requirements
    .map((r, i) => ({ ...r, number: i + 1 }))
    .filter((r) => {
      const top = r.technique.category.parent ?? r.technique.category;
      if (group !== ALL && top.id !== group) return false;
      if (!normalized) return true;
      return normalize(`${r.technique.japaneseName} ${r.technique.translation}`).includes(
        normalized,
      );
    });
  const mastered = requirements.filter((r) => isMastered(r.technique.id)).length;

  // Resultados fora desta faixa (busca em todo o conteúdo).
  const inBelt = new Set(requirements.map((r) => r.technique.id));
  const others =
    q.length >= 2 ? (search.data?.techniques ?? []).filter((t) => !inBelt.has(t.id)) : [];
  const terms = q.length >= 2 ? (search.data?.glossary ?? []).slice(0, 5) : [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <FlatList
        data={visible}
        keyExtractor={(r) => r.technique.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityHint="Trocar a faixa"
                onPress={() => router.push('/faixas')}
                style={{ gap: 6, flex: 1 }}
              >
                <Text variant="label">Apostila</Text>
                {journey ? (
                  <View style={styles.beltTitle}>
                    <BeltSwatch colors={journey.target.colors} />
                    <Text variant="display" size={30} numberOfLines={1} style={{ flexShrink: 1 }}>
                      {beltLabel(journey.target.name)}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
              <IconButton accessibilityLabel="Trocar faixa" onPress={() => router.push('/faixas')}>
                <Repeat size={20} color={colors.text} />
              </IconButton>
            </View>

            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar técnica ou termo"
            />

            {groups.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                accessibilityRole="tablist"
              >
                <Chip label="Todas" active={group === ALL} onPress={() => setGroup(ALL)} />
                {groups.map((g) => (
                  <Chip
                    key={g.id}
                    label={g.name}
                    active={group === g.id}
                    onPress={() => setGroup(g.id)}
                  />
                ))}
              </ScrollView>
            )}

            {belt.data && (
              <View style={styles.meta}>
                <Text variant="muted">
                  {requirements.length} técnicas · {mastered} dominadas
                </Text>
                <Text variant="muted">Ordem do exame</Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => <TechniqueRow technique={item.technique} number={item.number} />}
        ListEmptyComponent={
          <StateView
            loading={programs.isPending || belt.isPending}
            error={programs.error ?? belt.error}
            onRetry={() => (programs.error ? programs.refetch() : belt.refetch())}
            empty={
              q
                ? 'Nenhuma técnica desta faixa com esse nome.'
                : 'Esta faixa ainda não tem técnicas publicadas.'
            }
            style={{ paddingVertical: 32 }}
          />
        }
        ListFooterComponent={
          <>
            {(others.length > 0 || terms.length > 0) && (
              <View style={styles.more}>
                <Text variant="label">Em todo o conteúdo</Text>
                {others.map((t) => (
                  <TechniqueRow key={t.id} technique={t} />
                ))}
                {terms.map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() =>
                      router.push({ pathname: '/glossario', params: { q: g.japanese } })
                    }
                    style={styles.term}
                  >
                    <Text variant="display" size={16}>
                      {g.japanese}
                    </Text>
                    <Text variant="muted">Glossário · {g.translation}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <View style={{ paddingTop: 20 }}>
              <AdBanner />
            </View>
          </>
        }
      />
    </View>
  );
}

/**
 * Minúsculas, sem acento, sem hífen nem espaço ("Ō-soto-gari" → "osotogari"),
 * para "osoto", "o soto" e "o-soto" acharem a mesma técnica. A busca da API
 * (abaixo da lista) cobre erros de digitação.
 */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: GUTTER, paddingBottom: 32 },
  header: { gap: 18, paddingBottom: 12 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  beltTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  more: { gap: 8, paddingTop: 24 },
  term: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 2,
  },
});
