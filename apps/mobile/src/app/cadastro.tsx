import { isMinor, registerSchema } from '@faixa-certa/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Checkbox, DateField, FormError, TextField } from '@/components/form';
import { IconButton, PrimaryButton, Text } from '@/components/ui';
import { ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, GUTTER } from '@/theme';

type Field =
  | 'name'
  | 'email'
  | 'password'
  | 'birthDate'
  | 'guardian.name'
  | 'guardian.email'
  | 'guardian.consent'
  | 'guardian';

/** Criar conta com e-mail. Menores de 18 precisam do responsável e do consentimento dele. */
export default function Cadastro() {
  const insets = useSafeAreaInsets();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const minor = birthDate ? isMinor(birthDate) : false;

  const submit = async () => {
    setFormError(null);
    const input = {
      name,
      email,
      password,
      birthDate: birthDate ?? '',
      guardian: minor ? { name: guardianName, email: guardianEmail, consent } : undefined,
    };
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') as Field;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await register(parsed.data);
      if (from === 'onboarding') router.replace('/');
      else router.dismissTo('/');
    } catch (e) {
      if (e instanceof ApiError && e.fields?.length) {
        setErrors(Object.fromEntries(e.fields.map((f) => [f.path, f.message])));
      }
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        keyboardShouldPersistTaps="handled"
      >
        <IconButton accessibilityLabel="Voltar" onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.text} />
        </IconButton>
        <Text variant="display" size={32}>
          Criar conta
        </Text>

        <FormError message={formError} />

        <TextField
          label="Nome"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
          error={errors.name}
        />
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          error={errors.email}
        />
        <TextField
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          hint="Pelo menos 8 caracteres, com letras e números."
          error={errors.password}
        />
        <DateField
          label="Data de nascimento"
          value={birthDate}
          onChange={setBirthDate}
          error={errors.birthDate}
        />

        {minor && (
          <View style={styles.guardian}>
            <Text weight="bold" size={15}>
              Responsável
            </Text>
            <Text variant="muted" size={13} style={{ lineHeight: 19 }}>
              Para menores de 18 anos, precisamos do nome e do e-mail de um dos pais ou responsável,
              e do consentimento dele.
            </Text>
            <TextField
              label="Nome do responsável"
              value={guardianName}
              onChangeText={setGuardianName}
              error={errors['guardian.name']}
            />
            <TextField
              label="E-mail do responsável"
              value={guardianEmail}
              onChangeText={setGuardianEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              error={errors['guardian.email']}
            />
            <Checkbox
              checked={consent}
              onChange={setConsent}
              label="Sou o responsável (ou ele está comigo) e autorizo a criação desta conta."
            />
            {(errors['guardian.consent'] ?? errors.guardian) ? (
              <Text size={12} color={colors.danger}>
                {errors['guardian.consent'] ?? errors.guardian}
              </Text>
            ) : null}
          </View>
        )}

        <PrimaryButton label={busy ? 'Criando…' : 'Criar conta'} onPress={submit} disabled={busy} />
        <Text variant="muted" size={12} style={{ textAlign: 'center' }}>
          Ao criar a conta você aceita os Termos e a Política de privacidade.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: GUTTER, paddingBottom: 40, gap: 18 },
  guardian: {
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
