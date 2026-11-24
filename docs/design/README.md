# Design do Faixa Certa

Fonte de verdade visual do produto. O layout aprovado está em
[`layout-do-app.pdf`](layout-do-app.pdf) (26 telas). A marcação de cada tela
está em [`telas/`](telas/), com placeholders `{{...}}` e sem as fontes e os
scripts do pacote. Use esses arquivos para ler valores exatos (espaçamentos,
tamanhos, cores); eles não são código de produção.

**Toda tela nova, no app ou no painel, segue estes padrões.** Se uma tela não
tem modelo, monte com os componentes descritos abaixo antes de inventar outro.

## Tokens

Os valores ficam em `packages/shared/src/design/tokens.ts` (`BRAND_COLORS`,
`BELT_PALETTE`, `MEDAL_COLORS`, `RADII`, `FONTS`) e valem para web e mobile. No
painel web eles viram variáveis CSS em `apps/web/src/index.css`.

### Cores

| Papel                  | Valor     | Uso                                                      |
| ---------------------- | --------- | -------------------------------------------------------- |
| Lima (`lime`)          | `#D4FF3A` | Ação principal, item ativo, barra de progresso, destaque |
| Fundo (`ink`)          | `#0B0B0F` | Fundo de todas as telas; texto sobre lima                |
| Superfície (`surface`) | `#16161D` | Cartões, campos, botões secundários                      |
| Superfície elevada     | `#1F1F29` | Chips inativos, badge "Estudando", popovers              |
| Borda                  | `#26262F` | Borda de 1px de cartões e campos                         |
| Texto                  | `#F5F5F7` | Texto principal                                          |
| Texto secundário       | `#A1A1AA` | Subtítulos, rótulos, metadados                           |
| Perigo                 | `#FF5C8A` | "Erro comum", "Revise estas", gravação; fundo `#2A1A1E`  |
| Sucesso                | `#2EE6A8` | Pix, "0% de taxa", download feito; fundo `#10251E`       |

**Regra da marca:** lima + preto. As cores das faixas (`BELT_PALETTE`) só
aparecem no conteúdo: amostra da faixa, avatar do aluno, cards de conquista,
produtos. Nunca em botões ou navegação.

### Tipografia

- **Bricolage Grotesque, peso 800**: títulos, números de destaque (62%, 8/10,
  R$ 10), nome da técnica, logo. Letter-spacing levemente negativo nos grandes.
  Escala usada: 18, 22, 30, 36, 44 e 52px.
- **Inter, 400 a 700**: todo o resto. Corpo 15–16px, metadados 13px.
- **Rótulo de seção**: Inter 12px, 600, caixa alta, `letter-spacing: 0.08em`,
  cor secundária ("RUMO À PRÓXIMA FAIXA", "PASSO A PASSO", "REVISE ESTAS").

### Forma

| Elemento                          | Raio    |
| --------------------------------- | ------- |
| Cartão de destaque (hero)         | 28px    |
| Cartão de lista, opção de quiz    | 18px    |
| Botão de ícone 44×44, campo       | 14px    |
| Botão principal (56–60px de alto) | 18–20px |
| Chip, badge, pílula de status     | 999px   |
| Amostra de faixa                  | 4–6px   |

Alvos de toque têm no mínimo 44×44. A margem lateral das telas é 20px.

## Componentes recorrentes

- **Cabeçalho de tela**: título Bricolage à esquerda; ação em botão de ícone
  44×44 (superfície + borda) à direita. Telas internas têm "voltar" no mesmo
  botão à esquerda.
- **Botão principal**: lima, texto preto 18px bold, largura total, fixo no pé
  da tela quando é a ação da tela ("Continuar", "Já domino", "Publicar"). O
  secundário é contornado (borda `#3A3A46`) e fica ao lado.
- **Chips de filtro**: pílulas roláveis na horizontal; ativo lima com texto
  preto, inativo superfície com borda.
- **Controle segmentado**: trilho superfície; opção ativa fundo claro
  (`#F5F5F7`) com texto preto ("Material / Avisos / Lojinha").
- **Linha de lista**: cartão de 18px, número/ícone à esquerda, título 17px
  semibold + subtítulo secundário, badge de status à direita.
- **Badge de domínio**: "Domino" lima; "Estudando" superfície elevada; "Novo"
  contornado.
- **Barra de progresso**: trilho `#26262F`, preenchimento lima; vermelho
  (`danger`) quando o aluno está atrasado (modo professor).
- **Amostra de faixa**: retângulo arredondado na cor da faixa com o nó no meio
  quando grande; faixa preta leva borda `#3A3A46`.
- **Barra de navegação inferior**: 5 abas, ícone + rótulo; ativa em lima.
- **Aviso informativo**: caixa com fundo tingido (verde para Pix, azul para
  privacidade de menores, vermelho para erro comum) e ícone à esquerda.
- **Cards compartilháveis (1080×1920)**: fundo na cor da conquista (faixa
  nova, medalha, lima para simulado, escuro para sequência), título Bricolage
  em caixa alta, logo no rodapé.

## Painel web

O painel usa os mesmos tokens em versão para desktop: tema escuro por padrão
(o claro fica disponível no botão de tema), barra lateral com o logo e item
ativo com ícone lima, títulos em Bricolage, badge "Publicado" em lima, abas
como controle segmentado e campos em superfície. Componentes em
`apps/web/src/components/brand.tsx` (`BrandMark`, `BrandIcon`, `BrandLogo`).

## Telas por etapa

| Tela do layout                                    | Etapa       |
| ------------------------------------------------- | ----------- |
| 20 Splash, 08 Onboarding, 01 Início               | 3           |
| 02 Apostila, 03 Técnica, 10 Glossário             | 3           |
| 04 Simulado, 11 Resultado do simulado             | 4           |
| 09 Login, 05 Minha jornada                        | 5           |
| 12, 21, 22, 23 Cards para stories                 | 5           |
| 07 Sem anúncios (Pix)                             | 6           |
| 18 Pro Professor, 16 Professor — alunos, 06 Turma | 7           |
| 06 Lojinha, 17 Pedidos da lojinha                 | 8           |
| 13 Comparar meu vídeo                             | 10          |
| 19 Logo                                           | já aplicado |

Fora do escopo das 12 etapas (precisam de decisão antes de entrar no plano):
**14 Treinos (reels)**, **15 Postar vídeo do treino**, **24 Biblioteca de
PDFs**, **25 Leitor de PDF** e **26 Perguntas e respostas** (assistente com
base no guia Kodokan). Nas telas 14, 24 e 25 a aba "Simulado" da navegação
inferior vira "Treinos".

## Licenças

Bricolage Grotesque e Inter são distribuídas sob a SIL Open Font License 1.1.
No painel web elas vêm dos pacotes `@fontsource-variable/*`.
