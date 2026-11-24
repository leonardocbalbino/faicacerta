import type { TimelineEvent } from '@faixa-certa/shared';
import { router } from 'expo-router';
import { Image as ImageIcon, Medal as MedalIcon, Plus, Share2 } from 'lucide-react-native';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, PrimaryButton, StateView, Text } from '@/components/ui';
import { useTimeline } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { EVENT_LABEL, formatDate, journeyStats, MEDAL_HEX, shortSpan } from '@/lib/format';
import { colors, GUTTER, radii } from '@/theme';

/** Tela 05 — Minha jornada (linha do tempo do judoca). */
export default function Jornada() {
  const insets = useSafeAreaInsets();
  const { status } = useAuth();
  const timeline = useTimeline(status === 'signedIn');

  if (status !== 'signedIn') return <SignedOut top={insets.top} />;

  const events = timeline.data ?? [];
  const stats = journeyStats(events);
  const latestCardable = events.find((e) => e.type === 'GRADUATION' || e.extra?.medal);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: 20, paddingBottom: 20 }}>
            <View style={styles.header}>
              <Text variant="display" size={30}>
                Minha jornada
              </Text>
              {latestCardable && (
                <IconButton
                  accessibilityLabel="Compartilhar jornada"
                  onPress={() =>
                    router.push({ pathname: '/card', params: { eventId: latestCardable.id } })
                  }
                >
                  <Share2 size={20} color={colors.text} />
                </IconButton>
              )}
            </View>
            {events.length > 0 && (
              <View style={styles.stats}>
                <Stat value={stats.sinceIso ? shortSpan(stats.sinceIso) : '—'} label="no tatame" />
                <Stat
                  value={String(stats.graduations)}
                  label={stats.graduations === 1 ? 'graduação' : 'graduações'}
                />
                <Stat
                  value={String(stats.medals)}
                  label={stats.medals === 1 ? 'medalha' : 'medalhas'}
                />
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <EventRow event={item} last={index === events.length - 1} />
        )}
        ListEmptyComponent={
          timeline.isPending || timeline.error ? (
            <StateView
              loading={timeline.isPending}
              error={timeline.error}
              onRetry={() => timeline.refetch()}
            />
          ) : (
            <View style={styles.empty}>
              <Text variant="display" size={20} style={{ textAlign: 'center' }}>
                Sua linha do tempo começa aqui
              </Text>
              <Text variant="muted" size={14} style={{ textAlign: 'center', lineHeight: 20 }}>
                Registre o primeiro treino, cada faixa nova, campeonatos e seminários.
              </Text>
            </View>
          )
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Adicionar marco"
        onPress={() => router.push('/marco')}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
      >
        <Plus size={20} color={colors.ink} strokeWidth={3} />
        <Text weight="bold" size={15} color={colors.ink}>
          Novo marco
        </Text>
      </Pressable>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="display" size={24} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text variant="muted" size={12}>
        {label}
      </Text>
    </View>
  );
}

function EventRow({ event, last }: { event: TimelineEvent; last: boolean }) {
  const meta = `${formatDate(event.date)} · ${EVENT_LABEL[event.type]}`;
  const open = () => router.push({ pathname: '/marco', params: { id: event.id } });
  const medal = event.extra?.medal ?? null;

  if (event.type === 'GRADUATION' && event.belt) {
    const color = event.belt.colors[0] ?? colors.lime;
    const dark = isDark(color);
    const ink = dark ? colors.text : colors.ink;
    return (
      <View style={styles.item}>
        <Rail last={last}>
          <View
            style={[
              styles.dotBig,
              { backgroundColor: color, shadowColor: color, borderColor: colors.ink },
              dark && { borderColor: colors.borderStrong },
            ]}
          />
        </Rail>
        <Pressable
          onPress={open}
          style={[styles.gradCard, { backgroundColor: color }, dark && styles.darkCard]}
        >
          <Text weight="bold" size={12} color={ink} style={styles.caps}>
            {meta}
          </Text>
          <Text variant="display" size={24} color={ink} style={{ lineHeight: 25 }}>
            {event.title}
          </Text>
          <View style={styles.cardActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/card', params: { eventId: event.id } })}
              style={styles.cardButton}
            >
              <Share2 size={16} color={colors.text} />
              <Text weight="semibold" size={13}>
                Gerar card para stories
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Card com foto"
              onPress={() => router.push({ pathname: '/card-foto', params: { eventId: event.id } })}
              style={[styles.cardButton, { paddingHorizontal: 12 }]}
            >
              <ImageIcon size={16} color={colors.text} />
            </Pressable>
          </View>
        </Pressable>
      </View>
    );
  }

  const ring = medal ? MEDAL_HEX[medal] : event.type === 'SEMINAR' ? colors.info : colors.textMuted;
  const subtitle = [
    event.extra?.category && `Categoria ${event.extra.category}`,
    event.extra?.fights && `${event.extra.fights} lutas`,
    event.description,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={styles.item}>
      <Rail last={last}>
        <View style={[styles.dot, { borderColor: ring }]}>
          {medal && <MedalIcon size={14} color={ring} />}
        </View>
      </Rail>
      <Pressable onPress={open} style={styles.eventCard}>
        <Text variant="muted" size={12}>
          {meta}
        </Text>
        <Text weight="bold" size={16}>
          {event.title}
        </Text>
        {subtitle ? (
          <Text variant="muted" size={13} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {medal && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/card', params: { eventId: event.id } })}
            style={[styles.cardButton, { backgroundColor: colors.surfaceRaised, marginTop: 6 }]}
          >
            <Share2 size={16} color={colors.text} />
            <Text weight="semibold" size={13}>
              Gerar card
            </Text>
          </Pressable>
        )}
      </Pressable>
    </View>
  );
}

function Rail({ children, last }: { children: React.ReactNode; last: boolean }) {
  return (
    <View style={styles.rail}>
      {children}
      {!last && <View style={styles.line} />}
    </View>
  );
}

function SignedOut({ top }: { top: number }) {
  return (
    <View style={[styles.screen, { paddingTop: top + 16, paddingHorizontal: GUTTER }]}>
      <Text variant="display" size={30}>
        Minha jornada
      </Text>
      <View style={styles.signedOut}>
        <View style={{ gap: 14 }} aria-hidden>
          <View style={[styles.previewStripe, { backgroundColor: '#FACC15' }]} />
          <View style={[styles.previewStripe, { backgroundColor: '#FB923C', marginLeft: 40 }]} />
          <View style={[styles.previewStripe, { backgroundColor: colors.lime, marginLeft: 80 }]} />
        </View>
        <Text variant="display" size={26} style={{ lineHeight: 28 }}>
          Guarde cada faixa, campeonato e seminário.
        </Text>
        <Text variant="muted" size={15} style={{ lineHeight: 22 }}>
          Com uma conta, sua linha do tempo e seu progresso ficam salvos e você gera cards para
          postar nos stories.
        </Text>
        <PrimaryButton label="Entrar ou criar conta" onPress={() => router.push('/entrar')} />
      </View>
    </View>
  );
}

function isDark(hex: string): boolean {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 90;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: GUTTER, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 2,
  },
  item: { flexDirection: 'row', gap: 14 },
  rail: { width: 28, alignItems: 'center' },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 4 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotBig: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 4,
  },
  gradCard: { flex: 1, borderRadius: 20, padding: 16, gap: 10, marginBottom: 14 },
  darkCard: { borderWidth: 1, borderColor: colors.borderStrong },
  caps: { textTransform: 'uppercase', letterSpacing: 0.7 },
  cardActions: { flexDirection: 'row', gap: 8 },
  cardButton: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  eventCard: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
    marginBottom: 14,
  },
  empty: { paddingVertical: 40, gap: 10, alignItems: 'center' },
  fab: {
    position: 'absolute',
    right: GUTTER,
    bottom: 20,
    height: 56,
    paddingHorizontal: 20,
    borderRadius: radii.lg,
    backgroundColor: colors.lime,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  signedOut: { flex: 1, justifyContent: 'center', gap: 18, paddingBottom: 40 },
  previewStripe: { height: 40, borderRadius: 10, marginRight: -GUTTER },
});
