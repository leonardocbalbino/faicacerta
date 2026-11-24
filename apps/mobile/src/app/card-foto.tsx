import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ImagePlus } from 'lucide-react-native';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoCard, type PhotoTemplate } from '@/components/story-card';
import { IconButton, PrimaryButton, SecondaryButton, StateView, Text } from '@/components/ui';
import { useCardData, useCardExport } from '@/lib/cards';
import { colors, GUTTER, radii } from '@/theme';

const TEMPLATES: { key: PhotoTemplate; label: string }[] = [
  { key: 'classic', label: 'Clássico' },
  { key: 'diagonal', label: 'Diagonal' },
  { key: 'top', label: 'Topo' },
];

/** Tela 23 — Card com foto (a foto fica no aparelho; nada é enviado). */
export default function CardFoto() {
  const insets = useSafeAreaInsets();
  const { height: screenH, width: screenW } = useWindowDimensions();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { data, available, loading } = useCardData(eventId);
  const [photo, setPhoto] = useState<string | null>(null);
  const [template, setTemplate] = useState<PhotoTemplate>('classic');
  const [shown, setShown] = useState<string[]>([]);
  const ref = useRef<ComponentRef<typeof View>>(null);
  const { save, share, busy } = useCardExport(ref, { width: 1080, height: 1920 });

  // Começa com até 3 números marcados (uma vez; depois o usuário escolhe).
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current || available.length === 0) return;
    initialized.current = true;
    setShown(available.slice(0, 3).map((a) => a.key));
  }, [available]);

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) setPhoto(result.assets[0].uri);
  };

  useEffect(() => {
    void pick();
    // Abre a galeria uma vez ao entrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxH = Math.min(screenH - insets.top - insets.bottom - 330, 460);
  const width = Math.min(screenW - GUTTER * 2, maxH * (9 / 16));
  const stats = available.filter((a) => shown.includes(a.key));

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Voltar" onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.text} />
        </IconButton>
        <Text weight="bold" size={16}>
          Card com foto
        </Text>
        <IconButton accessibilityLabel="Trocar foto" onPress={pick}>
          <ImagePlus size={20} color={colors.text} />
        </IconButton>
      </View>

      {!data ? (
        <StateView loading={loading} empty="Marco não encontrado." />
      ) : (
        <>
          <View style={styles.preview}>
            <Pressable onPress={photo ? undefined : pick} ref={ref} collapsable={false}>
              <PhotoCard
                data={data}
                photoUri={photo}
                template={template}
                stats={stats}
                width={width}
              />
            </Pressable>
          </View>

          <View style={styles.templates} accessibilityRole="radiogroup" accessibilityLabel="Modelo">
            {TEMPLATES.map((t) => {
              const on = t.key === template;
              return (
                <Pressable
                  key={t.key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setTemplate(t.key)}
                  style={[
                    styles.template,
                    on && { backgroundColor: colors.lime, borderColor: colors.lime },
                  ]}
                >
                  <Text weight="semibold" size={14} color={on ? colors.ink : colors.text}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {template !== 'diagonal' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stats}
            >
              {available.map((a) => {
                const on = shown.includes(a.key);
                return (
                  <Pressable
                    key={a.key}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    onPress={() =>
                      setShown(on ? shown.filter((k) => k !== a.key) : [...shown, a.key].slice(-3))
                    }
                    style={[styles.stat, on && { borderColor: colors.lime }]}
                  >
                    <Text weight="semibold" size={13} color={on ? colors.lime : colors.textMuted}>
                      {a.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
            <SecondaryButton
              label={busy === 'save' ? 'Salvando…' : 'Salvar imagem'}
              onPress={save}
              disabled={busy !== null || !photo}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label={busy === 'share' ? 'Abrindo…' : 'Postar nos stories'}
              onPress={share}
              disabled={busy !== null || !photo}
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
  preview: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  templates: { flexDirection: 'row', gap: 8, paddingHorizontal: GUTTER },
  template: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: { gap: 8, paddingHorizontal: GUTTER, paddingVertical: 12 },
  stat: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: GUTTER, paddingTop: 4 },
});
