import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Image as ImageIcon } from 'lucide-react-native';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  achievementColor,
  FORMAT_RATIO,
  FORMAT_SIZE,
  StoryCard,
  type CardFormat,
  type CardTheme,
} from '@/components/story-card';
import { IconButton, PrimaryButton, SecondaryButton, StateView, Text } from '@/components/ui';
import { useCardData, useCardExport } from '@/lib/cards';
import { colors, GUTTER, radii } from '@/theme';

const FORMATS: { key: CardFormat; label: string }[] = [
  { key: 'stories', label: 'Stories' },
  { key: 'feed', label: 'Feed' },
];
const THEMES: { key: CardTheme; label: string }[] = [
  { key: 'color', label: 'Cor da conquista' },
  { key: 'dark', label: 'Escuro' },
  { key: 'lime', label: 'Lima' },
];

/** Tela 12 — Compartilhar conquista. */
export default function Card() {
  const insets = useSafeAreaInsets();
  const { height: screenH, width: screenW } = useWindowDimensions();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { data, loading } = useCardData(eventId);
  const [format, setFormat] = useState<CardFormat>('stories');
  const [theme, setTheme] = useState<CardTheme>('color');
  const ref = useRef<ComponentRef<typeof View>>(null);
  const { save, share, busy } = useCardExport(ref, FORMAT_SIZE[format]);

  // O card ocupa o espaço livre entre o topo e os controles.
  const maxH = Math.min(screenH - insets.top - insets.bottom - 300, 520);
  const width = Math.min(screenW - GUTTER * 2, maxH * FORMAT_RATIO[format]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Voltar" onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.text} />
        </IconButton>
        <Text weight="bold" size={16}>
          Compartilhar conquista
        </Text>
        <IconButton
          accessibilityLabel="Card com foto"
          onPress={() => router.replace({ pathname: '/card-foto', params: { eventId } })}
        >
          <ImageIcon size={20} color={colors.text} />
        </IconButton>
      </View>

      {!data ? (
        <StateView loading={loading} empty="Marco não encontrado." />
      ) : (
        <>
          <View style={styles.preview}>
            <View ref={ref} collapsable={false}>
              <StoryCard data={data} theme={theme} format={format} width={width} />
            </View>
          </View>

          <View
            style={styles.segmented}
            accessibilityRole="radiogroup"
            accessibilityLabel="Formato"
          >
            {FORMATS.map((f) => {
              const on = f.key === format;
              return (
                <Pressable
                  key={f.key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setFormat(f.key)}
                  style={[styles.segment, on && { backgroundColor: colors.text }]}
                >
                  <Text weight="semibold" size={14} color={on ? colors.ink : colors.text}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.themes} accessibilityRole="radiogroup" accessibilityLabel="Estilo">
            {THEMES.map((t) => {
              const on = t.key === theme;
              const fill =
                t.key === 'color'
                  ? achievementColor(data.event)
                  : t.key === 'lime'
                    ? colors.lime
                    : colors.ink;
              return (
                <Pressable
                  key={t.key}
                  accessibilityRole="radio"
                  accessibilityLabel={t.label}
                  accessibilityState={{ checked: on }}
                  onPress={() => setTheme(t.key)}
                  style={[styles.swatch, { backgroundColor: fill }, on && styles.swatchOn]}
                />
              );
            })}
          </View>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
            <SecondaryButton
              label={busy === 'save' ? 'Salvando…' : 'Salvar imagem'}
              onPress={save}
              disabled={busy !== null}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label={busy === 'share' ? 'Abrindo…' : 'Postar nos stories'}
              onPress={share}
              disabled={busy !== null}
              height={52}
              style={{ flex: 1 }}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
  },
  preview: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  segmented: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    marginHorizontal: GUTTER,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themes: { flexDirection: 'row', gap: 12, justifyContent: 'center', paddingVertical: 16 },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  swatchOn: { borderColor: colors.text, borderWidth: 3 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: GUTTER, paddingTop: 4 },
});
