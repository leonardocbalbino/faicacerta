import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useState, type ComponentRef, type RefObject } from 'react';
import { Alert, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import type { CardData } from '@/components/story-card';
import { useTimeline } from './api';
import { useAuth } from './auth';
import { journeyStats, longSpan, shortName, shortSpan } from './format';
import { usePrefs } from './prefs';

/** Dados do card a partir do marco: nome, tempo de tatame e números para o card com foto. */
export function useCardData(eventId: string | undefined) {
  const { user, status } = useAuth();
  const { masteredIds } = usePrefs();
  const timeline = useTimeline(status === 'signedIn');
  const events = timeline.data ?? [];
  const event = events.find((e) => e.id === eventId);
  const stats = journeyStats(events);

  const data: CardData | null =
    event && user
      ? {
          event,
          name: shortName(user.name),
          tatame: stats.sinceIso ? `${longSpan(stats.sinceIso)} de tatame` : null,
        }
      : null;

  // Números disponíveis para o card com foto.
  const available = [
    { key: 'tecnicas', label: 'Técnicas', value: String(masteredIds.length) },
    event
      ? {
          key: 'faixa',
          label: event.type === 'GRADUATION' ? 'Na faixa' : 'Desde',
          value: shortSpan(event.date),
        }
      : null,
    stats.sinceIso ? { key: 'tatame', label: 'Tatame', value: shortSpan(stats.sinceIso) } : null,
    { key: 'graduacoes', label: 'Graduações', value: String(stats.graduations) },
  ].filter((s): s is { key: string; label: string; value: string } => s !== null);

  return { data, available, loading: timeline.isPending };
}

/** Gera o PNG do card (na resolução final) e salva na galeria ou abre o compartilhamento. */
export function useCardExport(
  ref: RefObject<ComponentRef<typeof View> | null>,
  size: { width: number; height: number },
) {
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);

  const capture = () =>
    captureRef(ref, {
      format: 'png',
      quality: 1,
      width: size.width,
      height: size.height,
      result: 'tmpfile',
    });

  const save = async () => {
    setBusy('save');
    try {
      const { granted } = await MediaLibrary.requestPermissionsAsync(true);
      if (!granted) {
        Alert.alert('Sem permissão', 'Permita o acesso às fotos nos Ajustes para salvar o card.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(await capture());
      Alert.alert('Salvo!', 'O card está na sua galeria.');
    } catch {
      Alert.alert('Não deu para salvar', 'Tente de novo.');
    } finally {
      setBusy(null);
    }
  };

  /** Abre o menu de compartilhar do sistema (Instagram, WhatsApp...). */
  const share = async () => {
    setBusy('share');
    try {
      const uri = await capture();
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Compartilhar indisponível', 'Use "Salvar imagem" e poste pela galeria.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: 'Postar nos stories',
      });
    } catch {
      /* o usuário fechou o menu */
    } finally {
      setBusy(null);
    }
  };

  return { save, share, busy };
}
