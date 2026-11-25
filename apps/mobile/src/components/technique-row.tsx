import type { CatalogTechniqueItem } from '@faixa-certa/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { usePrefs } from '@/lib/prefs';
import { colors, fonts, radii } from '@/theme';
import { MasteryBadge, Text, type MasteryStatus } from './ui';

/** "Nage-waza · Ashi-waza" (categoria pai · categoria). */
export function categoryPath(t: Pick<CatalogTechniqueItem, 'category'>): string {
  const { category } = t;
  return category.parent ? `${category.parent.name} · ${category.name}` : category.name;
}

export function useMastery() {
  const { isMastered, isSeen } = usePrefs();
  return (id: string): MasteryStatus =>
    isMastered(id) ? 'mastered' : isSeen(id) ? 'studying' : 'new';
}

/** Linha da apostila: número, nome, grupo e badge de domínio. */
export function TechniqueRow({
  technique,
  number,
}: {
  technique: CatalogTechniqueItem;
  number?: number;
}) {
  const status = useMastery()(technique.id);
  return (
    // Pressable com navegação direta: o <Link asChild> descarta estilos em função ({ pressed }).
    <Pressable
      onPress={() => router.push({ pathname: '/tecnica/[slug]', params: { slug: technique.slug } })}
      accessibilityRole="button"
      accessibilityLabel={`${technique.japaneseName}, ${technique.translation}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
    >
      {number !== undefined && <Text style={styles.number}>{String(number).padStart(2, '0')}</Text>}
      <View style={styles.body}>
        <Text weight="semibold" size={15} numberOfLines={1}>
          {technique.japaneseName}
        </Text>
        <Text variant="muted" size={12} numberOfLines={1}>
          {technique.translation} · {categoryPath(technique)}
        </Text>
      </View>
      <MasteryBadge status={status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 60,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  number: { width: 30, fontFamily: fonts.display, fontSize: 15, color: colors.number },
  body: { flex: 1, gap: 2 },
});
