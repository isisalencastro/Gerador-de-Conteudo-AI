# Sistema de Conteúdo Automatico

Sistema completo de automação de conteúdo usando **N8N**, **OpenAI (GPT-4o)** e **Notion** como hub central. A IA cuida de pesquisa, estrutura e rascunho — Isis mantém controle criativo e identidade antes de publicar.

## Arquitetura do Sistema

```
Newsletter Low-Ticket (PRODUTO) ─── 15h diário
        │
        ▼
   Beehiiv (assinantes pagos)
        │
   ┌────┴─────┐
   ▼          ▼
Instagram   LinkedIn          Gerador de Ideias ── Qua 9h (semanal)
IBACompany  Isis Alencastro   YouTube Script ────── Manual
(15h30)     (Seg/Qua/Sex 8h)
   │          │
   ▼          ▼
  CTA →    CTA →
 newsletter newsletter
```

## Workflows

| # | Workflow | Arquivo | Schedule | Descrição |
|---|---------|---------|----------|-----------|
| 01 | Newsletter Pipeline | `01-newsletter-pipeline.json` | Diário 15h | Descobre tópicos, pesquisa, escreve newsletter completa |
| 02 | Instagram IBACompany | `02-instagram-content.json` | Diário 15h30 | Gera 3 posts a partir da newsletter do dia |
| 03 | LinkedIn Isis | `03-linkedin-content.json` | Seg/Qua/Sex 8h | Gera 2 posts reflexivos conectados à newsletter |
| 04 | Gerador de Ideias YouTube | `04-youtube-monitor.json` | Semanal Qua 9h | Gera 5 ideias de vídeo com foco em jornada pessoal |
| 05 | YouTube Roteirizador | `05-youtube-scriptwriter.json` | Manual (Webhook) | Gera roteiro completo para ideia aprovada |

## Pré-requisitos

- **N8N** (self-hosted ou cloud) — v1.0+
- **OpenAI API Key** — com acesso ao GPT-4o
- **Notion** — Workspace com Integration configurada
- **Beehiiv** — Conta com acesso à API

## Setup Passo a Passo

### 1. Configurar Credenciais no N8N

Acesse **Settings → Credentials** no N8N e configure:

| Credencial | Tipo | Onde obter |
|-----------|------|------------|
| **OpenAI** | OpenAI API | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| **Notion** | Notion API | [notion.so/my-integrations](https://www.notion.so/my-integrations) |
| **Beehiiv API** | Header Auth | [app.beehiiv.com/settings/integrations](https://app.beehiiv.com/settings/integrations) |

Para a credencial **Beehiiv API** (Header Auth):
- **Header Name:** `Authorization`
- **Header Value:** `Bearer SEU_TOKEN_BEEHIIV`

### 2. Configurar Variáveis de Ambiente no N8N

Acesse **Settings → Variables** e crie:

| Variável | Descrição |
|----------|-----------|
| `NOTION_NEWSLETTER_DB_ID` | ID do database de Newsletters no Notion |
| `NOTION_INSTAGRAM_DB_ID` | ID do database de Instagram no Notion |
| `NOTION_LINKEDIN_DB_ID` | ID do database de LinkedIn no Notion |
| `NOTION_YOUTUBE_DB_ID` | ID do database de YouTube no Notion |
| `BEEHIIV_PUBLICATION_ID` | ID da publicação no Beehiiv |

> **Como encontrar o ID de um database no Notion:**
> Abra o database em página inteira. A URL será algo como:
> `https://www.notion.so/seu-workspace/abc123def456...`
> O ID é a parte `abc123def456...` (32 caracteres hexadecimais).

### 3. Criar Databases no Notion

Crie 4 databases no Notion e conecte sua Integration a cada um.

#### Database: Newsletter

| Propriedade | Tipo | Descrição |
|------------|------|-----------|
| Name | Title | Título da edição |
| Status | Select | Opções: `Revisar`, `Publicado` |
| Data | Date | Data da edição |
| Topics | Multi-select | Tópicos cobertos (preenchido automaticamente) |

#### Database: Instagram

| Propriedade | Tipo | Descrição |
|------------|------|-----------|
| Name | Title | Hook/título do post |
| Status | Select | Opções: `Revisar`, `Aprovado`, `Publicado` |
| Data | Date | Data do post |
| Formato | Select | Opções: `carousel`, `single`, `breaking` |
| Hashtags | Rich Text | Hashtags do post |
| CTA | Rich Text | Call to action |
| Visual JSON | Rich Text | Instruções visuais para Figma |

#### Database: LinkedIn

| Propriedade | Tipo | Descrição |
|------------|------|-----------|
| Name | Title | Hook do post |
| Status | Select | Opções: `Revisar`, `Aprovado`, `Publicado` |
| Data | Date | Data do post |
| Hashtags | Rich Text | Hashtags |
| Image Prompt | Rich Text | Prompt para DALL-E/Midjourney |
| Caracteres | Number | Contagem de caracteres |
| Estratégia | Rich Text | Estratégia de engajamento |

#### Database: YouTube

| Propriedade | Tipo | Descrição |
|------------|------|-----------|
| Name | Title | Título/ideia do vídeo |
| Status | Select | Opções: `Ideia`, `Aprovada`, `Roteirizada`, `Filmada`, `Publicada` |
| Data | Date | Data de criação |
| Formato | Select | Opções: `video-ensaio`, `storytelling`, `reflexão`, `diário-em-vídeo`, `análise-pessoal` |
| Inspiração | Rich Text | Fonte de inspiração |
| Ângulo Isis | Rich Text | Perspectiva da Isis |
| Público-alvo | Rich Text | Audiência target |
| Duração Estimada | Rich Text | Tempo estimado |
| Potencial Viral | Select | Opções: `Baixo`, `Médio`, `Alto` |
| Keywords | Rich Text | Palavras-chave |
| Opções de Título | Rich Text | Alternativas de título para A/B test |
| Tags YouTube | Rich Text | Tags para YouTube |

### 4. Importar Workflows no N8N

1. Acesse seu N8N
2. Clique em **"+ Add Workflow"**
3. Clique nos **3 pontinhos** → **"Import from File"**
4. Selecione o arquivo JSON da pasta `workflows/`
5. Repita para cada workflow

### 5. Configurar Credenciais nos Nodes

Após importar cada workflow:

1. Clique em cada node que usa credenciais (Notion, OpenAI, Beehiiv)
2. Selecione a credencial configurada no passo 1
3. Para nodes do Notion: verifique se o database correto está selecionado
4. Para nodes do Notion com propriedades: mapeie as propriedades para corresponder ao seu database

### 6. Ativar Workflows

Após configurar e testar manualmente cada workflow:

1. Clique no toggle **"Active"** no canto superior direito
2. O workflow começará a rodar no horário programado

## Fluxo de Cada Workflow

### 01 — Newsletter Pipeline

```
Schedule (15h)
    ↓
Notion: Busca edições anteriores (últimas 30)
    ↓
Code: Monta prompt com tópicos para evitar
    ↓
OpenAI: Descobre 10 tópicos do dia (GPT-4o)
    ↓
Code: Monta prompt de pesquisa profunda
    ↓
OpenAI: Deep Research sobre cada tópico (GPT-4o)
    ↓
Code: Monta prompt da newsletter
    ↓
OpenAI: Escreve newsletter completa (GPT-4o)
    ↓
Code: Formata HTML + Markdown
    ↓
Notion: Salva com status "Revisar"
    ↓
Beehiiv: Publica como draft
```

### 02 — Instagram IBACompany

```
Schedule (15h30)
    ↓
Notion: Busca última newsletter
    ↓
Code: Monta prompt com regras do Instagram
    ↓
OpenAI: Gera 3 posts (GPT-4o)
    ↓
Code: Separa posts individuais
    ↓
Notion: Salva cada post com status "Revisar"
```

### 03 — LinkedIn Isis Alencastro

```
Schedule (Seg/Qua/Sex 8h)
    ↓
Notion: Busca última newsletter
    ↓
Code: Monta prompt com voz da Isis
    ↓
OpenAI: Gera 2 posts reflexivos (GPT-4o)
    ↓
Code: Separa posts com metadata
    ↓
Notion: Salva cada post com status "Revisar"
```

### 04 — Gerador de Ideias YouTube

```
Schedule (Qua 9h — semanal)
    ↓
Notion: Busca ideias existentes (evitar repetição)
    ↓
Code: Monta prompt com filosofia do canal e pilares de conteúdo
    ↓
OpenAI: Gera 5 ideias de vídeo (GPT-4o)
    ↓
Code: Separa ideias individuais
    ↓
Notion: Salva cada ideia com status "Ideia"
```

### 05 — YouTube Roteirizador

```
Webhook (manual) ──ou── Notion: Status = "Aprovada"
    ↓
Notion: Busca ideias com status "Aprovada"
    ↓
IF: Tem ideias aprovadas?
    ├── SIM ─→ Code: Monta prompt do roteiro
    │             ↓
    │          OpenAI: Gera roteiro completo (GPT-4o)
    │             ↓
    │          Code: Formata roteiro com marcações
    │             ↓
    │          Notion: Atualiza ideia com roteiro (status → "Roteirizada")
    │             ↓
    │          Resposta: Sucesso
    │
    └── NÃO ─→ Resposta: Sem ideias aprovadas
```

## Filosofia do Sistema

> A automação pesquisa, estrutura e rascunha.
> Isis revisa, personaliza e publica.
> O sistema não substitui sua criatividade — elimina o trabalho pesado.

- **Nenhum conteúdo vai ao ar sem revisão** — tudo chega com status "Revisar"
- **O conteúdo gratuito nunca entrega o que a newsletter entrega** — ele gera desejo
- **O produto paga a operação. O conteúdo gratuito vende o produto.**

## Personalização

### Ajustar Prompts

Os prompts estão nos nodes **"Preparar Prompt: ..."** (Code nodes). Para personalizar:

1. Abra o Code node no editor do N8N
2. Edite as variáveis `systemPrompt` e `userPrompt`
3. Teste com **"Execute Node"** antes de salvar

### Ajustar Horários

Os horários estão nos nodes **Schedule Trigger** usando expressões cron:

| Workflow | Cron | Significado |
|----------|------|-------------|
| Newsletter | `0 15 * * *` | Todo dia às 15h |
| Instagram | `30 15 * * *` | Todo dia às 15h30 |
| LinkedIn | `0 8 * * 1,3,5` | Seg/Qua/Sex às 8h |
| Gerador de Ideias | Semanal (Qua) | Toda quarta-feira às 9h |

### Ajustar Modelo de IA

Todos os workflows usam `gpt-4o`. Para trocar, edite o campo `model` nos Code nodes:

- `gpt-4o` — Máxima qualidade (recomendado para newsletter)
- `gpt-4o-mini` — Mais rápido e econômico (bom para posts de redes sociais)
- `gpt-4-turbo` — Alternativa com boa relação custo-benefício

## Custos Estimados

| Workflow | Chamadas GPT-4o/dia | Custo estimado/mês |
|----------|---------------------|-------------------|
| Newsletter | 3 chamadas/dia | ~$15-25/mês |
| Instagram | 1 chamada/dia | ~$3-5/mês |
| LinkedIn | 1 chamada (3x/semana) | ~$2-3/mês |
| Gerador de Ideias | 1 chamada/semana | ~$1-2/mês |
| YouTube Script | Sob demanda | ~$0.50/roteiro |
| **Total estimado** | | **~$22-36/mês** |

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Notion retorna erro 401 | Verifique se a Integration tem acesso aos databases |
| OpenAI retorna erro 429 | Rate limit — aumente o timeout ou adicione retry |
| Posts duplicados | Verifique se o workflow não está ativo E sendo executado manualmente |
| Newsletter sem conteúdo | Verifique os logs do Code node "Formatar Newsletter" |
| Beehiiv erro 403 | Verifique o token da API e o Publication ID |
| Webhook não funciona | Ative o workflow antes de chamar a URL do webhook |

## Estrutura do Projeto

```
├── workflows/
│   ├── 01-newsletter-pipeline.json    # Pipeline completo da newsletter
│   ├── 02-instagram-content.json      # Gerador de posts Instagram
│   ├── 03-linkedin-content.json       # Gerador de posts LinkedIn
│   ├── 04-youtube-monitor.json        # Gerador de ideias YouTube (semanal)
│   └── 05-youtube-scriptwriter.json   # Roteirizador de vídeos
├── docs/
│   └── notion-setup.md               # Guia detalhado do Notion
├── generate-workflows.js             # Script gerador dos workflows
└── README.md                         # Este arquivo
```
