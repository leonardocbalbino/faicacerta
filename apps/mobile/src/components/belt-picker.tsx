import type { CatalogBelt } from '@faixa-certa/shared';
import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radii } from '@/theme';
import { BeltSwatch, Text } from './ui';

/** Grade de faixas em duas colunas (onboarding e "Minha faixa"). */
export function BeltPicker({
  belts,
  selectedId,
  onSelect,
}: {
  belts: CatalogBelt[];
  selectedId: string | null;
  onSelect: (belt: CatalogBelt) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Faixa atual" style={styles.grid}>
      {belts.map((belt) => {
        const checked = belt.id === selectedId;
        return (
          <Pressable
            key={belt.id}
            accessibilityRole="radio"
            accessibilityState={{ checked }}
            accessibilityLabel={belt.name}
            onPress={() => onSelect(belt)}
            style={({ pressed }) => [
              styles.option,
              checked && styles.optionChecked,
              pressed && { opacity: 0.8 },
            ]}
          >
            <BeltSwatch colors={belt.colors} width={30} height={12} />
            <Text weight="semibold" size={15} style={{ flex: 1 }} numberOfLines={1}>
              {belt.name}
            </Text>
            {checked && <Check size={18} color={colors.lime} strokeWidth={3} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: {
    width: '48.5%',
    flexGrow: 1,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  optionChecked: {
    borderColor: colors.lime,
    borderWidth: 2,
    backgroundColor: colors.surfaceRaised,
  },
});
