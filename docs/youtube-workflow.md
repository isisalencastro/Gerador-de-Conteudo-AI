# YouTube Content Workflow — Documentação Técnica

Documentação detalhada de cada node do workflow `youtube-content.json`, com explicação do fluxo de dados, parâmetros de IA e lógica de processamento.

## Visão Geral

O workflow contém **15 nodes** organizados em **dois fluxos paralelos** dentro do mesmo workflow N8N:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ FLUXO 1: GERADOR DE IDEIAS (linha superior, y=0)                       │
│                                                                         │
│ Webhook ─► Notion: Ideias ─► Preparar Prompt ─► OpenAI ─► Separar ─►  │
│            Existentes         YouTube           Gerar      Ideias      │
│                                                 Ideias                  │
│                                                            ─► Notion:  │
│                                                         Salvar Ideia   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ FLUXO 2: ROTEIRIZADOR AUTOMÁTICO (linha inferior, y=224)               │
│                                                                         │
│ Schedule ─► Preparar ─► Notion: Buscar ─► Tem Ideias? ─► Preparar ─►  │
│ (30 min)    Query       Aprovadas                         Prompt:      │
│                                                           Roteiro      │
│                                                              ─►        │
│                     OpenAI ─► Formatar ─► Notion: ─► Notion:           │
│                     Gerar     Roteiro     Atualizar   Adicionar         │
│                     Roteiro               Roteiro     na Página         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Fluxo 1: Gerador de Ideias

### Node 1: Webhook

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.webhook` |
| Path | `youtube-content-generator` |
| Método | GET (padrão) |

Ponto de entrada manual. Pode ser disparado por:
- Chamada HTTP direta à URL do webhook
- Outro workflow N8N (via HTTP Request)
- Ferramenta externa (Zapier, Make, cron job)

**Saída:** Dispara o fluxo sem dados específicos.

---

### Node 2: Notion: Ideias Existentes

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.notion` |
| Operação | `getAll` (databasePage) |
| Database ID | `$env.NOTION_YOUTUBE_DB_ID` (variável de ambiente) |
| Credencial | Sua credencial Notion |

Busca **todas** as páginas do database de YouTube para extrair títulos existentes e evitar repetição.

**Saída:** Array de pages do Notion com todas as propriedades.

---

### Node 3: Preparar Prompt: YouTube

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.code` |
| Linguagem | JavaScript |

Lógica principal:
1. Extrai títulos de todas as ideias existentes (campo `Name.title`)
2. Monta `systemPrompt` com toda a filosofia do canal
3. Monta `userPrompt` com regras de geração, distribuição e critérios
4. Retorna o `requestBody` pronto para a API da OpenAI

**Parâmetros da IA:**

| Parâmetro | Valor | Por quê |
|-----------|-------|---------|
| model | `gpt-4o` | Máxima qualidade para ideias criativas |
| temperature | `0.85` | Alta criatividade sem perder coerência |
| max_tokens | `5000` | Espaço para 5 ideias detalhadas |
| response_format | `json_object` | Garante JSON válido na resposta |

**Saída:** Objeto com `existingIdeas` e `requestBody`.

---

### Node 4: OpenAI: Gerar Ideias YouTube

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.httpRequest` |
| URL | `https://api.openai.com/v1/chat/completions` |
| Método | POST |
| Timeout | 120.000ms (2 min) |
| Credencial | Sua credencial OpenAI |

Envia o prompt montado para o GPT-4o e recebe um JSON com 5 ideias.

**Estrutura de cada ideia na resposta:**

```json
{
  "title_suggestion": "Título que convida para jornada",
  "core_insight": "Insight central do vídeo",
  "isis_real_moment": "Momento real da vida da Isis",
  "emotional_takeaway": "O que o espectador vai sentir",
  "original_inspiration": "Canal/tendência que inspirou",
  "target_audience": "Para quem fala",
  "estimated_length": "Duração estimada",
  "format": "video-ensaio|storytelling|reflexão|diário-em-vídeo|análise-pessoal",
  "hook_idea": "Como abrir o vídeo nos primeiros 30s",
  "viral_potential": "Baixo|Médio|Alto",
  "authority_building": "Baixo|Médio|Alto",
  "keywords": ["keyword1", "keyword2"]
}
```

---

### Node 5: Separar Ideias

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.code` |

Faz o parse do JSON retornado pela OpenAI e desmembra as 5 ideias em 5 itens individuais, cada um com campos normalizados para o Notion.

Possui fallback com regex caso o JSON não faça parse direto.

**Saída:** 5 itens, cada um com: `title`, `inspiration`, `isisAngle`, `targetAudience`, `estimatedLength`, `format`, `hookIdea`, `viralPotential`, `authorityBuilding`, `keywords`, `date`, `ideaNumber`, `status`.

---

### Node 6: Notion: Salvar Ideia YouTube

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.notion` |
| Operação | `create` (databasePage) |

Cria uma página no Notion para cada ideia com todas as propriedades preenchidas. Também adiciona um bloco de texto com gancho, ângulo da Isis e inspiração no corpo da página.

**Mapeamento de propriedades:**

| Notion | Origem |
|--------|--------|
| Name (title) | `$json.title` |
| Status | `Ideia` |
| Data | Data atual |
| Formato | `$json.format` |
| Inspiração | `$json.inspiration` |
| Ângulo Isis | `$json.isisAngle` |
| Público-alvo | `$json.targetAudience` |
| Duração Estimada | `$json.estimatedLength` |
| Potencial Viral | `$json.viralPotential` |
| Keywords | `$json.keywords` |

---

## Fluxo 2: Roteirizador Automático

### Node 7: Verificar aprovados (Schedule Trigger)

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.scheduleTrigger` |
| Intervalo | A cada 30 minutos |

Dispara automaticamente. Quando o workflow está ativo, este trigger roda continuamente verificando se há ideias prontas para roteirizar.

---

### Node 8: Preparar Query Notion

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.code` |

Monta o body da query para a API do Notion:
- Filtra por `Status = "Aprovada"`
- Ordena por data de criação (mais recente primeiro)
- Limita a 10 resultados

**Saída:** `notionDbId` e `requestBody` com filtro.

---

### Node 9: Notion: Buscar Aprovadas

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.httpRequest` |
| URL | `https://api.notion.com/v1/databases/{dbId}/query` |
| Método | POST |
| Header | `Notion-Version: 2022-06-28` |

Usa a API do Notion diretamente (não o node nativo) para ter controle total sobre filtros e ordenação.

---

### Node 10: Tem Ideias Aprovadas?

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.code` |

Verifica se há resultados. Se `results.length === 0`, retorna array vazio (o fluxo para). Se há resultados, desmembra cada página em um item separado.

---

### Node 11: Preparar Prompt: Roteiro

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.code` |

Lógica principal:
1. Extrai título e todas as propriedades da ideia
2. Monta `systemPrompt` com identidade de roteirista e marcações especiais
3. Monta `userPrompt` com estrutura obrigatória do roteiro (6 seções)
4. Solicita extras: títulos A/B, thumbnails, tags, descrição

**Parâmetros da IA:**

| Parâmetro | Valor | Por quê |
|-----------|-------|---------|
| model | `gpt-4o` | Máxima qualidade para roteiro longo |
| temperature | `0.75` | Criativo mas estruturado |
| max_tokens | `10000` | Roteiro completo + extras |
| response_format | `json_object` | Garante JSON válido |

**Saída:** `ideaTitle`, `ideaPageId`, `requestBody`.

---

### Node 12: OpenAI: Gerar Roteiro

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.httpRequest` |
| URL | `https://api.openai.com/v1/chat/completions` |
| Credencial | Sua credencial OpenAI |

Gera o roteiro completo. Sem timeout customizado (usa padrão do N8N).

---

### Node 13: Formatar Roteiro

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.code` |

O node mais complexo do fluxo. Responsável por:

1. **Parse do JSON** da resposta OpenAI (com fallback regex)
2. **Montagem do Markdown** completo do roteiro com seções:
   - Gancho, Intro, Desenvolvimento (blocos), Clímax, CTA, Encerramento
   - Opções de título, sugestões de thumbnail, tags, descrição
3. **Chunking** do texto em blocos de 2000 caracteres (limite do Notion API)
4. **Preparação das propriedades** para atualizar no Notion:
   - Status → `Roteirizada`
   - Opções de Título, Tags YouTube, Duração Estimada
5. **Preparação dos blocos** Notion (array de parágrafos)

**Saída:** `ideaTitle`, `ideaPageId`, `fullScript`, `notionProperties`, `notionBlocks`, `date`.

---

### Node 14: Notion: Atualizar com Roteiro

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.httpRequest` |
| URL | `https://api.notion.com/v1/pages/{ideaPageId}` |
| Método | PATCH |

Atualiza as propriedades da página (status, títulos, tags, duração).

---

### Node 15: Notion: Adicionar Roteiro na Página

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.httpRequest` |
| URL | `https://api.notion.com/v1/blocks/{ideaPageId}/children` |
| Método | PATCH |

Adiciona o roteiro completo como blocos de parágrafo no corpo da página. O texto é dividido em chunks de 2000 caracteres para respeitar os limites da API do Notion.

---

## Diagrama de Dados

```
Fluxo 1:
  Notion Pages [] ──► títulos existentes ──► systemPrompt + userPrompt
                                               ──► OpenAI Response (5 ideias JSON)
                                               ──► 5 items normalizados
                                               ──► 5 páginas criadas no Notion

Fluxo 2:
  Notion Query (Status=Aprovada) ──► pages aprovadas
                                      ──► detalhes da ideia + systemPrompt + userPrompt
                                      ──► OpenAI Response (roteiro JSON)
                                      ──► Markdown formatado + propriedades + blocos
                                      ──► PATCH página (propriedades)
                                      ──► PATCH página (conteúdo/blocos)
```

## Credenciais Necessárias

| Nome no N8N | Tipo | Usado em |
|-------------|------|----------|
| Sua credencial Notion | Notion API | Nodes 2, 6, 9, 14, 15 |
| Sua credencial OpenAI | OpenAI API | Nodes 4, 12 |

## Considerações Técnicas

### Fallback de JSON

Todos os nodes que fazem parse de resposta do GPT têm dupla proteção:
```javascript
try {
  data = JSON.parse(content);
} catch (e) {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  data = jsonMatch ? JSON.parse(jsonMatch[0]) : fallback;
}
```

### Limite de caracteres do Notion

A API do Notion aceita no máximo 2000 caracteres por bloco `rich_text`. O node "Formatar Roteiro" divide automaticamente o texto em chunks de 2000 chars.

### Concorrência

Se múltiplas ideias estão com status "Aprovada", o roteirizador processa uma por vez (o node "Tem Ideias Aprovadas?" emite um item por página, e o N8N processa sequencialmente).
