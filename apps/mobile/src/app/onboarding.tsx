import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BeltPicker } from '@/components/belt-picker';
import { BrandMark, PrimaryButton, StateView, Text } from '@/components/ui';
import { usePrograms } from '@/lib/api';
import { usePrefs } from '@/lib/prefs';
import { colors, GUTTER } from '@/theme';

/** Tela 08 — "Qual é a sua faixa hoje?". */
export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const programs = usePrograms();
  const { chooseBelt } = usePrefs();
  const program = programs.data?.find((p) => p.isBase) ?? programs.data?.[0];
  const [beltId, setBeltId] = useState<string | null>(null);

  const finish = (selected: string | null) => {
    const id = selected ?? program?.belts[0]?.id;
    if (!program || !id) return;
    chooseBelt(program.id, id);
    router.replace('/');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <BrandMark size={28} />
            </View>
            <Text variant="display" size={20}>
              faixa
              <Text variant="display" size={20} color={colors.lime}>
                certa
              </Text>
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => finish(null)}
            disabled={!program}
            style={styles.skip}
          >
            <Text weight="semibold" size={14} color={colors.textMuted}>
              Pular
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          <Text variant="display" size={36} style={{ lineHeight: 38 }}>
            Qual é a sua faixa hoje?
          </Text>
          <Text variant="muted" size={15}>
            A gente monta a apostila da próxima faixa para você.
          </Text>
        </View>

        {program ? (
          <BeltPicker belts={program.belts} selectedId={beltId} onSelect={(b) => setBeltId(b.id)} />
        ) : (
          <StateView
            loading={programs.isPending}
            error={programs.error}
            empty="Nenhum programa publicado ainda."
            onRetry={() => programs.refetch()}
          />
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
        <PrimaryButton label="Continuar" disabled={!beltId} onPress={() => finish(beltId)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: GUTTER, paddingBottom: 120, gap: 22 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: GUTTER,
    backgroundColor: colors.ink,
  },
});
