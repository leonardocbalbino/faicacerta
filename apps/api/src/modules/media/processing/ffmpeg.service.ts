import { spawn } from 'node:child_process';
import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../config/app-config.service.js';
import { parseProbe, PROBE_ARGS, type ProbeResult } from './ffmpeg-args.js';

const TIMEOUT_MS = 30 * 60 * 1000;

/** Executa ffmpeg/ffprobe do sistema (FFMPEG_PATH / FFPROBE_PATH). */
@Injectable()
export class FfmpegService {
  constructor(private readonly config: AppConfigService) {}

  async probe(input: string): Promise<ProbeResult> {
    const out = await run(this.config.get('FFPROBE_PATH'), PROBE_ARGS(input));
    return parseProbe(out.stdout);
  }

  async run(args: string[]): Promise<void> {
    await run(this.config.get('FFMPEG_PATH'), args);
  }

  /** Verifica se o ffmpeg está instalado (usado no health do worker e nos testes). */
  async isAvailable(): Promise<boolean> {
    try {
      await run(this.config.get('FFMPEG_PATH'), ['-version']);
      return true;
    } catch {
      return false;
    }
  }
}

function run(bin: string, args: string[]): Promise<{ stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), TIMEOUT_MS);
    child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
    child.stderr.on('data', (d: Buffer) => {
      // Guarda só o final do log: é onde fica o motivo do erro.
      stderr = (stderr + d.toString()).slice(-4000);
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`não foi possível executar ${bin}: ${err.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout });
      else
        reject(
          new Error(
            `${bin} saiu com código ${code}: ${stderr.trim().split('\n').slice(-3).join(' | ')}`,
          ),
        );
    });
  });
}
