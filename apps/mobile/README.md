# App mobile

App Expo (SDK 58 + Expo Router) para alunos. **Etapa 3**: splash, onboarding (escolher a
faixa), início, apostila da faixa, técnica e glossário. Sem login: a faixa e as técnicas
dominadas ficam no aparelho (`src/lib/prefs.tsx`) até a Etapa 5.

O conteúdo vem do catálogo público da API (`/v1/catalog/*`), só com itens publicados no painel.

## Rodar

```bash
pnpm --filter @faixa-certa/shared build   # o app importa o pacote compilado
cd apps/mobile
npx expo start                            # usa a API de produção
EXPO_PUBLIC_API_URL=http://192.168.0.10:3000 npx expo start   # API local (IP da máquina na rede)
```

O app usa módulos nativos (vídeo, áudio), então roda num **development build**, não no Expo Go:
`eas build --profile development` (ou `npx expo run:android` / `run:ios` com Android Studio / Xcode).

No Windows, rode o Metro a partir de um caminho com `C:` maiúsculo; com `c:` o Metro gera
caminhos como `c:\C:\...` e falha ao resolver as rotas.

## Estrutura

| Pasta            | O que tem                                                         |
| ---------------- | ----------------------------------------------------------------- |
| `src/app`        | Rotas (Expo Router): `(tabs)` = Início, Apostila, Glossário       |
| `src/components` | Componentes do layout aprovado (`docs/design`)                    |
| `src/lib`        | Cliente da API (React Query), preferências locais, áudio, jornada |
| `assets`         | Ícone, ícone adaptativo do Android e splash (gerados do símbolo)  |

## Publicar nas lojas

Build e envio pelo EAS (nuvem da Expo), disparados pelo GitHub Actions
(`.github/workflows/mobile.yml`): manualmente em _Actions → Mobile (EAS)_ ou com uma tag
`mobile-v*`. Versões e números de build ficam no EAS (`appVersionSource: remote`).

Configuração única (feita uma vez):

1. `npx eas-cli@latest login` e `npx eas-cli@latest init` nesta pasta (grava o `projectId` no
   `app.json`). Commite a alteração.
2. Gerar um token em expo.dev → _Access tokens_ e salvar como secret `EXPO_TOKEN` no GitHub.
3. **iOS**: conta Apple Developer; criar o app no App Store Connect com o bundle
   `br.com.faixacerta.app`; colocar o _Apple ID_ numérico do app em `eas.json` →
   `submit.production.ios.ascAppId`. O primeiro `eas build -p ios` interativo cria os
   certificados (ou use uma chave de API do App Store Connect no EAS).
4. **Android**: conta Google Play Console; criar o app `br.com.faixacerta.app`; o **primeiro
   AAB precisa ser enviado à mão** no Play Console (exigência do Google). Depois, criar uma conta
   de serviço com acesso à API do Play, enviar o JSON ao EAS
   (`eas credentials` → Android → Google Service Account) e os envios seguintes saem sozinhos
   para a trilha interna, como rascunho.
5. Na ficha das lojas: política de privacidade em `https://app-faixacerta.com.br/privacidade`,
   categoria Educação, classificação livre, e na App Store "Dados não coletados".
