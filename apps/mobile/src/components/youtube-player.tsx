import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Text } from '@/components/ui';
import { colors } from '@/theme';

/**
 * Origem enviada ao YouTube. O player embutido exige uma origem/referer
 * válido (sem ela o vídeo falha com "erro de configuração do player").
 */
const ORIGIN = 'https://app-faixacerta.com.br';

function playerHtml(id: string): string {
  // Montado à mão: o URLSearchParams do React Native é incompleto.
  const query = `autoplay=1&playsinline=1&rel=0&modestbranding=1&hl=pt-BR&origin=${encodeURIComponent(ORIGIN)}`;
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{border:0;width:100%;height:100%}</style>
</head><body>
<iframe src="https://www.youtube-nocookie.com/embed/${id}?${query}"
  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
  referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
</body></html>`;
}

/** Player do YouTube dentro da tela, com saída para o app do YouTube se falhar. */
export function YoutubePlayer({ id, url }: { id: string; url: string }) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={styles.fallback}>
        <Text variant="muted" style={{ textAlign: 'center' }}>
          Não foi possível tocar o vídeo aqui.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => WebBrowser.openBrowserAsync(url).catch(() => undefined)}
          style={styles.fallbackButton}
        >
          <Text weight="semibold" color={colors.lime}>
            Abrir no YouTube
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        source={{ html: playerHtml(id), baseUrl: ORIGIN }}
        style={styles.web}
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        allowsPictureInPictureMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        setSupportMultipleWindows={false}
        onLoadEnd={() => setLoading(false)}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
        // Links que saem do player (logo, "assistir no YouTube") abrem fora.
        onShouldStartLoadWithRequest={(req) => {
          if (req.url === 'about:blank' || req.url.startsWith(ORIGIN)) return true;
          if (/^https:\/\/(www\.)?youtube(-nocookie)?\.com\/embed\//.test(req.url)) return true;
          if (req.isTopFrame === false) return true;
          WebBrowser.openBrowserAsync(req.url).catch(() => undefined);
          return false;
        }}
      />
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <ActivityIndicator color={colors.lime} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  fallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
    backgroundColor: '#000',
  },
  fallbackButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
});
