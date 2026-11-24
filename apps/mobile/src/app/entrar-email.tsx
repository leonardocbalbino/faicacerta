import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormError, TextField } from '@/components/form';
import { IconButton, PrimaryButton, Text } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { api, unwrap } from '@/lib/http';
import { colors, GUTTER } from '@/theme';

/** Entrar com e-mail e senha (e "esqueci a senha"). */
export default function EntrarEmail() {
  const insets = useSafeAreaInsets();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const finish = () => {
    if (from === 'onboarding') router.replace('/');
    else router.dismissTo('/');
  };

  const submit = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await signInWithEmail(email.trim(), password);
      finish();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Digite seu e-mail acima e toque de novo em "Esqueci a senha".');
      return;
    }
    try {
      await unwrap(api.POST('/v1/auth/password/forgot', { body: { email: email.trim() } }));
      setInfo('Se o e-mail estiver cadastrado, enviamos um link para criar uma nova senha.');
    } catch (e) {
      setError(errorMessage(e));
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
          Entrar com e-mail
        </Text>

        <FormError message={error} />
        {info ? (
          <View style={styles.info}>
            <Text size={14} color={colors.success}>
              {info}
            </Text>
          </View>
        ) : null}

        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
        />
        <TextField
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <Pressable accessibilityRole="button" onPress={forgot} style={styles.link}>
          <Text weight="semibold" size={14} color={colors.textMuted}>
            Esqueci a senha
          </Text>
        </Pressable>

        <PrimaryButton
          label={busy ? 'Entrando…' : 'Entrar'}
          onPress={submit}
          disabled={busy || !email || !password}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/cadastro', params: from ? { from } : {} })}
          style={styles.link}
        >
          <Text size={15}>
            Não tem conta?{' '}
            <Text weight="bold" size={15} color={colors.lime}>
              Criar conta
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: GUTTER, paddingBottom: 40, gap: 18 },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  info: { backgroundColor: colors.successSurface, borderRadius: 14, padding: 14 },
});
