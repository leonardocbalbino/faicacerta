/** Vídeos do YouTube ligados às técnicas (ex.: canal oficial da Kodokan). */

const ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extrai o id de 11 caracteres de um link do YouTube.
 * Aceita youtube.com/watch?v=, youtu.be/, /shorts/, /embed/, /live/ e o id puro.
 */
export function parseYoutubeId(input: string | null | undefined): string | null {
  const value = input?.trim();
  if (!value) return null;
  if (ID.test(value)) return value;

  // Sem a classe URL: o pacote roda na API, no painel e no app.
  const match = /^(?:https?:\/\/)?(?:www\.|m\.|music\.)?([^/?#]+)(\/[^?#]*)?(\?[^#]*)?/i.exec(
    value,
  );
  if (!match) return null;
  const host = match[1]!.toLowerCase();
  const parts = (match[2] ?? '').split('/').filter(Boolean);
  let id: string | undefined;
  if (host === 'youtu.be') id = parts[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (parts[0] === 'watch') id = /[?&]v=([^&]+)/.exec(match[3] ?? '')?.[1];
    else if (['shorts', 'embed', 'live', 'v'].includes(parts[0] ?? '')) id = parts[1];
  }
  return id && ID.test(id) ? id : null;
}

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

/** Miniatura 480x360 (existe para todos os vídeos). */
export function youtubeThumbUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
