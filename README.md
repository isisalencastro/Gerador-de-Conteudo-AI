# Gerador de Conteudo AI

Sistema de automacao de conteudo para YouTube usando **N8N**, **OpenAI (GPT-4o)** e **Notion** como hub central. Gera ideias de video alinhadas com a estrategia editorial do creator e transforma ideias aprovadas em roteiros completos — tudo de forma automatica.

A IA pesquisa, estrutura e rascunha. O creator revisa, personaliza e publica. O sistema nao substitui criatividade — elimina o trabalho pesado.

## O Problema

Creators de video enfrentam um ciclo repetitivo: pensar em ideias, validar contra o posicionamento do canal, escrever roteiros, preparar metadata para publicacao. Esse trabalho operacional consome horas que poderiam ser investidas em gravacao e conexao com a audiencia.

## A Solucao

Um workflow automatizado que:

1. **Gera ideias** alinhadas com a filosofia, pilares de conteudo e voz do canal
2. **Evita repeticao** consultando ideias ja existentes no Notion
3. **Roteiriza automaticamente** ideias aprovadas pelo creator
4. **Entrega roteiros completos** com marcacoes de producao, sugestoes de thumbnail, tags e descricao

O creator mantem controle criativo total: a IA so avanca quando uma ideia recebe status "Aprovada" manualmente.

## Como Funciona

```
                    ┌─────────────────────────────────────────────┐
                    │         WORKFLOW PRINCIPAL (YouTube)          │
                    │                                              │
                    │  ┌──────────────┐    ┌───────────────────┐  │
 Webhook ──────────►│  │  Gerador de  │    │   Roteirizador    │  │
 (manual/semanal)   │  │   Ideias     │    │   Automatico      │  │
                    │  │              │    │                   │  │
                    │  │ 5 ideias/vez │    │ A cada 30 min     │  │
                    │  │ GPT-4o       │    │ verifica aprovadas│  │
                    │  └──────┬───────┘    └───────┬───────────┘  │
                    │         │                    │               │
                    │         ▼                    ▼               │
                    │     ┌────────────────────────────┐          │
                    │     │      Notion (Hub Central)   │          │
                    │     │  Ideia → Aprovada →         │          │
                    │     │  Roteirizada → Filmada →     │          │
                    │     │  Publicada                   │          │
                    │     └────────────────────────────┘          │
                    └─────────────────────────────────────────────┘

                    ┌─────────────────────────────────────────────┐
                    │        WORKFLOWS COMPLEMENTARES              │
                    │                                              │
                    │  Newsletter ──► Instagram                   │
                    │       │                                      │
                    │       └──────► LinkedIn                     │
                    │                                              │
                    │  Opcionais. Geram conteudo derivado          │
                    │  a partir de uma newsletter central.         │
                    └─────────────────────────────────────────────┘
```

## Fluxo 1 — Gerador de Ideias

Disparado por webhook (manual ou agendado). Gera 5 ideias de video e salva no Notion.

```
Webhook
  ↓
Notion: Busca ideias existentes (evitar repeticao)
  ↓
Preparar Prompt: monta contexto com filosofia do canal,
  pilares de conteudo, canais de referencia e regras de voz
  ↓
OpenAI GPT-4o: Gera 5 ideias (temperature 0.85)
  ↓
Separar Ideias: desmembra o JSON em itens individuais
  ↓
Notion: Salva cada ideia com status "Ideia"
  (titulo, formato, inspiracao, publico-alvo,
   gancho, keywords, potencial viral)
```

Cada ideia gerada inclui: titulo, insight central, formato sugerido, publico-alvo, gancho para os primeiros 30 segundos, keywords e potencial viral.

## Fluxo 2 — Roteirizador Automatico

Roda a cada 30 minutos. Quando encontra ideias com status "Aprovada", gera roteiros completos.

```
Schedule Trigger (a cada 30 min)
  ↓
Notion API: Busca ideias com status "Aprovada"
  ↓
Preparar Prompt: monta contexto do roteiro com
  marcacoes especiais de producao
  ↓
OpenAI GPT-4o: Gera roteiro completo (temperature 0.75)
  ↓
Formatar Roteiro: estrutura em Markdown
  ↓
Notion: Atualiza propriedades (status → "Roteirizada")
  ↓
Notion: Adiciona roteiro completo na pagina
```

**Estrutura do roteiro gerado:**

1. **Gancho** (0:00-0:30) — primeiros segundos que prendem
2. **Intro** (0:30-1:30) — contexto + historia pessoal
3. **Desenvolvimento** (1:30-8:00) — 3-4 blocos com marcacoes de producao
4. **Climax** (8:00-9:00) — insight principal
5. **CTA** (9:00-9:30) — inscricao, newsletter, comentarios
6. **Encerramento** (9:30-10:00) — despedida pessoal

**Extras gerados:** 3 opcoes de titulo (A/B test), 3 sugestoes de thumbnail, 10-15 tags YouTube, descricao com timestamps.

### Marcacoes de Producao no Roteiro

Os roteiros incluem marcacoes que facilitam a gravacao:

| Marcacao | Significado |
|----------|-------------|
| `[INSERIR HISTORIA PESSOAL: ...]` | Onde o creator adiciona vivencias proprias |
| `[NOTA DE PRODUCAO: ...]` | Sugestoes de B-roll, graficos, transicoes |
| `[GANCHO VISUAL: ...]` | Momentos que precisam de destaque visual |
| `[PAUSA DRAMATICA]` | Momentos de silencio intencional |
| `[MUDANCA DE ENERGIA]` | Quando o tom deve mudar |

## Pipeline de Conteudo no Notion

```
Ideia ──► Aprovada ──► Roteirizada ──► Filmada ──► Publicada
  │           │             │              │            │
  │     (manual, pelo   (automatico,   (manual)     (manual)
  │      creator)        via N8N)
  │
  └── Rejeitada (descartada)
```

## O Que Voce Precisa Adaptar

Antes de usar o sistema, personalize estas partes nos prompts do N8N:

| O que adaptar | Onde no N8N | Referencia |
|--------------|-------------|------------|
| Identidade do creator | `systemPrompt` no node `Preparar Prompt: YouTube` | [`docs/prompts.md`](docs/prompts.md) |
| Pilares de conteudo | `systemPrompt` no node `Preparar Prompt: YouTube` | [`docs/prompts.md`](docs/prompts.md) |
| Voz e regras de titulo | `userPrompt` no node `Preparar Prompt: YouTube` | [`docs/prompts.md`](docs/prompts.md) |
| Canais de referencia | `systemPrompt` no node `Preparar Prompt: YouTube` | [`docs/prompts.md`](docs/prompts.md) |
| Publico-alvo | `systemPrompt` no node `Preparar Prompt: YouTube` | [`docs/prompts.md`](docs/prompts.md) |
| Estilo do roteiro | `systemPrompt` no node `Preparar Prompt: Roteiro` | [`docs/prompts.md`](docs/prompts.md) |
| Estrutura do roteiro | `userPrompt` no node `Preparar Prompt: Roteiro` | [`docs/prompts.md`](docs/prompts.md) |

Guia completo de adaptacao: [`docs/customization.md`](docs/customization.md)

## Pre-requisitos

- **N8N** (self-hosted ou cloud) — v1.0+
- **OpenAI API Key** — com acesso ao GPT-4o
- **Notion** — Workspace com Integration configurada
- **Node.js** — v16+ (apenas para `generate-workflows.js`)

## Setup Rapido

### 1. Credenciais no N8N

| Credencial | Tipo |
|-----------|------|
| OpenAI | OpenAI API |
| Notion | Notion API |

### 2. Database no Notion

Crie o database de YouTube com as propriedades listadas em [`docs/notion-setup.md`](docs/notion-setup.md).

Configure o ID como variavel de ambiente `NOTION_YOUTUBE_DB_ID` no N8N (Settings → Variables).

### 3. Importar o Workflow

1. Abra o N8N
2. **"+ Add Workflow"** → **"Import from File"**
3. Selecione `workflows/youtube-content.json`
4. Mapeie as credenciais (Notion + OpenAI)
5. Ative o workflow

### 4. Personalizar os Prompts

Edite os Code nodes `Preparar Prompt: YouTube` e `Preparar Prompt: Roteiro` com a identidade do seu canal. Veja [`docs/prompts.md`](docs/prompts.md) para a estrutura completa e [`docs/customization.md`](docs/customization.md) para o guia passo a passo.

### 5. Usar

- Dispare o webhook para gerar ideias
- Revise no Notion e mude o status para "Aprovada"
- O roteirizador gera o roteiro em ate 30 minutos

## Workflows Complementares

Os workflows 01-03 sao opcionais e podem ser gerados pelo script `generate-workflows.js`. Eles criam conteudo derivado para outras plataformas:

| # | Workflow | Arquivo | Descricao |
|---|---------|---------|-----------|
| 01 | Newsletter | `01-newsletter-pipeline.json` | Pipeline completo de newsletter |
| 02 | Instagram | `02-instagram-content.json` | Posts derivados da newsletter |
| 03 | LinkedIn | `03-linkedin-content.json` | Posts reflexivos derivados da newsletter |

```bash
node generate-workflows.js
```

## Modelo de IA

| Modelo | Uso recomendado | Custo |
|--------|----------------|-------|
| `gpt-4o` | Ideias e roteiros (padrao) | ~$0.50/execucao |
| `gpt-4o-mini` | Testes rapidos | ~$0.05/execucao |

## Custos Estimados

| Componente | Frequencia | Custo/mes |
|-----------|-----------|-----------|
| YouTube (ideias) | 1x/semana | ~$1-2 |
| YouTube (roteiros) | Sob demanda | ~$0.50/roteiro |
| Newsletter (opcional) | 1x/dia | ~$15-25 |
| Instagram (opcional) | 1x/dia | ~$3-5 |
| LinkedIn (opcional) | 3x/semana | ~$2-3 |

## Troubleshooting

| Problema | Solucao |
|----------|---------|
| Notion erro 401 | Verifique se a Integration tem acesso ao database |
| OpenAI erro 429 | Rate limit — aumente o timeout ou adicione retry |
| Roteiro nao gerado | Confirme que o status no Notion e exatamente `Aprovada` |
| Ideias repetidas | O prompt ja filtra ideias existentes; verifique se o node Notion busca todas |
| JSON invalido do GPT | O codigo tem fallback com regex; se persistir, reduza `temperature` |

## Estrutura do Projeto

```
├── workflows/
│   ├── youtube-content.json           ← Workflow principal (gerador + roteirizador)
│   ├── 01-newsletter-pipeline.json    # Pipeline da newsletter (gerado)
│   ├── 02-instagram-content.json      # Posts Instagram (gerado)
│   └── 03-linkedin-content.json       # Posts LinkedIn (gerado)
├── docs/
│   ├── notion-setup.md                # Setup do database Notion
│   ├── youtube-workflow.md            # Documentacao tecnica do workflow
│   ├── prompts.md                     # Estrutura e anatomia dos prompts
│   └── customization.md              # Guia de adaptacao para novos creators
├── generate-workflows.js              # Script que gera workflows 01-03
├── .env.example                       # Variaveis de ambiente
├── .gitignore
└── README.md
```

## Documentacao

- [`docs/customization.md`](docs/customization.md) — Guia de adaptacao para novos creators
- [`docs/prompts.md`](docs/prompts.md) — Estrutura dos prompts e como personalizar
- [`docs/notion-setup.md`](docs/notion-setup.md) — Como configurar o database no Notion
- [`docs/youtube-workflow.md`](docs/youtube-workflow.md) — Documentacao tecnica de cada node
