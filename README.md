# Gerador de Conteúdo AI — Isis Alencastro

Sistema de automação de conteúdo para o canal de YouTube e presença digital de **Isis Alencastro**, usando **N8N**, **OpenAI (GPT-4o)** e **Notion** como hub central.

A IA pesquisa, estrutura e rascunha. Isis revisa, personaliza e publica. O sistema não substitui criatividade — elimina o trabalho pesado.

## A Ideia Central

Isis está construindo um canal no YouTube na interseção entre **tecnologia, IA e desenvolvimento pessoal**. A proposta não é ser mais uma expert dando dicas — é documentar uma jornada real de crescimento.

O workflow principal (`youtube-content.json`) é o coração deste repositório: ele gera ideias de vídeo alinhadas com a filosofia do canal e transforma ideias aprovadas em roteiros completos, tudo de forma automática via N8N + GPT-4o + Notion.

### Filosofia do Canal

```
Isis NÃO é expert dando dicas.
Isis é uma pessoa em evolução documentando sua jornada.

- Expert diz "faça assim"      → Isis diz "eu tentei isso e aprendi tal coisa"
- Expert ensina de cima         → Isis caminha junto com o espectador
- Expert tem respostas          → Isis tem perguntas honestas e descobertas reais

O canal é um diário público de crescimento — profissional E pessoal.
O espectador não sai com um tutorial. Sai sentindo que não está sozinho.
```

### Pilares de Conteúdo (em ordem de prioridade)

1. **Evolução Documentada** — mostrar quem ela era, quem está se tornando, o que mudou
2. **Autoconhecimento na jornada em tech** — o que aprender revela sobre si mesma
3. **Desenvolvimento Pessoal aplicado à tech** — identidade profissional, síndrome do impostor, burnout, limites, propósito
4. **Produtividade Consciente** — sistemas que respeitam a vida, não apenas otimizam
5. **IA & Tech como gatilho de reflexão** — não como tema técnico isolado

## Arquitetura do Sistema

```
                    ┌─────────────────────────────────────────────┐
                    │          YOUTUBE (Workflow Principal)         │
                    │                                              │
                    │  ┌──────────────┐    ┌───────────────────┐  │
 Webhook ──────────►│  │  Gerador de  │    │   Roteirizador    │  │
 (manual/semanal)   │  │   Ideias     │    │   Automático      │  │
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
                    │  Newsletter (15h) ──► Instagram (15h30)     │
                    │        │                                     │
                    │        └──────────► LinkedIn (Seg/Qua/Sex)  │
                    │                                              │
                    │  Todos alimentam o Notion e direcionam       │
                    │  tráfego para a newsletter AI Pulse.         │
                    └─────────────────────────────────────────────┘
```

## Workflow Principal: YouTube Content

O arquivo `workflows/youtube-content.json` contém **dois fluxos** em um único workflow N8N:

### Fluxo 1 — Gerador de Ideias

Disparado por webhook (manual ou agendado). Gera 5 ideias de vídeo e salva no Notion.

```
Webhook
  ↓
Notion: Busca ideias existentes (evitar repetição)
  ↓
Preparar Prompt: monta contexto com filosofia do canal,
  pilares de conteúdo, canais de referência e regras de voz
  ↓
OpenAI GPT-4o: Gera 5 ideias (temperature 0.85)
  ↓
Separar Ideias: desmembra o JSON em itens individuais
  ↓
Notion: Salva cada ideia com status "Ideia"
  (título, formato, inspiração, público-alvo,
   gancho, keywords, potencial viral)
```

**Distribuição das 5 ideias:**
- 2 com foco em autoconhecimento/identidade/emoções
- 1 sobre a jornada real de carreira (erros, dúvidas, viradas)
- 1 sobre uso consciente de tech/IA
- 1 livre conectando qualquer pilar com experiência pessoal

**Regra de voz:** nenhuma ideia pode soar como tutorial. Títulos convidam para uma jornada, não prometem resultados.

### Fluxo 2 — Roteirizador Automático

Roda a cada 30 minutos. Quando encontra ideias com status "Aprovada", gera roteiros completos.

```
Schedule Trigger (a cada 30 min)
  ↓
Preparar Query: filtra por Status = "Aprovada"
  ↓
Notion API: Busca ideias aprovadas
  ↓
Tem ideias? Se não, para. Se sim, continua.
  ↓
Preparar Prompt: monta contexto do roteiro com
  marcações especiais de produção
  ↓
OpenAI GPT-4o: Gera roteiro completo (temperature 0.75)
  ↓
Formatar Roteiro: estrutura em Markdown com seções
  ↓
Notion: Atualiza propriedades (status → "Roteirizada",
  opções de título, tags, duração)
  ↓
Notion: Adiciona roteiro completo como conteúdo da página
```

**Estrutura do roteiro gerado:**
1. **Gancho** (0:00-0:30) — primeiros segundos que prendem
2. **Intro** (0:30-1:30) — contexto + história pessoal
3. **Desenvolvimento** (1:30-8:00) — 3-4 blocos com marcações de produção
4. **Clímax** (8:00-9:00) — insight principal
5. **CTA** (9:00-9:30) — inscrição, newsletter, comentários
6. **Encerramento** (9:30-10:00) — despedida pessoal

**Extras gerados:** 3 opções de título (A/B test), 3 sugestões de thumbnail, 10-15 tags YouTube, descrição com timestamps.

### Marcações Especiais no Roteiro

Os roteiros incluem marcações que facilitam a gravação:

| Marcação | Significado |
|----------|-------------|
| `[INSERIR HISTÓRIA PESSOAL: ...]` | Onde Isis adiciona vivências próprias |
| `[NOTA DE PRODUÇÃO: ...]` | Sugestões de B-roll, gráficos, transições |
| `[GANCHO VISUAL: ...]` | Momentos que precisam de destaque visual |
| `[PAUSA DRAMÁTICA]` | Momentos de silêncio intencional |
| `[MUDANÇA DE ENERGIA]` | Quando o tom deve mudar |

## Workflows Complementares

Os workflows 01–03 podem ser gerados pelo script `generate-workflows.js` e alimentam o ecossistema de conteúdo:

| # | Workflow | Arquivo | Schedule | Descrição |
|---|---------|---------|----------|-----------|
| 01 | Newsletter AI Pulse | `01-newsletter-pipeline.json` | Diário 15h | Descobre tópicos, pesquisa, escreve newsletter completa |
| 02 | Instagram IBACompany | `02-instagram-content.json` | Diário 15h30 | Gera 3 posts a partir da newsletter do dia |
| 03 | LinkedIn Isis | `03-linkedin-content.json` | Seg/Qua/Sex 8h | Gera 2 posts reflexivos conectados à newsletter |

```bash
node generate-workflows.js
```

## Canais de Referência

O sistema usa estes canais como referência para estilo e formato:

| Canal | Referência de... |
|-------|-----------------|
| **pearlieee** | Video-ensaios intimistas, psicologia, autoconhecimento |
| **Nathaniel Drew** | Video-ensaios introspectivos sobre identidade e mudança |
| **Rowena Tsai** | Autodesenvolvimento, identidade, vida com propósito |
| **For You From Eve** | Relacionamentos, limites, honestidade sem filtro |
| **Tina Huang** | Data science, carreira em tech, perspectiva feminina |
| **Fireship** | Tech trends, formato dinâmico (referência de ritmo) |
| **Theo t3.gg** | Opiniões fortes, building in public (autenticidade) |
| **Ali Abdaal** | Estrutura e formato de vídeos longos (produção) |

## Público-Alvo

- Profissionais de TI e devs que sentem que falta algo além do técnico
- Pessoas em transição de carreira para tech
- Mulheres em tecnologia
- Curiosos sobre IA que querem entender o impacto na vida humana — não só no mercado

## Pré-requisitos

- **N8N** (self-hosted ou cloud) — v1.0+
- **OpenAI API Key** — com acesso ao GPT-4o
- **Notion** — Workspace com Integration configurada
- **Beehiiv** — Conta com acesso à API (para newsletter)
- **Node.js** — v16+ (apenas para `generate-workflows.js`)

## Setup Rápido

### 1. Credenciais no N8N

| Credencial | Tipo | Nome esperado |
|-----------|------|---------------|
| OpenAI | OpenAI API | Nome à sua escolha |
| Notion | Notion API | Nome à sua escolha |
| Beehiiv | Header Auth | `Beehiiv API` |

### 2. Database no Notion

Crie o database de YouTube com as propriedades listadas em [`docs/notion-setup.md`](docs/notion-setup.md).

Após criar o database, copie o ID e configure na variável de ambiente `NOTION_YOUTUBE_DB_ID` no N8N.

### 3. Importar o Workflow

1. Abra o N8N
2. **"+ Add Workflow"** → **"Import from File"**
3. Selecione `workflows/youtube-content.json`
4. Mapeie as credenciais (Notion + OpenAI)
5. Atualize o Database ID do Notion nos nodes
6. Ative o workflow

### 4. Usar o Gerador de Ideias

Dispare o webhook manualmente ou configure um trigger semanal. As 5 ideias aparecerão no Notion com status "Ideia".

### 5. Aprovar e Roteirizar

No Notion, mude o status de uma ideia para **"Aprovada"**. Em até 30 minutos, o roteirizador automático vai gerar o roteiro completo e salvar na mesma página.

## Pipeline de Conteúdo no Notion

```
Ideia ──► Aprovada ──► Roteirizada ──► Filmada ──► Publicada
  │           │             │              │            │
  │     (muda status    (automático,   (manual,     (manual,
  │      manualmente)    via N8N)      por Isis)    por Isis)
  │
  └── Rejeitada (descartada)
```

## Personalização

### Ajustar Prompts

Os prompts estão nos nodes `Preparar Prompt: YouTube` e `Preparar Prompt: Roteiro`. Para personalizar:

1. Abra o Code node no N8N
2. Edite `systemPrompt` (identidade/filosofia) ou `userPrompt` (regras/formato)
3. Teste com "Execute Node" antes de salvar

Documentação detalhada dos prompts: [`docs/prompts.md`](docs/prompts.md)

### Ajustar Modelo de IA

| Modelo | Uso recomendado | Custo |
|--------|----------------|-------|
| `gpt-4o` | Ideias e roteiros (padrão) | ~$0.50/execução |
| `gpt-4o-mini` | Testes rápidos | ~$0.05/execução |

### Ajustar Frequência

- **Gerador de ideias:** Webhook manual ou cron semanal
- **Roteirizador:** A cada 30 minutos (configurável no Schedule Trigger)

## Custos Estimados

| Componente | Frequência | Custo/mês |
|-----------|-----------|-----------|
| YouTube (ideias) | 1x/semana | ~$1-2 |
| YouTube (roteiros) | Sob demanda | ~$0.50/roteiro |
| Newsletter | 1x/dia | ~$15-25 |
| Instagram | 1x/dia | ~$3-5 |
| LinkedIn | 3x/semana | ~$2-3 |
| **Total** | | **~$22-36** |

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Notion erro 401 | Verifique se a Integration tem acesso ao database |
| OpenAI erro 429 | Rate limit — aumente o timeout ou adicione retry |
| Roteiro não gerado | Confirme que o status no Notion é exatamente `Aprovada` |
| Ideias repetidas | O prompt já filtra ideias existentes; verifique se o node Notion busca todas |
| JSON inválido do GPT | O código tem fallback com regex; se persistir, reduza `temperature` |

## Estrutura do Projeto

```
├── workflows/
│   ├── youtube-content.json           ← Workflow principal (gerador + roteirizador)
│   ├── 01-newsletter-pipeline.json    # Pipeline da newsletter (gerado)
│   ├── 02-instagram-content.json      # Posts Instagram (gerado)
│   └── 03-linkedin-content.json       # Posts LinkedIn (gerado)
├── docs/
│   ├── notion-setup.md                # Setup do database Notion
│   ├── youtube-workflow.md            # Documentação detalhada do workflow YouTube
│   └── prompts.md                     # Filosofia e prompts do canal
├── generate-workflows.js              # Script que gera workflows 01–03
└── README.md
```

## Documentação

- [`docs/notion-setup.md`](docs/notion-setup.md) — Como configurar o database no Notion
- [`docs/youtube-workflow.md`](docs/youtube-workflow.md) — Diagrama detalhado de cada node do workflow
- [`docs/prompts.md`](docs/prompts.md) — Filosofia do canal, regras de voz e estrutura dos prompts
