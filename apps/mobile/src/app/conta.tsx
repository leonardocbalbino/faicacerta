import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormError, TextField } from '@/components/form';
import { BeltSwatch, IconButton, PrimaryButton, SecondaryButton, Text } from '@/components/ui';
import { API_URL, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { beltLabel, useJourney } from '@/lib/journey';
import { colors, GUTTER, radii } from '@/theme';

/** Minha conta: perfil, faixa, sair e excluir a conta. */
export default function Conta() {
  const insets = useSafeAreaInsets();
  const { user, status, updateProfile, signOut, deleteAccount } = useAuth();
  const { journey } = useJourney();
  const [name, setName] = useState(user?.name ?? '');
  const [academy, setAcademy] = useState(user?.academyName ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (status === 'signedOut') router.replace('/entrar');
  }, [status]);

  if (!user) return null;

  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      await updateProfile({ name, academyName: academy.trim() || null });
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = () =>
    Alert.alert(
      'Excluir conta?',
      'Sua conta, seu progresso, favoritos e linha do tempo serão apagados para sempre. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
              router.replace('/');
            } catch (e) {
              setDeleting(false);
              Alert.alert('Não foi possível excluir', errorMessage(e));
            }
          },
        },
      ],
    );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <IconButton accessibilityLabel="Voltar" onPress={() => router.back()}>
            <ChevronLeft size={22} color={colors.text} />
          </IconButton>
          <Text variant="display" size={30}>
            Minha conta
          </Text>
        </View>

        <Text variant="muted">{user.email ?? 'Conta Apple (e-mail oculto)'}</Text>

        <FormError message={error} />
        <TextField
          label="Nome"
          value={name}
          onChangeText={(v) => {
            setName(v);
            setSaved(false);
          }}
        />
        <TextField
          label="Academia (opcional)"
          value={academy}
          onChangeText={(v) => {
            setAcademy(v);
            setSaved(false);
          }}
          placeholder="Onde você treina"
        />
        <PrimaryButton
          label={saved ? 'Salvo ✓' : busy ? 'Salvando…' : 'Salvar'}
          onPress={save}
          disabled={busy || saved}
          height={52}
        />

        {journey && (
          <Pressable
            style={styles.row}
            onPress={() => router.push('/faixas')}
            accessibilityRole="button"
          >
            <BeltSwatch colors={journey.current.colors} />
            <View style={{ flex: 1 }}>
              <Text weight="semibold">{beltLabel(journey.current.name)}</Text>
              <Text variant="muted" size={12}>
                Faixa atual · toque para trocar
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </Pressable>
        )}

        <Pressable
          style={styles.row}
          onPress={() => router.push('/sem-anuncios')}
          accessibilityRole="button"
        >
          <View style={{ flex: 1 }}>
            <Text weight="semibold">Sem anúncios</Text>
            <Text variant="muted" size={12}>
              {user.entitlements.includes('NO_ADS')
                ? 'Ativo nesta conta'
                : 'Comprar ou restaurar compra'}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </Pressable>

        <Pressable
          style={styles.row}
          onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/privacidade/`)}
        >
          <Text style={{ flex: 1 }}>Política de privacidade</Text>
          <ExternalLink size={18} color={colors.textMuted} />
        </Pressable>
        <Pressable
          style={styles.row}
          onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/termos/`)}
        >
          <Text style={{ flex: 1 }}>Termos de uso</Text>
          <ExternalLink size={18} color={colors.textMuted} />
        </Pressable>

        <SecondaryButton
          label="Sair da conta"
          onPress={async () => {
            await signOut();
            router.replace('/');
          }}
        />

        <View style={styles.danger}>
          <Text weight="bold" color={colors.dangerStrong}>
            Excluir conta
          </Text>
          <Text size={13} color={colors.dangerText} style={{ lineHeight: 19 }}>
            Apaga sua conta e todos os seus dados (progresso, favoritos e linha do tempo). Para
            confirmar, digite EXCLUIR.
          </Text>
          <TextField
            label="Confirmação"
            value={confirm}
            onChangeText={setConfirm}
            autoCapitalize="characters"
            placeholder="EXCLUIR"
          />
          <SecondaryButton
            label={deleting ? 'Excluindo…' : 'Excluir minha conta'}
            disabled={confirm.trim() !== 'EXCLUIR' || deleting}
            onPress={remove}
            style={{ borderColor: colors.danger, opacity: confirm.trim() === 'EXCLUIR' ? 1 : 0.5 }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: GUTTER, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: {
    minHeight: 60,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  danger: {
    marginTop: 12,
    gap: 12,
    padding: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.dangerSurface,
  },
});
