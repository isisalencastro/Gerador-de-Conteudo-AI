# Anatomia dos Prompts e Customizacao Editorial

Este documento explica a estrutura dos prompts usados no workflow, o que cada secao faz, e como adaptar para qualquer canal ou nicho. Cada prompt e composto por blocos modulares que voce preenche com a identidade do seu canal.

Para um guia passo a passo de adaptacao, veja [`customization.md`](customization.md).

---

## Estrutura Geral

O sistema usa dois conjuntos de prompts, cada um com `systemPrompt` + `userPrompt`:

| Prompt | Node no N8N | Funcao |
|--------|-------------|--------|
| Gerador de Ideias | `Preparar Prompt: YouTube` | Define identidade editorial e gera 5 ideias |
| Roteirizador | `Preparar Prompt: Roteiro` | Define estilo de roteiro e gera roteiro completo |

### Anatomia de um prompt no sistema

```
systemPrompt = contexto permanente (quem e o canal, como pensa, como fala)
userPrompt   = instrucao especifica da tarefa (o que gerar, em que formato, com que regras)
```

O `systemPrompt` muda raramente — ele e a identidade do canal. O `userPrompt` muda com frequencia — e a instrucao de execucao.

---

## Prompt 1: Gerador de Ideias

### System Prompt — Estrutura

O system prompt do gerador de ideias e composto por 6 blocos. Cada bloco tem uma funcao especifica:

| # | Bloco | Funcao | Exemplo de conteudo |
|---|-------|--------|---------------------|
| 1 | **Identidade do creator** | Quem e voce, contexto profissional | "Desenvolvedora e gestora de automacoes" |
| 2 | **Filosofia central** | Posicionamento editorial — como voce se diferencia | "Nao ensino de cima. Documento minha jornada." |
| 3 | **Posicionamento** | O que a tecnologia/conteudo representa pra voce | "Tech como ferramenta de autoconhecimento" |
| 4 | **Pilares de conteudo** | 3-5 temas centrais do canal, em ordem de prioridade | "1. Evolucao documentada 2. Dev pessoal em tech..." |
| 5 | **Canais de referencia** | Inspiracoes com nota sobre o que cada um inspira | "pearlieee: video-ensaios intimistas" |
| 6 | **Publico-alvo** | Para quem voce fala especificamente | "Devs que sentem falta de algo alem do tecnico" |

#### Bloco 1 — Identidade do Creator

Descreva quem voce e em 2-3 linhas. Foque em papel profissional e area de atuacao.

```
Voce e assistente de criacao de conteudo para YouTube de [NOME].
[NOME] e [CARGO/AREA]. Construindo um canal na intersecao entre [TEMA A], [TEMA B] e [TEMA C].
```

#### Bloco 2 — Filosofia Central

Defina o enquadramento editorial do canal. Use contraste para deixar claro:

```
FILOSOFIA CENTRAL DO CANAL:
[NOME] NAO e [o que voce NAO e]. [NOME] e [o que voce E].

Diferenca:
- Expert tradicional: "Faca assim"
- [NOME]: "Eu tentei isso e aprendi tal coisa"
```

#### Bloco 3 — Posicionamento

O que seu conteudo representa alem do tema tecnico:

```
POSICIONAMENTO CENTRAL:
[NOME] usa [SEU TEMA] como ferramenta de:
- [VALOR 1]
- [VALOR 2]
- [VALOR 3]
```

#### Bloco 4 — Pilares de Conteudo

Liste 3-5 pilares em ordem de prioridade. Cada pilar deve ter nome + descricao curta:

```
PILARES DE CONTEUDO (em ordem de prioridade):
1. [PILAR] — [descricao do que esse pilar cobre]
2. [PILAR] — [descricao]
3. [PILAR] — [descricao]
```

#### Bloco 5 — Canais de Referencia

Canais que inspiram formato, tom ou abordagem:

```
CANAIS DE REFERENCIA:
- [Canal 1]: [o que extrair — formato, tom, estilo]
- [Canal 2]: [o que extrair]
```

#### Bloco 6 — Publico-Alvo

Quem assiste seu canal, descrito com especificidade:

```
PUBLICO-ALVO:
- [Segmento 1]
- [Segmento 2]
- [Segmento 3]
```

---

### User Prompt — Estrutura

O user prompt do gerador contem as instrucoes de execucao:

| # | Bloco | Funcao |
|---|-------|--------|
| 1 | **Data** | Data atual (injetada automaticamente) |
| 2 | **Regra principal** | Fio condutor de todas as ideias |
| 3 | **Regras de voz** | Exemplos do que evitar e buscar em titulos |
| 4 | **Ideias existentes** | Lista do Notion para evitar repeticao (injetada automaticamente) |
| 5 | **Distribuicao** | Proporcao entre pilares nas 5 ideias |
| 6 | **Criterios** | O que cada ideia precisa ter |
| 7 | **Formato JSON** | Schema de resposta com todos os campos |

#### Regras de Voz — Como Configurar

As regras de voz determinam o estilo dos titulos e abordagens. Defina:

**O que EVITAR:**
- Titulos que soam como tutorial ("Como fazer X")
- Listas prescritivas ("5 dicas para Y")
- Promessas de autoridade ("O guia definitivo de Z")

**O que BUSCAR:**
- Titulos que convidam para uma jornada ("O que X me ensinou sobre Y")
- Honestidade sobre o processo ("Estou tentando X — o que aprendi ate agora")
- Vulnerabilidade ("Por que parei de fazer Y")

Adapte esses exemplos para o tom do seu canal. Um canal tecnico pode buscar "O que quebrou quando tentei X em producao"; um canal pessoal pode buscar "O dia em que X mudou minha perspectiva".

#### Distribuicao das Ideias

Defina como as 5 ideias se dividem entre os pilares:

```
DISTRIBUICAO DAS 5 IDEIAS:
- 2x [pilar principal]
- 1x [pilar 2]
- 1x [pilar 3]
- 1x livre (experiencia marcante)
```

#### Formato JSON de Resposta

Cada ideia gera um objeto com estes campos:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `title_suggestion` | string | Titulo em portugues (tom de jornada) |
| `core_insight` | string | Insight ou virada central da ideia |
| `isis_real_moment` | string | Momento real da vida do creator como base — renomeie este campo se desejar |
| `emotional_takeaway` | string | O que o espectador vai sentir |
| `original_inspiration` | string | Canal/tendencia que inspirou |
| `target_audience` | string | Para quem fala especificamente |
| `estimated_length` | string | Duracao estimada |
| `format` | string | video-ensaio, storytelling, reflexao, diario-em-video, analise-pessoal |
| `hook_idea` | string | Como abrir nos primeiros 30 segundos |
| `viral_potential` | string | Baixo, Medio, Alto |
| `authority_building` | string | Baixo, Medio, Alto |
| `keywords` | string | Palavras-chave para SEO |

> **Nota:** Para renomear campos como `isis_real_moment`, voce precisa atualizar tambem o node `Separar Ideias` e o mapeamento no node `Notion: Salvar Ideia YouTube`.

### Parametros de IA

| Parametro | Valor | Razao |
|-----------|-------|-------|
| model | `gpt-4o` | Qualidade maxima |
| temperature | `0.85` | Alta criatividade — diminua para ideias mais conservadoras |
| max_tokens | `5000` | Espaco para 5 ideias detalhadas |
| response_format | `json_object` | JSON garantido |

---

## Prompt 2: Roteirizador

### System Prompt — Estrutura

O system prompt do roteirizador define o papel e estilo:

| # | Bloco | Funcao |
|---|-------|--------|
| 1 | **Papel** | "Voce e o roteirista de [NOME] para YouTube" |
| 2 | **Estilo** | Conversacional, dinamico, pessoal, profissional |
| 3 | **Marcacoes de producao** | Marcacoes especiais que o roteiro deve incluir |

#### Marcacoes de Producao

O roteirizador insere marcacoes no corpo do roteiro para facilitar gravacao e edicao:

| Marcacao | Uso |
|----------|-----|
| `[INSERIR HISTORIA PESSOAL: sugestao]` | Onde o creator adiciona vivencias proprias |
| `[NOTA DE PRODUCAO: descricao]` | B-roll, graficos, transicoes, zoom |
| `[GANCHO VISUAL: descricao]` | Destaque visual necessario |
| `[PAUSA DRAMATICA]` | Silencio intencional |
| `[MUDANCA DE ENERGIA]` | Mudanca de tom |

Voce pode adicionar novas marcacoes (ex: `[CORTE RAPIDO]`, `[TELA DIVIDIDA]`) editando o system prompt.

### User Prompt — Estrutura

O user prompt do roteirizador define a estrutura obrigatoria do roteiro:

| Secao | Timing | Conteudo |
|-------|--------|----------|
| **GANCHO** | 0:00-0:30 | Curiosidade imediata, dado impactante ou pergunta provocativa |
| **INTRO** | 0:30-1:30 | Contexto, apresentacao, historia pessoal de conexao com o tema |
| **DESENVOLVIMENTO** | 1:30-8:00 | 3-4 blocos com subtitulo, conteudo, historias e notas de producao |
| **CLIMAX** | 8:00-9:00 | Insight principal, momento "aha" que conecta tudo |
| **CTA** | 9:00-9:30 | Inscricao, newsletter, comentarios — natural, nao forcado |
| **ENCERRAMENTO** | 9:30-10:00 | Despedida pessoal, previa do proximo video |

#### Como Adaptar a Estrutura

- **Videos curtos (5 min):** Reduza o desenvolvimento para 2 blocos e ajuste os timings
- **Videos longos (20+ min):** Aumente para 5-6 blocos de desenvolvimento
- **Formato diferente:** Reescreva as secoes. Ex: um canal de reviews pode ter "Unboxing → Testes → Veredicto"

#### Extras Gerados

O roteirizador tambem gera:

- 3 opcoes de titulo (A/B test, SEO-friendly)
- 3 sugestoes de thumbnail (descricao visual + texto overlay)
- 10-15 tags para YouTube
- Descricao completa com timestamps

### Parametros de IA

| Parametro | Valor | Razao |
|-----------|-------|-------|
| model | `gpt-4o` | Qualidade maxima para texto longo |
| temperature | `0.75` | Criativo mas estruturado — aumente para roteiros mais ousados |
| max_tokens | `10000` | Roteiro completo + todos os extras |
| response_format | `json_object` | JSON garantido |

---

## Referencia Rapida de Ajustes

| O que mudar | Onde editar | Bloco |
|-------------|-------------|-------|
| Identidade do canal | `systemPrompt` de `Preparar Prompt: YouTube` | Bloco 1-3 |
| Pilares de conteudo | `systemPrompt` de `Preparar Prompt: YouTube` | Bloco 4 |
| Tom dos titulos | `userPrompt` de `Preparar Prompt: YouTube` | Regras de voz |
| Canais de referencia | `systemPrompt` de `Preparar Prompt: YouTube` | Bloco 5 |
| Publico-alvo | `systemPrompt` de `Preparar Prompt: YouTube` | Bloco 6 |
| Proporcao entre temas | `userPrompt` de `Preparar Prompt: YouTube` | Distribuicao |
| Estilo de roteiro | `systemPrompt` de `Preparar Prompt: Roteiro` | Bloco 2-3 |
| Secoes do roteiro | `userPrompt` de `Preparar Prompt: Roteiro` | Estrutura |
| Marcacoes de producao | `systemPrompt` de `Preparar Prompt: Roteiro` | Bloco 3 |

## Dicas de Ajuste

- Sempre teste com "Execute Node" no N8N antes de salvar
- Se o GPT retornar JSON invalido, reduza `temperature` para 0.7
- Se as ideias estiverem genericas, aumente `temperature` para 0.9
- Se o roteiro estiver curto, aumente `max_tokens`
- Para testar rapido e barato, mude o `model` para `gpt-4o-mini`
- Ao mudar campos do JSON de saida, atualize tambem os nodes `Separar Ideias` e `Notion: Salvar Ideia YouTube`
