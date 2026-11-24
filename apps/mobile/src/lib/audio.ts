import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useState } from 'react';

/**
 * Um único player por tela para as pronúncias (o glossário tem dezenas de
 * termos; um player por linha desperdiçaria recursos nativos).
 */
export function usePronunciation() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [url, setUrl] = useState<string | null>(null);

  const play = useCallback(
    (next: string) => {
      if (next !== url) {
        player.replace({ uri: next });
        setUrl(next);
      }
      player.seekTo(0).catch(() => undefined);
      player.play();
    },
    [player, url],
  );

  return { play, playingUrl: status.playing ? url : null };
}
