import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { formatDate, fromIsoDate, toIsoDate } from '@/lib/format';
import { colors, fonts, radii } from '@/theme';
import { Text } from './ui';

export function TextField({
  label,
  error,
  hint,
  style,
  ...props
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text weight="semibold" size={13} color={colors.textMuted}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.textSubtle}
        accessibilityLabel={label}
        {...props}
        style={[styles.input, error ? { borderColor: colors.danger } : null, style]}
      />
      {error ? (
        <Text size={12} color={colors.danger}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="muted" size={12}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** Campo de data (AAAA-MM-DD). No Android abre o calendário nativo; no iOS, inline. */
export function DateField({
  label,
  value,
  onChange,
  maximumDate = new Date(),
  error,
}: {
  label: string;
  value: string | null;
  onChange: (iso: string) => void;
  maximumDate?: Date;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text weight="semibold" size={13} color={colors.textMuted}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatDate(value) : 'escolher'}`}
        onPress={() => setOpen((o) => !o)}
        style={[styles.input, styles.date, error ? { borderColor: colors.danger } : null]}
      >
        <Text color={value ? colors.text : colors.textSubtle}>
          {value ? formatDate(value) : 'Escolher data'}
        </Text>
        <CalendarDays size={18} color={colors.textMuted} />
      </Pressable>
      {open && (
        <DateTimePicker
          value={value ? fromIsoDate(value) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={maximumDate}
          themeVariant="dark"
          accentColor={colors.lime}
          locale="pt-BR"
          onChange={(event, date) => {
            if (Platform.OS === 'android') setOpen(false);
            if (event.type === 'set' && date) onChange(toIsoDate(date));
          }}
        />
      )}
      {error ? (
        <Text size={12} color={colors.danger}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.checkRow}
    >
      <View
        style={[styles.box, checked && { backgroundColor: colors.lime, borderColor: colors.lime }]}
      >
        {checked && (
          <Text weight="bold" size={14} color={colors.ink}>
            ✓
          </Text>
        )}
      </View>
      <Text size={14} style={{ flex: 1, lineHeight: 20 }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Mensagem de erro do formulário (topo ou rodapé). */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.formError}>
      <Text size={14} color={colors.dangerText}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  date: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checkRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: 44 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  formError: {
    backgroundColor: colors.dangerSurface,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
