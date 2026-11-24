import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BeltPicker } from '@/components/belt-picker';
import { IconButton, StateView, Text } from '@/components/ui';
import { useJourney } from '@/lib/journey';
import { usePrefs } from '@/lib/prefs';
import { colors, GUTTER } from '@/theme';

/** "Minha faixa": troca a faixa atual (a apostila passa a mostrar a seguinte). */
export default function Faixas() {
  const insets = useSafeAreaInsets();
  const { journey, programs } = useJourney();
  const { chooseBelt } = usePrefs();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <Text variant="display" size={30}>
            Minha faixa
          </Text>
          <IconButton accessibilityLabel="Fechar" onPress={() => router.back()}>
            <X size={20} color={colors.text} />
          </IconButton>
        </View>
        <Text variant="muted" size={15}>
          Escolha a faixa que você tem hoje. A apostila mostra o conteúdo da próxima.
        </Text>
        {journey ? (
          <BeltPicker
            belts={journey.program.belts}
            selectedId={journey.current.id}
            onSelect={(belt) => {
              chooseBelt(journey.program.id, belt.id);
              router.back();
            }}
          />
        ) : (
          <StateView
            loading={programs.isPending}
            error={programs.error}
            onRetry={() => programs.refetch()}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: GUTTER, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
