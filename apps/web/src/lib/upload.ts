import {
  MEDIA_RULES,
  mediaTypeForMime,
  type Media,
  type MediaType,
  type MediaVisibility,
  type UploadTicket,
} from '@faixa-certa/shared';
import { api, unwrap } from './api';

export class UploadValidationError extends Error {}

/** Confere tipo e tamanho no navegador, com a mesma regra da API. */
export function validateFile(file: File, accept?: MediaType[]): MediaType {
  const type = mediaTypeForMime(file.type);
  if (!type || (accept && !accept.includes(type))) {
    throw new UploadValidationError(`Formato não aceito: ${file.type || file.name}.`);
  }
  if (file.size > MEDIA_RULES[type].maxBytes) {
    const mb = Math.round(MEDIA_RULES[type].maxBytes / 1024 / 1024);
    throw new UploadValidationError(`Arquivo grande demais (limite de ${mb} MB).`);
  }
  return type;
}

/** PUT com progresso (fetch não expõe progresso de envio). */
function putWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`O storage recusou o envio (HTTP ${xhr.status}).`));
    xhr.onerror = () => reject(new Error('Falha de rede durante o envio.'));
    xhr.onabort = () => reject(new DOMException('Envio cancelado', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(file);
  });
}

export interface UploadOptions {
  visibility?: MediaVisibility;
  accept?: MediaType[];
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/**
 * Envio em três passos: pede a URL pré-assinada, envia direto ao storage e
 * confirma. Devolve a mídia já na fila de processamento.
 */
export async function uploadMedia(file: File, opts: UploadOptions = {}): Promise<Media> {
  const type = validateFile(file, opts.accept);
  const ticket = unwrap<UploadTicket>(
    await api.POST('/v1/media/upload-url', {
      body: {
        type,
        mimeType: file.type,
        sizeBytes: file.size,
        filename: file.name,
        visibility: opts.visibility ?? 'PUBLIC',
      },
    }),
  );
  await putWithProgress(
    ticket.upload.url,
    file,
    ticket.upload.headers,
    opts.onProgress ?? (() => undefined),
    opts.signal,
  );
  return unwrap<Media>(
    await api.POST('/v1/media/{id}/complete', { params: { path: { id: ticket.media.id } } }),
  );
}
