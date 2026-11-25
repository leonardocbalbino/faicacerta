import { router } from 'expo-router';
import { ArrowRight, BookOpen, Heart, Languages, Play, Repeat, Search } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdBanner } from '@/components/ad-banner';
import { categoryPath } from '@/components/technique-row';
import {
  BeltSwatch,
  BrandMark,
  IconButton,
  PrimaryButton,
  ProgressBar,
  StateView,
  Text,
} from '@/components/ui';
import { useBelt } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { initials } from '@/lib/format';
import { formatDuration, greeting, pickOfTheDay, useJourney } from '@/lib/journey';
import { usePrefs } from '@/lib/prefs';
import { colors, GUTTER, radii } from '@/theme';

/** Tela 01 — Início. */
export default function Home() {
  const insets = useSafeAreaInsets();
  const { journey, programs } = useJourney();
  const belt = useBelt(journey?.target.id);
  const { isMastered } = usePrefs();
  const { user } = useAuth();

  const requirements = belt.data?.requirements ?? [];
  const total = requirements.length;
  const done = requirements.filter((r) => isMastered(r.technique.id)).length;
  const pending = requirements.filter((r) => !isMastered(r.technique.id));
  const ofTheDay = pickOfTheDay(pending.length > 0 ? pending : requirements)?.technique;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={user ? 'Minha conta' : 'Entrar'}
          onPress={() => router.push(user ? '/conta' : '/entrar')}
          style={styles.headerLeft}
        >
          <View
            style={[
              styles.avatar,
              user && { backgroundColor: journey?.current.colors[0] ?? colors.lime },
            ]}
          >
            {user ? (
              <Text weight="bold" size={16} color={colors.ink}>
                {initials(user.name)}
              </Text>
            ) : (
              <BrandMark size={30} />
            )}
          </View>
          <View style={{ gap: 2 }}>
            <Text variant="muted">{greeting()}</Text>
            <Text variant="display" size={20}>
              {user ? (user.name.split(' ')[0] ?? user.name) : 'judoca'}
            </Text>
          </View>
        </Pressable>
        <IconButton accessibilityLabel="Buscar" onPress={() => router.push('/apostila')}>
          <Search size={20} color={colors.text} />
        </IconButton>
      </View>

      {!journey ? (
        <StateView
          loading={programs.isPending}
          error={programs.error}
          empty="Nenhum programa publicado ainda."
          onRetry={() => programs.refetch()}
        />
      ) : (
        <>
          <View style={styles.hero} accessibilityLabel="Rumo à próxima faixa">
            <Text variant="label">{journey.isLastBelt ? 'Sua faixa' : 'Rumo à próxima faixa'}</Text>
            <View style={styles.belts}>
              {!journey.isLastBelt && (
                <>
                  <BeltSwatch colors={journey.current.colors} width="42%" height={26} knot />
                  <ArrowRight size={20} color={colors.textMuted} />
                </>
              )}
              <BeltSwatch
                colors={journey.target.colors}
                width={journey.isLastBelt ? '100%' : '42%'}
                height={26}
                knot
              />
            </View>
            <Text variant="display" size={28} style={{ lineHeight: 30 }}>
              {journey.isLastBelt
                ? journey.target.name
                : `${journey.current.name} → ${journey.target.name}`}
            </Text>
            <View style={{ gap: 8 }}>
              <ProgressBar value={total ? done / total : 0} />
              <View style={styles.progressText}>
                <Text variant="muted">
                  {belt.isPending
                    ? 'Carregando técnicas…'
                    : `${done} de ${total} técnicas dominadas`}
                </Text>
                <Text weight="semibold" size={13}>
                  {total ? Math.round((done / total) * 100) : 0}%
                </Text>
              </View>
            </View>
            <PrimaryButton
              label="Continuar estudando"
              height={52}
              icon={<ArrowRight size={18} color={colors.ink} />}
              onPress={() => router.push('/apostila')}
            />
          </View>

          {ofTheDay && (
            <View style={{ gap: 10 }}>
              <Text variant="display" size={18}>
                Técnica do dia
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/tecnica/[slug]', params: { slug: ofTheDay.slug } })
                }
                style={({ pressed }) => [styles.daily, pressed && { opacity: 0.8 }]}
              >
                <View style={styles.thumb}>
                  {ofTheDay.thumbUrl ? (
                    <Image
                      source={{ uri: ofTheDay.thumbUrl }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                  ) : null}
                  <View style={styles.play}>
                    <Play size={16} color={colors.ink} fill={colors.ink} />
                  </View>
                  {formatDuration(ofTheDay.videoDurationMs) && (
                    <Text weight="semibold" size={10} style={styles.duration}>
                      {formatDuration(ofTheDay.videoDurationMs)}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="display" size={18} numberOfLines={1}>
                    {ofTheDay.japaneseName}
                  </Text>
                  <Text variant="muted" numberOfLines={1}>
                    {ofTheDay.translation}
                  </Text>
                  <Text variant="muted" size={12} numberOfLines={1}>
                    {categoryPath(ofTheDay)}
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

          <View style={styles.shortcuts} accessibilityLabel="Atalhos">
            <Shortcut
              label="Apostila"
              icon={<BookOpen size={24} color={colors.text} />}
              onPress={() => router.push('/apostila')}
            />
            <Shortcut
              label="Glossário"
              icon={<Languages size={24} color={colors.text} />}
              onPress={() => router.push('/glossario')}
            />
            <Shortcut
              label="Favoritas"
              icon={<Heart size={24} color={colors.text} />}
              onPress={() => router.push('/favoritas')}
            />
            <Shortcut
              label="Minha faixa"
              icon={<Repeat size={24} color={colors.text} />}
              onPress={() => router.push('/faixas')}
            />
          </View>
          <AdBanner />
        </>
      )}
    </ScrollView>
  );
}

function Shortcut({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.shortcut, pressed && { opacity: 0.75 }]}
    >
      <View style={styles.shortcutIcon}>{icon}</View>
      <Text weight="medium" size={12}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: GUTTER, paddingBottom: 32, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 20,
    gap: 16,
  },
  belts: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  progressText: { flexDirection: 'row', justifyContent: 'space-between' },
  daily: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  thumb: {
    width: 92,
    height: 76,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  play: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duration: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: colors.ink,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  shortcuts: { flexDirection: 'row', justifyContent: 'space-between' },
  shortcut: { alignItems: 'center', gap: 8, width: '24%' },
  shortcutIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
