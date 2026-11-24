import { Search, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, fonts, radii } from '@/theme';

// -----------------------------------------------------------------------------
// Texto
// -----------------------------------------------------------------------------

type Variant = 'body' | 'muted' | 'display' | 'label';

/** Texto com as fontes da marca. `display` = Bricolage 800; `label` = rótulo de seção. */
export function Text({
  variant = 'body',
  size,
  weight,
  color,
  style,
  ...props
}: TextProps & {
  variant?: Variant;
  size?: number;
  weight?: keyof typeof fonts;
  color?: string;
}) {
  const base = variantStyles[variant];
  return (
    <RNText
      {...props}
      style={[
        base,
        size !== undefined && { fontSize: size, lineHeight: Math.round(size * 1.25) },
        weight && { fontFamily: fonts[weight] },
        color !== undefined && { color },
        style,
      ]}
    />
  );
}

const variantStyles = StyleSheet.create({
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.text },
  muted: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  display: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 32,
    color: colors.text,
    letterSpacing: -0.4,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
});

// -----------------------------------------------------------------------------
// Botões
// -----------------------------------------------------------------------------

export function IconButton({
  children,
  style,
  round = false,
  overlay = false,
  ...props
}: PressableProps & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  round?: boolean;
  overlay?: boolean;
}) {
  return (
    <Pressable
      hitSlop={4}
      {...props}
      style={({ pressed }) => [
        styles.iconButton,
        round && { borderRadius: 22 },
        overlay && styles.iconButtonOverlay,
        pressed && styles.pressed,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  icon,
  style,
  height = 56,
  ...props
}: PressableProps & {
  label: string;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  height?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      style={({ pressed }) => [
        styles.primary,
        { height },
        props.disabled && { opacity: 0.5 },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text weight="bold" size={17} color={colors.ink}>
        {label}
      </Text>
      {icon}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  icon,
  style,
  ...props
}: PressableProps & { label: string; icon?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      style={({ pressed }) => [styles.secondary, pressed && styles.pressed, style]}
    >
      {icon}
      <Text weight="semibold" size={15}>
        {label}
      </Text>
    </Pressable>
  );
}

// -----------------------------------------------------------------------------
// Chips, badges, progresso
// -----------------------------------------------------------------------------

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : styles.chipInactive,
        pressed && styles.pressed,
      ]}
    >
      <Text weight="semibold" size={14} color={active ? colors.ink : colors.text}>
        {label}
      </Text>
    </Pressable>
  );
}

export type MasteryStatus = 'mastered' | 'studying' | 'new';

const BADGE: Record<MasteryStatus, { label: string; style: ViewStyle; color: string }> = {
  mastered: { label: 'Domino', style: { backgroundColor: colors.lime }, color: colors.ink },
  studying: {
    label: 'Estudando',
    style: { backgroundColor: colors.surfaceRaised },
    color: colors.text,
  },
  new: {
    label: 'Novo',
    style: { borderWidth: 1, borderColor: colors.borderStrong },
    color: colors.textMuted,
  },
};

export function MasteryBadge({ status }: { status: MasteryStatus }) {
  const b = BADGE[status];
  return (
    <View style={[styles.badge, b.style]}>
      <Text weight="bold" size={11} color={b.color}>
        {b.label}
      </Text>
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

// -----------------------------------------------------------------------------
// Faixa e marca
// -----------------------------------------------------------------------------

/** Amostra da faixa. Duas cores = bicolor (metade de cima / de baixo). Grande = com o nó. */
export function BeltSwatch({
  colors: beltColors,
  width = 34,
  height = 14,
  knot = false,
  style,
}: {
  colors: string[];
  width?: number | `${number}%`;
  height?: number;
  knot?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [a = colors.textMuted, b] = beltColors;
  const isDark = [a, b].some((c) => c && luminance(c) < 0.08);
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: height > 20 ? 6 : 4,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        isDark && { borderWidth: 1, borderColor: colors.borderStrong },
        style,
      ]}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: a }]} />
      {b && <View style={[styles.swatchHalf, { backgroundColor: b }]} />}
      {knot && (
        <View
          style={{
            width: height * 0.85,
            height: height * 1.15,
            borderRadius: 4,
            backgroundColor: shade(a, -0.12),
            borderWidth: 2,
            borderColor: isDark ? colors.borderStrong : colors.ink,
          }}
        />
      )}
    </View>
  );
}

/** Símbolo do Faixa Certa (o nó da faixa). */
export function BrandMark({
  size = 40,
  ink = colors.ink as string,
  knot = colors.lime as string,
}: {
  size?: number;
  ink?: string;
  knot?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Path d="M45 56 33 84" stroke={ink} strokeWidth={12} strokeLinecap="round" />
      <Path d="M55 56 67 84" stroke={ink} strokeWidth={12} strokeLinecap="round" />
      <Path d="M14 44h72" stroke={ink} strokeWidth={16} strokeLinecap="round" />
      <Rect x={38} y={29} width={24} height={31} rx={6} fill={ink} stroke={knot} strokeWidth={5} />
    </Svg>
  );
}

// -----------------------------------------------------------------------------
// Busca e estados
// -----------------------------------------------------------------------------

export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.search}>
      <Search size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        style={styles.searchInput}
      />
      {value.length > 0 && (
        <Pressable accessibilityLabel="Limpar busca" hitSlop={10} onPress={() => onChangeText('')}>
          <X size={18} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

/** Carregando, erro (com "Tentar de novo") ou vazio. */
export function StateView({
  loading,
  error,
  empty,
  onRetry,
  style,
}: {
  loading?: boolean;
  error?: unknown;
  empty?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.state, style]}>
      {loading ? (
        <ActivityIndicator color={colors.lime} />
      ) : error ? (
        <>
          <Text style={{ textAlign: 'center' }}>Não deu para carregar. Confira sua conexão.</Text>
          {onRetry && (
            <SecondaryButton label="Tentar de novo" onPress={onRetry} style={{ width: 200 }} />
          )}
        </>
      ) : (
        <Text variant="muted" style={{ textAlign: 'center' }}>
          {empty}
        </Text>
      )}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// -----------------------------------------------------------------------------

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + amount))));
  const rgb = [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)];
  return `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonOverlay: { borderWidth: 0, backgroundColor: colors.overlay },
  primary: {
    borderRadius: radii.lg,
    backgroundColor: colors.lime,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondary: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.lime },
  chipInactive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: colors.lime },
  swatchHalf: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' },
  search: {
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15, padding: 0 },
  state: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center', gap: 16 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
});
