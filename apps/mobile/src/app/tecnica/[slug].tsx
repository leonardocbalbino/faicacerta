import type { CatalogMedia, CatalogTechnique } from '@faixa-certa/shared';
import { useEvent } from 'expo';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Check, ChevronLeft, Heart, Volume2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RichText } from '@/components/rich-text';
import { categoryPath, TechniqueRow } from '@/components/technique-row';
import { IconButton, PrimaryButton, SecondaryButton, StateView, Text } from '@/components/ui';
import { useTechnique } from '@/lib/api';
import { usePronunciation } from '@/lib/audio';
import { formatDuration } from '@/lib/journey';
import { usePrefs } from '@/lib/prefs';
import { colors, fonts, GUTTER, radii } from '@/theme';

/** Tela 03 — Técnica. */
export default function Tecnica() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const technique = useTechnique(slug);
  const { markSeen } = usePrefs();
  const id = technique.data?.id;

  useEffect(() => {
    if (id) markSeen(id);
  }, [id, markSeen]);

  if (!technique.data) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <View style={{ paddingHorizontal: 16 }}>
          <BackButton />
        </View>
        <StateView
          loading={technique.isPending}
          error={technique.error}
          onRetry={() => technique.refetch()}
        />
      </View>
    );
  }
  return <TechniqueContent t={technique.data} />;
}

function BackButton({ overlay = false }: { overlay?: boolean }) {
  return (
    <IconButton
      accessibilityLabel="Voltar"
      overlay={overlay}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/apostila'))}
    >
      <ChevronLeft size={22} color={colors.text} />
    </IconButton>
  );
}

function TechniqueContent({ t }: { t: CatalogTechnique }) {
  const insets = useSafeAreaInsets();
  const { isMastered, toggleMastered } = usePrefs();
  const { play, playingUrl } = usePronunciation();
  const mastered = isMastered(t.id);
  const { steps } = t;

  const onToggle = () => {
    toggleMastered(t.id);
    if (!mastered)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <Hero t={t} top={insets.top} />

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text variant="display" size={32} style={{ lineHeight: 34 }}>
                {t.japaneseName}
              </Text>
              <Text variant="muted" size={14}>
                {t.translation} · {categoryPath(t)}
              </Text>
              {t.japaneseScript ? (
                <Text variant="muted" size={14}>
                  {t.japaneseScript}
                </Text>
              ) : null}
            </View>
            {t.pronunciationAudioUrl && (
              <IconButton
                round
                accessibilityLabel="Ouvir pronúncia"
                onPress={() => play(t.pronunciationAudioUrl!)}
                style={playingUrl ? { backgroundColor: colors.lime } : undefined}
              >
                <Volume2 size={20} color={playingUrl ? colors.ink : colors.text} />
              </IconButton>
            )}
          </View>

          {steps.length > 0 && (
            <Section label="Passo a passo">
              <View style={styles.steps}>
                {steps.map((s, i) => (
                  <StepCard key={`${s.url}-${i}`} step={s} n={i + 1} />
                ))}
              </View>
            </Section>
          )}

          {(t.keyPoints.length > 0 || t.commonMistakes.length > 0) && (
            <Section label="Pontos-chave">
              {t.keyPoints.map((k) => (
                <View key={k} style={styles.keyPoint}>
                  <Check size={18} color={colors.lime} strokeWidth={3} />
                  <Text style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>{k}</Text>
                </View>
              ))}
              {t.commonMistakes.map((m) => (
                <View key={m} style={styles.mistake}>
                  <Text size={13} color={colors.dangerText} style={{ lineHeight: 18 }}>
                    <Text weight="bold" size={13} color={colors.dangerStrong}>
                      Erro comum:{' '}
                    </Text>
                    {m}
                  </Text>
                </View>
              ))}
            </Section>
          )}

          {t.richContent?.content?.length ? (
            <Section label="Explicação">
              <RichText doc={t.richContent} />
            </Section>
          ) : null}

          {t.examinerCriteria ? (
            <Section label="O que o examinador observa">
              <Text style={{ fontSize: 15, lineHeight: 22 }}>{t.examinerCriteria}</Text>
            </Section>
          ) : null}

          {t.gallery.length > 0 && (
            <Section label="Galeria">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {t.gallery.map((g, i) => (
                  <Image
                    key={`${g.url}-${i}`}
                    source={{ uri: g.thumbUrl ?? g.url }}
                    style={styles.galleryImage}
                    accessibilityLabel={g.caption ?? undefined}
                  />
                ))}
              </ScrollView>
            </Section>
          )}

          {t.related.length > 0 && (
            <Section label="Relacionadas">
              {t.related.map((r) => (
                <TechniqueRow key={r.id} technique={r} />
              ))}
            </Section>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
        {mastered ? (
          <SecondaryButton
            label="Dominada — desfazer"
            icon={<Check size={18} color={colors.lime} strokeWidth={3} />}
            onPress={onToggle}
            style={{ flex: 1 }}
          />
        ) : (
          <PrimaryButton label="Já domino" height={52} onPress={onToggle} style={{ flex: 1 }} />
        )}
      </View>
    </View>
  );
}

const SPEEDS = [0.5, 0.75, 1] as const;

/** Vídeo principal com controle de velocidade (ou a capa, sem vídeo). */
function Hero({ t, top }: { t: CatalogTechnique; top: number }) {
  return (
    <View style={[styles.hero, { height: 300 + top }]}>
      {t.video ? (
        <VideoHero video={t.video} top={top} />
      ) : t.thumbUrl ? (
        <Image source={{ uri: t.thumbUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <Text variant="display" size={44} color={colors.heroPattern} style={{ marginTop: top }}>
          {t.japaneseScript ?? t.japaneseName}
        </Text>
      )}
      <View style={[styles.heroBack, { top: top + 8 }]}>
        <BackButton overlay />
      </View>
      <View style={[styles.heroFav, { top: top + 8 }]}>
        <FavoriteButton techniqueId={t.id} />
      </View>
    </View>
  );
}

function FavoriteButton({ techniqueId }: { techniqueId: string }) {
  const { isFavorite, toggleFavorite } = usePrefs();
  const on = isFavorite(techniqueId);
  return (
    <IconButton
      overlay
      accessibilityLabel={on ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
      accessibilityState={{ selected: on }}
      onPress={() => {
        toggleFavorite(techniqueId);
        Haptics.selectionAsync().catch(() => undefined);
      }}
    >
      <Heart
        size={20}
        color={on ? colors.lime : colors.text}
        fill={on ? colors.lime : 'transparent'}
      />
    </IconButton>
  );
}

function VideoHero({ video, top }: { video: CatalogMedia; top: number }) {
  const [speed, setSpeed] = useState<number>(1);
  const player = useVideoPlayer({ uri: video.url, useCaching: true }, (p) => {
    p.loop = true;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    player.playbackRate = speed;
  }, [player, speed]);

  const duration = formatDuration(video.durationMs);
  return (
    <>
      <VideoView
        player={player}
        style={[StyleSheet.absoluteFill, { top }]}
        contentFit="contain"
        nativeControls
        fullscreenOptions={{ enable: true }}
        allowsPictureInPicture
        surfaceType="textureView"
      />
      {status === 'error' && (
        <Text variant="muted" style={{ marginTop: top }}>
          Não foi possível carregar o vídeo.
        </Text>
      )}
      <View style={styles.heroBar} pointerEvents="box-none">
        <View accessibilityRole="radiogroup" accessibilityLabel="Velocidade" style={styles.speeds}>
          {SPEEDS.map((s) => {
            const on = s === speed;
            return (
              <Pressable
                key={s}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setSpeed(s)}
                style={[styles.speed, on && { backgroundColor: colors.lime }]}
              >
                <Text weight="bold" size={12} color={on ? colors.ink : colors.text}>
                  {`${String(s).replace('.', ',')}×`}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {duration && (
          <Text weight="semibold" size={12} style={styles.durationChip}>
            Vídeo · {duration}
          </Text>
        )}
      </View>
    </>
  );
}

function StepCard({ step, n }: { step: CatalogMedia; n: number }) {
  const image = step.thumbUrl ?? (step.type === 'IMAGE' ? step.url : null);
  return (
    <View style={styles.step}>
      {image && <Image source={{ uri: image }} style={styles.stepImage} resizeMode="cover" />}
      <Text style={styles.stepNumber}>{n}</Text>
      {step.caption ? (
        <Text variant="muted" size={11} numberOfLines={2}>
          {step.caption}
        </Text>
      ) : null}
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }} accessibilityLabel={label}>
      <Text variant="label" size={13}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  hero: {
    backgroundColor: colors.heroBackground,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroBack: { position: 'absolute', left: 16 },
  heroFav: { position: 'absolute', right: 16 },
  heroBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  speeds: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.overlay,
    padding: 4,
    borderRadius: 12,
  },
  speed: {
    minWidth: 44,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationChip: {
    backgroundColor: colors.overlay,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  body: { paddingHorizontal: GUTTER, paddingTop: 20, gap: 22 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  step: {
    width: '23.5%',
    flexGrow: 1,
    height: 84,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  stepImage: { ...StyleSheet.absoluteFill, opacity: 0.35 },
  stepNumber: { fontFamily: fonts.display, fontSize: 18, color: colors.lime },
  keyPoint: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  mistake: {
    borderRadius: radii.md,
    backgroundColor: colors.dangerSurface,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  galleryImage: {
    width: 160,
    height: 120,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: GUTTER,
    backgroundColor: colors.ink,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceRaised,
    flexDirection: 'row',
    gap: 10,
  },
});
