# YouTube Content Workflow — Documentacao Tecnica

Documentacao detalhada de cada node do workflow `youtube-content.json`, com explicacao do fluxo de dados, parametros de IA e logica de processamento.

## Visao Geral

O workflow contem **15 nodes** organizados em **dois fluxos paralelos** dentro do mesmo workflow N8N:

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
│ FLUXO 2: ROTEIRIZADOR AUTOMATICO (linha inferior, y=224)               │
│                                                                         │
│ Schedule ─► Preparar ─► Notion: Buscar ─► Tem Ideias? ─► Preparar ─►  │
│ (30 min)    Query       Aprovadas                         Prompt:      │
│                                                           Roteiro      │
│                                                              ─►        │
│                     OpenAI ─► Formatar ─► Notion: ─► Notion:           │
│                     Gerar     Roteiro     Atualizar   Adicionar         │
│                     Roteiro               Roteiro     na Pagina         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Fluxo 1: Gerador de Ideias

### Node 1: Webhook

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.webhook` |
| Path | `youtube-content-generator` |
| Metodo | GET (padrao) |

Ponto de entrada manual. Pode ser disparado por:
- Chamada HTTP direta a URL do webhook
- Outro workflow N8N (via HTTP Request)
- Ferramenta externa (Zapier, Make, cron job)

**Saida:** Dispara o fluxo sem dados especificos.

---

### Node 2: Notion: Ideias Existentes

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.notion` |
| Operacao | `getAll` (databasePage) |
| Database ID | `$env.NOTION_YOUTUBE_DB_ID` (variavel de ambiente) |
| Credencial | Sua credencial Notion |

Busca **todas** as paginas do database de YouTube para extrair titulos existentes e evitar repeticao.

**Saida:** Array de pages do Notion com todas as propriedades.

---

### Node 3: Preparar Prompt: YouTube

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.code` |
| Linguagem | JavaScript |

Logica principal:
1. Extrai titulos de todas as ideias existentes (campo `Name.title`)
2. Monta `systemPrompt` com toda a estrategia editorial do canal
3. Monta `userPrompt` com regras de geracao, distribuicao e criterios
4. Retorna o `requestBody` pronto para a API da OpenAI

**Parametros da IA:**

| Parametro | Valor | Por que |
|-----------|-------|---------|
| model | `gpt-4o` | Maxima qualidade para ideias criativas |
| temperature | `0.85` | Alta criatividade sem perder coerencia |
| max_tokens | `5000` | Espaco para 5 ideias detalhadas |
| response_format | `json_object` | Garante JSON valido na resposta |

**Saida:** Objeto com `existingIdeas` e `requestBody`.

---

### Node 4: OpenAI: Gerar Ideias YouTube

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.httpRequest` |
| URL | `https://api.openai.com/v1/chat/completions` |
| Metodo | POST |
| Timeout | 120.000ms (2 min) |
| Credencial | Sua credencial OpenAI |

Envia o prompt montado para o GPT-4o e recebe um JSON com 5 ideias.

**Estrutura de cada ideia na resposta:**

```json
{
  "title_suggestion": "Titulo que convida para jornada",
  "core_insight": "Insight central do video",
  "isis_real_moment": "Momento real da vida do creator como base",
  "emotional_takeaway": "O que o espectador vai sentir",
  "original_inspiration": "Canal/tendencia que inspirou",
  "target_audience": "Para quem fala",
  "estimated_length": "Duracao estimada",
  "format": "video-ensaio|storytelling|reflexao|diario-em-video|analise-pessoal",
  "hook_idea": "Como abrir o video nos primeiros 30s",
  "viral_potential": "Baixo|Medio|Alto",
  "authority_building": "Baixo|Medio|Alto",
  "keywords": ["keyword1", "keyword2"]
}
```

> **Nota:** O campo `isis_real_moment` e herdado da implementacao de referencia. Voce pode renomea-lo (ex: `personal_moment`, `real_experience`) atualizando o prompt no node 3, o parser no node 5, e o mapeamento no node 6.

---

### Node 5: Separar Ideias

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.code` |

Faz o parse do JSON retornado pela OpenAI e desmembra as 5 ideias em 5 itens individuais, cada um com campos normalizados para o Notion.

Possui fallback com regex caso o JSON nao faca parse direto.

**Saida:** 5 itens, cada um com: `title`, `inspiration`, `isisAngle`, `targetAudience`, `estimatedLength`, `format`, `hookIdea`, `viralPotential`, `authorityBuilding`, `keywords`, `date`, `ideaNumber`, `status`.

> **Nota:** O campo `isisAngle` e herdado da implementacao de referencia. Ele leva o valor de `core_insight` da resposta do GPT. Se renomear, atualize tambem o mapeamento no node 6.

---

### Node 6: Notion: Salvar Ideia YouTube

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.notion` |
| Operacao | `create` (databasePage) |

Cria uma pagina no Notion para cada ideia com todas as propriedades preenchidas. Tambem adiciona um bloco de texto com gancho, angulo editorial e inspiracao no corpo da pagina.

**Mapeamento de propriedades:**

| Notion | Origem |
|--------|--------|
| Name (title) | `$json.title` |
| Status | `Ideia` |
| Data | Data atual |
| Formato | `$json.format` |
| Inspiracao | `$json.inspiration` |
| Angulo Isis | `$json.isisAngle` |
| Publico-alvo | `$json.targetAudience` |
| Duracao Estimada | `$json.estimatedLength` |
| Potencial Viral | `$json.viralPotential` |
| Keywords | `$json.keywords` |

> **Nota:** A propriedade "Angulo Isis" no Notion pode ser renomeada para refletir a identidade do seu canal (ex: "Angulo Editorial", "Perspectiva do Creator"). Se renomear, atualize o nome da propriedade neste node tambem.

---

## Fluxo 2: Roteirizador Automatico

### Node 7: Verificar aprovados (Schedule Trigger)

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.scheduleTrigger` |
| Intervalo | A cada 30 minutos |

Dispara automaticamente. Quando o workflow esta ativo, este trigger roda continuamente verificando se ha ideias prontas para roteirizar.

---

### Node 8: Preparar Query Notion

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.code` |

Monta o body da query para a API do Notion:
- Filtra por `Status = "Aprovada"`
- Ordena por data de criacao (mais recente primeiro)
- Limita a 10 resultados

**Saida:** `notionDbId` e `requestBody` com filtro.

---

### Node 9: Notion: Buscar Aprovadas

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.httpRequest` |
| URL | `https://api.notion.com/v1/databases/{dbId}/query` |
| Metodo | POST |
| Header | `Notion-Version: 2022-06-28` |

Usa a API do Notion diretamente (nao o node nativo) para ter controle total sobre filtros e ordenacao.

---

### Node 10: Tem Ideias Aprovadas?

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.code` |

Verifica se ha resultados. Se `results.length === 0`, retorna array vazio (o fluxo para). Se ha resultados, desmembra cada pagina em um item separado.

---

### Node 11: Preparar Prompt: Roteiro

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.code` |

Logica principal:
1. Extrai titulo e todas as propriedades da ideia
2. Monta `systemPrompt` com identidade de roteirista e marcacoes especiais
3. Monta `userPrompt` com estrutura obrigatoria do roteiro (6 secoes)
4. Solicita extras: titulos A/B, thumbnails, tags, descricao

**Parametros da IA:**

| Parametro | Valor | Por que |
|-----------|-------|---------|
| model | `gpt-4o` | Maxima qualidade para roteiro longo |
| temperature | `0.75` | Criativo mas estruturado |
| max_tokens | `10000` | Roteiro completo + extras |
| response_format | `json_object` | Garante JSON valido |

**Saida:** `ideaTitle`, `ideaPageId`, `requestBody`.

---

### Node 12: OpenAI: Gerar Roteiro

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.httpRequest` |
| URL | `https://api.openai.com/v1/chat/completions` |
| Credencial | Sua credencial OpenAI |

Gera o roteiro completo. Sem timeout customizado (usa padrao do N8N).

---

### Node 13: Formatar Roteiro

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.code` |

O node mais complexo do fluxo. Responsavel por:

1. **Parse do JSON** da resposta OpenAI (com fallback regex)
2. **Montagem do Markdown** completo do roteiro com secoes:
   - Gancho, Intro, Desenvolvimento (blocos), Climax, CTA, Encerramento
   - Opcoes de titulo, sugestoes de thumbnail, tags, descricao
3. **Chunking** do texto em blocos de 2000 caracteres (limite do Notion API)
4. **Preparacao das propriedades** para atualizar no Notion:
   - Status → `Roteirizada`
   - Opcoes de Titulo, Tags YouTube, Duracao Estimada
5. **Preparacao dos blocos** Notion (array de paragrafos)

**Saida:** `ideaTitle`, `ideaPageId`, `fullScript`, `notionProperties`, `notionBlocks`, `date`.

---

### Node 14: Notion: Atualizar com Roteiro

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.httpRequest` |
| URL | `https://api.notion.com/v1/pages/{ideaPageId}` |
| Metodo | PATCH |

Atualiza as propriedades da pagina (status, titulos, tags, duracao).

---

### Node 15: Notion: Adicionar Roteiro na Pagina

| Campo | Valor |
|-------|-------|
| Tipo | `n8n-nodes-base.httpRequest` |
| URL | `https://api.notion.com/v1/blocks/{ideaPageId}/children` |
| Metodo | PATCH |

Adiciona o roteiro completo como blocos de paragrafo no corpo da pagina. O texto e dividido em chunks de 2000 caracteres para respeitar os limites da API do Notion.

---

## Diagrama de Dados

```
Fluxo 1:
  Notion Pages [] ──► titulos existentes ──► systemPrompt + userPrompt
                                               ──► OpenAI Response (5 ideias JSON)
                                               ──► 5 items normalizados
                                               ──► 5 paginas criadas no Notion

Fluxo 2:
  Notion Query (Status=Aprovada) ──► pages aprovadas
                                      ──► detalhes da ideia + systemPrompt + userPrompt
                                      ──► OpenAI Response (roteiro JSON)
                                      ──► Markdown formatado + propriedades + blocos
                                      ──► PATCH pagina (propriedades)
                                      ──► PATCH pagina (conteudo/blocos)
```

## Credenciais Necessarias

| Nome no N8N | Tipo | Usado em |
|-------------|------|----------|
| Sua credencial Notion | Notion API | Nodes 2, 6, 9, 14, 15 |
| Sua credencial OpenAI | OpenAI API | Nodes 4, 12 |

## Consideracoes Tecnicas

### Fallback de JSON

Todos os nodes que fazem parse de resposta do GPT tem dupla protecao:
```javascript
try {
  data = JSON.parse(content);
} catch (e) {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  data = jsonMatch ? JSON.parse(jsonMatch[0]) : fallback;
}
```

### Limite de caracteres do Notion

A API do Notion aceita no maximo 2000 caracteres por bloco `rich_text`. O node "Formatar Roteiro" divide automaticamente o texto em chunks de 2000 chars.

### Concorrencia

Se multiplas ideias estao com status "Aprovada", o roteirizador processa uma por vez (o node "Tem Ideias Aprovadas?" emite um item por pagina, e o N8N processa sequencialmente).

### Campos com nome da implementacao de referencia

Alguns campos no workflow carregam nomes da implementacao original (ex: `isis_real_moment`, `isisAngle`, "Angulo Isis"). Eles funcionam normalmente com qualquer canal. Se desejar renomear para algo mais generico:

1. Atualize o schema JSON no prompt do node `Preparar Prompt: YouTube`
2. Atualize o parser no node `Separar Ideias`
3. Atualize o mapeamento no node `Notion: Salvar Ideia YouTube`
4. Renomeie a propriedade correspondente no database do Notion
