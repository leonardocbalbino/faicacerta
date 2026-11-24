import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useState, type ComponentRef, type RefObject } from 'react';
import { Alert, Platform, type View } from 'react-native';
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

  /** Abre o menu de compartilhar do sistema (Instagram, WhatsApp, "Salvar imagem"...). */
  const openShare = async (uri: string, title: string) => {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Compartilhar indisponível', 'Tente de novo mais tarde.');
      return;
    }
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: title });
  };

  const save = async () => {
    setBusy('save');
    try {
      const uri = await capture();
      // Só pede permissão de gravação. No Android ela pode não existir (o app não
      // lê a galeria); aí o menu do sistema oferece "Salvar na galeria".
      const { granted } = await MediaLibrary.requestPermissionsAsync(true).catch(() => ({
        granted: false,
      }));
      if (granted) {
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert('Salvo!', 'O card está na sua galeria.');
      } else if (Platform.OS === 'android') {
        await openShare(uri, 'Salvar imagem');
      } else {
        Alert.alert('Sem permissão', 'Permita adicionar fotos nos Ajustes para salvar o card.');
      }
    } catch {
      Alert.alert('Não deu para salvar', 'Tente de novo.');
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    setBusy('share');
    try {
      await openShare(await capture(), 'Postar nos stories');
    } catch {
      /* o usuário fechou o menu */
    } finally {
      setBusy(null);
    }
  };

  return { save, share, busy };
}
