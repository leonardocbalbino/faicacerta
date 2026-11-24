import type { CatalogGlossaryTerm } from '@faixa-certa/shared';
import { useLocalSearchParams } from 'expo-router';
import { Volume2 } from 'lucide-react-native';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, SearchField, StateView, Text } from '@/components/ui';
import { useGlossary } from '@/lib/api';
import { usePronunciation } from '@/lib/audio';
import { colors, GUTTER, radii } from '@/theme';

const ALL = '__all__';

/** Tela 10 — Glossário. */
export default function Glossario() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(params.q ?? '');
  const [categoryId, setCategoryId] = useState(ALL);
  const [open, setOpen] = useState<string | null>(null);
  const q = useDeferredValue(query);
  const glossary = useGlossary(q, undefined);
  const { play, playingUrl } = usePronunciation();

  // Vindo da busca da apostila com um termo.
  useEffect(() => {
    if (params.q) setQuery(params.q);
  }, [params.q]);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of glossary.data ?? []) if (t.category) seen.set(t.category.id, t.category.name);
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [glossary.data]);

  const terms = (glossary.data ?? []).filter(
    (t) => categoryId === ALL || t.category?.id === categoryId,
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <FlatList
        data={terms}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="display" size={30}>
              Glossário
            </Text>
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar em japonês ou português"
            />
            {categories.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                <Chip
                  label="Todos"
                  active={categoryId === ALL}
                  onPress={() => setCategoryId(ALL)}
                />
                {categories.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    active={categoryId === c.id}
                    onPress={() => setCategoryId(c.id)}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TermRow
            term={item}
            expanded={open === item.id}
            onToggle={() => setOpen(open === item.id ? null : item.id)}
            playing={playingUrl !== null && playingUrl === item.audioUrl}
            onPlay={() => item.audioUrl && play(item.audioUrl)}
          />
        )}
        ListEmptyComponent={
          <StateView
            loading={glossary.isPending}
            error={glossary.error}
            onRetry={() => glossary.refetch()}
            empty={q.trim() ? 'Nenhum termo encontrado.' : 'O glossário ainda está vazio.'}
          />
        }
      />
    </View>
  );
}

function TermRow({
  term,
  expanded,
  onToggle,
  playing,
  onPlay,
}: {
  term: CatalogGlossaryTerm;
  expanded: boolean;
  onToggle: () => void;
  playing: boolean;
  onPlay: () => void;
}) {
  const hasMore = Boolean(term.description || term.kanji);
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole={hasMore ? 'button' : undefined}
        accessibilityState={hasMore ? { expanded } : undefined}
        disabled={!hasMore}
        onPress={onToggle}
        style={styles.rowMain}
      >
        <View style={styles.rowText}>
          <Text variant="display" size={18}>
            {term.japanese}
            {term.kanji ? (
              <Text variant="muted" size={14}>
                {'  '}
                {term.kanji}
              </Text>
            ) : null}
          </Text>
          <Text variant="muted">{term.translation}</Text>
        </View>
        {term.audioUrl && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ouvir pronúncia de ${term.japanese}`}
            onPress={onPlay}
            style={[styles.play, playing && { backgroundColor: colors.lime }]}
          >
            <Volume2 size={18} color={playing ? colors.ink : colors.text} />
          </Pressable>
        )}
      </Pressable>
      {expanded && term.description ? (
        <Text style={styles.description}>{term.description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: GUTTER, paddingBottom: 32 },
  header: { gap: 16, paddingBottom: 16 },
  row: {
    minHeight: 60,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    paddingLeft: 16,
  },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  rowText: { flex: 1, gap: 2 },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: { paddingTop: 8, paddingRight: 8, paddingBottom: 6, fontSize: 14, lineHeight: 20 },
});
