# Fichas das lojas — Faixa Certa 1.0

Textos prontos para colar no App Store Connect e no Google Play Console. Descrevem só o que
a versão 1.0 (Etapa 3) faz: nada de simulado, turma ou offline até essas etapas saírem.
Os limites de caracteres estão anotados em cada campo e foram conferidos.

Links usados nas duas lojas:

- Política de privacidade: `https://app-faixacerta.com.br/privacidade`
- Suporte / site: `https://app-faixacerta.com.br`
- E-mail de contato: `contato@app-faixacerta.com.br` (precisa existir antes do envio)

---

## App Store (App Store Connect → Faixa Certa → Distribuição)

**Nome** (máx. 30)

```
Faixa Certa: Apostila de Judô
```

**Subtítulo** (máx. 30)

```
Estude para o exame de faixa
```

**Texto promocional** (máx. 170; pode mudar sem nova versão)

```
Escolha sua faixa e estude a apostila da próxima: técnicas com vídeo, pontos-chave, erros comuns e o glossário de japonês com pronúncia.
```

**Descrição** (máx. 4.000)

```
O Faixa Certa é a apostila digital para o seu próximo exame de graduação no judô.

Diga qual é a sua faixa hoje e o app monta a apostila da próxima, com as técnicas na ordem do exame. Marque o que você já domina e acompanhe quanto falta para estar pronto.

APOSTILA DA FAIXA
• Técnicas organizadas por grupo (nage-waza, katame-waza, ukemi e mais)
• Ordem do exame e contagem do que você já domina
• Busca que entende "osoto", "o soto" ou "o-soto-gari", com ou sem acento

CADA TÉCNICA, PASSO A PASSO
• Vídeo com câmera lenta (0,5× e 0,75×) para enxergar cada detalhe
• Passo a passo, pontos-chave e o erro comum que derruba candidatos
• O que o examinador observa
• Pronúncia do nome em japonês
• Técnicas relacionadas para estudar em sequência

GLOSSÁRIO
• Termos do dojô em japonês e português: comandos do árbitro, pontuação, uniforme e treino
• Ouça a pronúncia de cada termo
• Busque em japonês ou em português

SEU PROGRESSO
• Toque em "Já domino" e veja a barra da próxima faixa subir
• A técnica do dia sugere o que revisar
• Troque de faixa quando for aprovado

Sem cadastro e sem anúncios nesta versão: abra e comece a estudar.

O Faixa Certa é um material de apoio e não substitui as aulas e a orientação do seu professor. Os requisitos de cada exame podem variar conforme a federação e a academia.
```

**Palavras-chave** (máx. 100, separadas por vírgula, sem espaço)

```
judô,judo,exame,graduação,kodokan,nage-waza,técnicas,glossário,dojo,ukemi,japonês,arte marcial
```

**Novidades desta versão** (para a 1.0, pode deixar em branco ou usar)

```
Primeira versão: apostila por faixa, técnicas com vídeo e passo a passo, glossário com pronúncia e acompanhamento do que você já domina.
```

**Categoria**: Educação (principal), Esportes (secundária)

**Classificação etária**: responder "Nenhum" em todas as perguntas → **4+**

**Privacidade do app** (App Store Connect → Privacidade do app): **"Dados não coletados"**.
O app não tem login, análise de uso, anúncios nem SDKs de rastreamento nesta versão.

**Informações para a revisão da Apple** → Notas (máx. 4.000)

```
O app não exige login nem cadastro. Ao abrir, escolha qualquer faixa (por exemplo, "Branca") e toque em Continuar: o app mostra a apostila da faixa seguinte. Abra uma técnica para ver o conteúdo e use "Já domino" para marcar o progresso, que fica salvo apenas no aparelho. O conteúdo vem de nossa API pública (https://app-faixacerta.com.br).
```

Desmarcar "Login necessário" (não há conta de demonstração a informar).

---

## Google Play (Play Console → Faixa Certa → Presença na loja → Página principal)

**Nome do app** (máx. 30)

```
Faixa Certa: Apostila de Judô
```

**Descrição curta** (máx. 80)

```
Apostila do exame de faixa de judô: técnicas com vídeo, glossário e progresso.
```

**Descrição completa** (máx. 4.000): usar a mesma descrição da App Store acima.

**Categoria**: Educação · Tags: Esportes, Educação

**Ícone 512×512 e recurso gráfico 1024×500**: gerados em `docs/lojas/` (ver abaixo).

### Segurança dos dados (Play Console → Conteúdo do app → Segurança dos dados)

- O app coleta ou compartilha algum dos tipos de dados exigidos? **Não**
- Os dados são criptografados em trânsito? **Sim** (HTTPS)
- Os usuários podem pedir a exclusão dos dados? Não se aplica (nenhum dado coletado)

### Outros itens de "Conteúdo do app"

| Item                        | Resposta                                                                |
| --------------------------- | ----------------------------------------------------------------------- |
| Política de privacidade     | `https://app-faixacerta.com.br/privacidade`                             |
| Anúncios                    | Não contém anúncios                                                     |
| Acesso ao app               | Todas as funcionalidades sem restrições (sem login)                     |
| Classificação do conteúdo   | Questionário IARC, categoria "Referência, notícias ou educação" → Livre |
| Público-alvo                | 13+ (se marcar menores de 13, entra nas regras da Família do Google)    |
| App de notícias             | Não                                                                     |
| Apps governamentais / saúde | Não                                                                     |

**Público-alvo**: o judô tem muitos alunos crianças, mas marcar faixas abaixo de 13 anos
coloca o app no programa Famílias do Google, com exigências extras (SDKs certificados,
revisão de conteúdo). Para a 1.0, o caminho mais simples é 13+; reavaliar na Etapa 5
(login com consentimento dos pais, já previsto no produto).

### Primeiro envio (manual)

1. Play Console → Testar e lançar → **Teste interno** → Criar versão.
2. Enviar o `.aab` do build de produção do EAS (link no fim do build).
3. Assinatura: aceitar a **Assinatura de apps do Google Play** (o Google guarda a chave de
   assinatura; a do EAS vira a chave de upload).
4. Contas pessoais criadas depois de nov/2023: antes da produção, o Google exige **teste
   fechado com pelo menos 12 testadores por 14 dias seguidos**.
5. Depois do primeiro envio: criar a conta de serviço com acesso à API do Play e cadastrá-la
   no EAS (`npx eas-cli credentials -p android` → Google Service Account). Os próximos envios
   saem pelo GitHub Actions (_Mobile (EAS)_ com "submit").

---

## Capturas de tela

Obrigatórias nas duas lojas. Tamanhos aceitos:

- **App Store**: iPhone 6,9" (1320×2868 ou 1290×2796). As de 6,5" são opcionais se houver as
  de 6,9". De 3 a 10 imagens.
- **Google Play**: de 2 a 8 capturas do telefone, lado entre 320 e 3840 px, proporção até 2:1.

Sugestão de sequência (5 telas): Onboarding ("Qual é a sua faixa hoje?") → Início (rumo à
próxima faixa) → Apostila → Técnica (com vídeo) → Glossário. Fica melhor depois de publicar
mídia real nas técnicas mostradas.
