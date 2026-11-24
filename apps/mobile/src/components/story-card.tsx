import type { TimelineEvent } from '@faixa-certa/shared';
import { Image, StyleSheet, View, type ViewStyle } from 'react-native';
import { EVENT_LABEL, formatDateDots, MEDAL_HEX, MEDAL_LABEL, MEDAL_PLACE } from '@/lib/format';
import { colors, fonts } from '@/theme';
import { BrandMark, Text } from './ui';

export type CardTheme = 'color' | 'dark' | 'lime';
export type CardFormat = 'stories' | 'feed';
export type PhotoTemplate = 'classic' | 'diagonal' | 'top';

/** Proporção de cada formato (largura / altura): 1080×1920 e 1080×1350. */
export const FORMAT_RATIO: Record<CardFormat, number> = { stories: 9 / 16, feed: 4 / 5 };
export const FORMAT_SIZE: Record<CardFormat, { width: number; height: number }> = {
  stories: { width: 1080, height: 1920 },
  feed: { width: 1080, height: 1350 },
};

export interface CardData {
  event: TimelineEvent;
  /** "Lucas M." */
  name: string;
  /** "2 anos de tatame" (ou null sem marco inicial). */
  tatame: string | null;
}

/** Cor principal da conquista: faixa nova ou medalha; lima nos demais marcos. */
export function achievementColor(event: TimelineEvent): string {
  if (event.type === 'GRADUATION' && event.belt?.colors[0]) return event.belt.colors[0];
  if (event.extra?.medal) return MEDAL_HEX[event.extra.medal];
  return colors.lime;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

/** Texto do card para a conquista. */
function headline(event: TimelineEvent): { kicker: string; big: string; sub: string | null } {
  if (event.type === 'GRADUATION' && event.belt) {
    return { kicker: 'Nova faixa', big: `Faixa\n${event.belt.name.toLowerCase()}`, sub: null };
  }
  if (event.type === 'COMPETITION' && event.extra?.medal) {
    return {
      kicker: 'Pódio',
      big: MEDAL_LABEL[event.extra.medal],
      sub: [event.title, event.extra.category].filter(Boolean).join(' · '),
    };
  }
  return { kicker: EVENT_LABEL[event.type], big: event.title, sub: event.description };
}

/** Card sem foto (telas 12 e 21). `width` em pontos; a altura vem do formato. */
export function StoryCard({
  data,
  theme,
  format,
  width,
}: {
  data: CardData;
  theme: CardTheme;
  format: CardFormat;
  width: number;
}) {
  const s = width / 270; // medidas do layout pensadas para 270 de largura
  const accent = achievementColor(data.event);
  const bg = theme === 'color' ? accent : theme === 'lime' ? colors.lime : colors.ink;
  const ink = luminance(bg) > 0.45 ? colors.ink : colors.text;
  const highlight = theme === 'dark' ? accent : ink;
  const { kicker, big, sub } = headline(data.event);
  const medal = data.event.extra?.medal;
  const belt = data.event.type === 'GRADUATION' ? data.event.belt : null;

  return (
    <View
      style={[
        styles.card,
        {
          width,
          height: width / FORMAT_RATIO[format],
          backgroundColor: bg,
          borderRadius: 24 * s,
          padding: 22 * s,
        },
        theme === 'dark' && { borderWidth: 1, borderColor: colors.borderStrong },
      ]}
    >
      <View style={styles.row}>
        <Text
          weight="bold"
          size={11 * s}
          color={theme === 'dark' ? accent : ink}
          style={styles.caps}
        >
          {kicker}
        </Text>
        <Text
          weight="bold"
          size={11 * s}
          color={theme === 'dark' ? accent : ink}
          style={styles.caps}
        >
          {formatDateDots(data.event.date)}
        </Text>
      </View>

      <View style={{ gap: 14 * s }}>
        {belt ? (
          <View
            style={[
              styles.belt,
              {
                height: 32 * s,
                borderRadius: 6 * s,
                borderWidth: 3 * s,
                backgroundColor: belt.colors[0],
                borderColor: theme === 'color' ? colors.ink : belt.colors[0],
              },
            ]}
          >
            <View
              style={{
                width: 28 * s,
                height: 44 * s,
                borderRadius: 5 * s,
                borderWidth: 3 * s,
                borderColor: theme === 'color' ? colors.ink : colors.ink,
                backgroundColor: belt.colors[1] ?? belt.colors[0],
              }}
            />
          </View>
        ) : medal ? (
          <View
            style={{
              width: 112 * s,
              height: 112 * s,
              borderRadius: 56 * s,
              backgroundColor: MEDAL_HEX[medal],
              borderWidth: 6 * s,
              borderColor: colors.text,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: fonts.display, fontSize: 40 * s, color: colors.ink }}>
              {MEDAL_PLACE[medal]}
            </Text>
          </View>
        ) : null}
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: (big.length > 18 ? 40 : 52) * s,
            lineHeight: (big.length > 18 ? 38 : 47) * s,
            color: highlight,
            textTransform: 'uppercase',
          }}
        >
          {big}
        </Text>
        <Text weight="semibold" size={14 * s} color={ink}>
          {[data.name, sub ?? data.tatame].filter(Boolean).join(' · ')}
        </Text>
      </View>

      <Brand scale={s} ink={ink} bg={bg} />
    </View>
  );
}

/** Card com a foto do usuário de fundo (telas 22 e 23). */
export function PhotoCard({
  data,
  photoUri,
  template,
  stats,
  width,
}: {
  data: CardData;
  photoUri: string | null;
  template: PhotoTemplate;
  stats: { label: string; value: string }[];
  width: number;
}) {
  const s = width / 236;
  const accent = achievementColor(data.event);
  const accentInk = luminance(accent) > 0.45 ? colors.ink : colors.text;
  const { kicker, big } = headline(data.event);
  const date = formatDateDots(data.event.date);

  const frame: ViewStyle = { width, height: width * (16 / 9), borderRadius: 22 * s };
  return (
    <View style={[styles.photoCard, frame]}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noPhoto]}>
          <Text size={12 * s} color="#FFFFFF80">
            Escolha uma foto
          </Text>
        </View>
      )}

      {template === 'classic' && (
        <>
          <View style={[styles.gradientBottom, { height: '55%' }]} />
          <View
            style={[
              styles.photoBottom,
              { left: 18 * s, right: 18 * s, bottom: 18 * s, gap: 12 * s },
            ]}
          >
            <Text weight="bold" size={10 * s} color="#FFF" style={styles.caps}>
              {kicker} · {date}
            </Text>
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 36 * s,
                lineHeight: 33 * s,
                color: '#FFF',
                textTransform: 'uppercase',
              }}
            >
              {big}
            </Text>
            {stats.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 14 * s }}>
                {stats.map((st) => (
                  <PhotoStat key={st.label} {...st} s={s} size={18} />
                ))}
              </View>
            )}
            <Brand scale={s * 0.8} ink="#FFF" bg="#000" />
          </View>
        </>
      )}

      {template === 'diagonal' && (
        <>
          <View
            style={{
              position: 'absolute',
              left: -40 * s,
              right: -40 * s,
              top: '52%',
              height: 74 * s,
              backgroundColor: accent,
              transform: [{ rotate: '-10deg' }],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 30 * s,
                color: accentInk,
                textTransform: 'uppercase',
              }}
            >
              {big.replace('\n', ' ')}
            </Text>
          </View>
          <View style={[styles.diagonalFooter, { left: 18 * s, right: 18 * s, bottom: 18 * s }]}>
            <Text weight="bold" size={12 * s} color="#FFF" style={styles.shadow}>
              {data.name} · {date}
            </Text>
            <BrandMark size={26 * s} ink="#FFF" knot="#000" />
          </View>
        </>
      )}

      {template === 'top' && (
        <>
          <View style={[styles.gradientTop, { height: '48%' }]} />
          <View
            style={{ position: 'absolute', left: 18 * s, right: 18 * s, top: 18 * s, gap: 10 * s }}
          >
            <Text weight="bold" size={10 * s} color={colors.lime} style={styles.caps}>
              {kicker}
            </Text>
            {stats.map((st) => (
              <PhotoStat key={st.label} {...st} s={s} size={22} />
            ))}
          </View>
          <View style={{ position: 'absolute', right: 16 * s, bottom: 18 * s }}>
            <BrandMark size={28 * s} ink="#FFF" knot="#000" />
          </View>
        </>
      )}
    </View>
  );
}

function PhotoStat({
  label,
  value,
  s,
  size,
}: {
  label: string;
  value: string;
  s: number;
  size: number;
}) {
  return (
    <View>
      <Text size={9 * s} color="#FFFFFFB3" style={styles.caps}>
        {label}
      </Text>
      <Text style={{ fontFamily: fonts.display, fontSize: size * s, color: '#FFF' }}>{value}</Text>
    </View>
  );
}

function Brand({ scale, ink, bg }: { scale: number; ink: string; bg: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * scale }}>
      <BrandMark size={22 * scale} ink={ink} knot={bg} />
      <Text style={{ fontFamily: fonts.display, fontSize: 16 * scale, color: ink }}>
        faixacerta
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { justifyContent: 'space-between', overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  caps: { textTransform: 'uppercase', letterSpacing: 1.1 },
  belt: { alignItems: 'center', justifyContent: 'center' },
  photoCard: { overflow: 'hidden', backgroundColor: '#3A3F47' },
  noPhoto: { alignItems: 'center', justifyContent: 'center' },
  gradientBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'linear-gradient(to top, #000000D9, #00000000)',
  },
  gradientTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundImage: 'linear-gradient(to bottom, #000000B3, #00000000)',
  },
  photoBottom: { position: 'absolute' },
  diagonalFooter: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shadow: { textShadowColor: '#000000AA', textShadowRadius: 6 },
});
