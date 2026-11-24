import type { Medal, TimelineEventInput, TimelineEventType } from '@faixa-certa/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BeltPicker } from '@/components/belt-picker';
import { DateField, FormError, TextField } from '@/components/form';
import { Chip, IconButton, PrimaryButton, SecondaryButton, Text } from '@/components/ui';
import { errorMessage, useDeleteTimelineEvent, useSaveTimelineEvent, useTimeline } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { EVENT_LABEL, MEDAL_LABEL, todayIso } from '@/lib/format';
import { beltLabel, useJourney } from '@/lib/journey';
import { usePrefs } from '@/lib/prefs';
import { colors, GUTTER } from '@/theme';

const TYPES: TimelineEventType[] = [
  'GRADUATION',
  'COMPETITION',
  'SEMINAR',
  'ACADEMY_CHANGE',
  'MILESTONE',
];
const MEDALS: (Medal | null)[] = ['GOLD', 'SILVER', 'BRONZE', null];

/** Novo marco (ou edição) na linha do tempo. */
export default function Marco() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { status } = useAuth();
  const timeline = useTimeline(status === 'signedIn');
  const existing = id ? timeline.data?.find((e) => e.id === id) : undefined;
  const { journey } = useJourney();
  const { chooseBelt, currentBeltId } = usePrefs();
  const save = useSaveTimelineEvent();
  const remove = useDeleteTimelineEvent();

  const [type, setType] = useState<TimelineEventType>('GRADUATION');
  const [date, setDate] = useState<string | null>(todayIso());
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [beltId, setBeltId] = useState<string | null>(null);
  const [medal, setMedal] = useState<Medal | null>(null);
  const [category, setCategory] = useState('');
  const [fights, setFights] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Preenche ao editar.
  useEffect(() => {
    if (!existing) return;
    setType(existing.type);
    setDate(existing.date);
    setTitle(existing.title);
    setTitleTouched(true);
    setBeltId(existing.belt?.id ?? null);
    setMedal(existing.extra?.medal ?? null);
    setCategory(existing.extra?.category ?? '');
    setFights(existing.extra?.fights ? String(existing.extra.fights) : '');
    setDescription(existing.description ?? '');
  }, [existing]);

  const belts = journey?.program.belts ?? [];
  const belt = belts.find((b) => b.id === beltId);

  // Sugestão de título enquanto o usuário não escreve o próprio.
  const suggested = useMemo(() => {
    if (type === 'GRADUATION' && belt) return `Virei ${beltLabel(belt.name).toLowerCase()}`;
    if (type === 'COMPETITION' && medal) return `${MEDAL_LABEL[medal]} no campeonato`;
    if (type === 'MILESTONE') return 'Primeiro treino';
    return '';
  }, [type, belt, medal]);
  const effectiveTitle = titleTouched ? title : title || suggested;

  const submit = async () => {
    setError(null);
    if (!date) return setError('Escolha a data.');
    if (effectiveTitle.trim().length < 2) return setError('Dê um título ao marco.');
    if (type === 'GRADUATION' && !beltId) return setError('Escolha a faixa conquistada.');
    const input: TimelineEventInput = {
      type,
      date,
      title: effectiveTitle.trim(),
      description: description.trim() || null,
      beltId: type === 'GRADUATION' ? beltId : null,
      extra:
        type === 'COMPETITION'
          ? {
              medal,
              category: category.trim() || null,
              fights: fights ? Number.parseInt(fights, 10) || null : null,
            }
          : null,
    };
    try {
      await save.mutateAsync({ id, input });
      // Graduação nova numa faixa acima da atual: oferece atualizar.
      const current = belts.find((b) => b.id === currentBeltId);
      if (
        !id &&
        type === 'GRADUATION' &&
        belt &&
        journey &&
        (!current || belt.order > current.order)
      ) {
        Alert.alert(
          'Atualizar sua faixa?',
          `Sua faixa atual passa a ser ${belt.name}, e a apostila mostra a próxima.`,
          [
            { text: 'Agora não', style: 'cancel', onPress: () => router.back() },
            {
              text: 'Atualizar',
              onPress: () => {
                chooseBelt(journey.program.id, belt.id);
                router.back();
              },
            },
          ],
        );
        return;
      }
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const confirmDelete = () =>
    id &&
    Alert.alert('Apagar marco?', 'Ele sai da sua linha do tempo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync(id);
            router.back();
          } catch (e) {
            setError(errorMessage(e));
          }
        },
      },
    ]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text variant="display" size={28}>
            {id ? 'Editar marco' : 'Novo marco'}
          </Text>
          <IconButton accessibilityLabel="Fechar" onPress={() => router.back()}>
            <X size={20} color={colors.text} />
          </IconButton>
        </View>

        <FormError message={error} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {TYPES.map((t) => (
            <Chip key={t} label={EVENT_LABEL[t]} active={type === t} onPress={() => setType(t)} />
          ))}
        </ScrollView>

        <DateField label="Data" value={date} onChange={setDate} />

        {type === 'GRADUATION' && (
          <View style={{ gap: 8 }}>
            <Text weight="semibold" size={13} color={colors.textMuted}>
              Faixa conquistada
            </Text>
            <BeltPicker belts={belts} selectedId={beltId} onSelect={(b) => setBeltId(b.id)} />
          </View>
        )}

        {type === 'COMPETITION' && (
          <>
            <View style={{ gap: 8 }}>
              <Text weight="semibold" size={13} color={colors.textMuted}>
                Resultado
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {MEDALS.map((m) => (
                  <Chip
                    key={m ?? 'none'}
                    label={m ? MEDAL_LABEL[m] : 'Sem medalha'}
                    active={medal === m}
                    onPress={() => setMedal(m)}
                  />
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 2 }}>
                <TextField
                  label="Categoria"
                  value={category}
                  onChangeText={setCategory}
                  placeholder="ex.: sub-18 -66kg"
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Lutas"
                  value={fights}
                  onChangeText={(v) => setFights(v.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </>
        )}

        <TextField
          label="Título"
          value={effectiveTitle}
          onChangeText={(v) => {
            setTitle(v);
            setTitleTouched(true);
          }}
          placeholder="Como você quer lembrar"
        />
        <TextField
          label="Observação (opcional)"
          value={description}
          onChangeText={setDescription}
          multiline
          style={{ height: 96, paddingTop: 12, textAlignVertical: 'top' }}
        />

        <PrimaryButton
          label={save.isPending ? 'Salvando…' : 'Salvar'}
          onPress={submit}
          disabled={save.isPending}
        />
        {id && (
          <SecondaryButton
            label="Apagar marco"
            onPress={confirmDelete}
            style={{ borderColor: colors.danger }}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: GUTTER, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
