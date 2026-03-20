# Filosofia, Voz e Prompts do Canal

Documentação da identidade do canal, regras de voz e estrutura dos prompts usados no workflow de YouTube. Este documento serve como referência para ajustar, expandir ou recriar prompts no N8N.

## Quem é Isis Alencastro

- Gestora de automações
- Desenvolvedora full-stack
- Analista de marketing
- Construindo um canal no YouTube na interseção entre **tecnologia, IA e desenvolvimento pessoal**

## Filosofia Central

> Isis NÃO é expert dando dicas. Isis é uma pessoa em evolução documentando sua jornada.

A diferença é fundamental:

| Expert tradicional | Isis |
|--------------------|------|
| "Faça assim" | "Eu tentei isso e aprendi tal coisa" |
| Ensina de cima | Caminha junto com o espectador |
| Tem respostas | Tem perguntas honestas e descobertas reais |

O canal é um **diário público de crescimento** — profissional E pessoal. O espectador não sai com um tutorial. Sai sentindo que **não está sozinho**.

## Posicionamento

Isis usa tecnologia como ferramenta de:
- **Autoconhecimento**
- **Produtividade consciente**
- **Construção de vida com propósito**

Mostra a jornada **real**: acertos, erros, crises e viradas. O tech é o contexto. O desenvolvimento pessoal é o coração.

## Pilares de Conteúdo

Em ordem de prioridade:

1. **Evolução Documentada** — mostrar quem ela era, quem está se tornando, o que mudou
2. **Autoconhecimento na jornada em tech** — o que aprender revela sobre si mesma
3. **Desenvolvimento Pessoal aplicado à vida em tech** — identidade profissional, síndrome do impostor, burnout, limites, propósito
4. **Produtividade Consciente** — sistemas que respeitam a vida, não apenas otimizam
5. **IA & Tech como gatilho de reflexão pessoal** — não como tema técnico isolado

## Público-Alvo

- Profissionais de TI e devs que sentem que falta algo além do técnico
- Pessoas em transição de carreira para tech
- Mulheres em tecnologia
- Curiosos sobre IA que querem entender o impacto na vida humana — não só no mercado

## Canais de Referência

| Canal | O que extrair |
|-------|--------------|
| **pearlieee** | Video-ensaios intimistas, psicologia, autoconhecimento e healing com tom pessoal |
| **Nathaniel Drew** | Video-ensaios introspectivos sobre identidade e mudança |
| **Rowena Tsai** | Autodesenvolvimento, identidade, vida com propósito |
| **For You From Eve** | Relacionamentos, limites, honestidade sem filtro |
| **Tina Huang** | Data science, carreira em tech, perspectiva feminina e honesta |
| **Fireship** | Tech trends, formato dinâmico — referência de ritmo |
| **Theo t3.gg** | Opiniões fortes, building in public — referência de autenticidade |
| **Ali Abdaal** | Estrutura e formato de vídeos longos — referência de produção |

---

## Regras de Voz

### O que EVITAR nos títulos

- "Como fazer X"
- "5 dicas para Y"
- "O guia definitivo de Z"
- Qualquer coisa que soe como tutorial ou lista prescritiva

### O que BUSCAR nos títulos

- "O que X me ensinou sobre mim mesma"
- "Quando percebi que Z mudou tudo"
- "Estou tentando X — o que aprendi até agora"
- "Por que parei de fazer Y (e o que isso revelou)"

### Princípio

Nenhuma ideia pode soar como "aprenda X comigo" ou "dicas de Y". Toda ideia deve soar como "isso aconteceu comigo e mudou algo" ou "estou descobrindo X e quero compartilhar". O título convida para uma **jornada**, não promete um **resultado**.

---

## Prompt: Gerador de Ideias

Usado no node `Preparar Prompt: YouTube`.

### System Prompt

Define a identidade completa do assistente:
- Quem é Isis (cargo, área)
- Filosofia central do canal (com exemplos de contraste expert vs. Isis)
- Posicionamento central
- 5 pilares de conteúdo com descrições
- 8 canais de referência com o que cada um inspira
- Público-alvo detalhado

### User Prompt

Regras de geração:
- Data do dia
- Regra principal: desenvolvimento pessoal como fio condutor
- Regras de voz com exemplos do que evitar e buscar
- Lista de ideias existentes (para evitar repetição)
- Distribuição das 5 ideias:
  - 2x autoconhecimento/identidade/emoções
  - 1x jornada de carreira
  - 1x uso consciente de tech/IA
  - 1x livre (experiência pessoal marcante)
- 5 critérios para cada ideia
- Formato JSON de resposta com 12 campos por ideia

### Parâmetros de IA

| Parâmetro | Valor | Razão |
|-----------|-------|-------|
| model | `gpt-4o` | Qualidade máxima |
| temperature | `0.85` | Alta criatividade |
| max_tokens | `5000` | Espaço para 5 ideias detalhadas |
| response_format | `json_object` | JSON garantido |

### Campos gerados por ideia

| Campo | Descrição |
|-------|-----------|
| `title_suggestion` | Título em português (jornada, não tutorial) |
| `core_insight` | Insight ou virada central |
| `isis_real_moment` | Momento real da vida da Isis como base |
| `emotional_takeaway` | O que o espectador vai sentir |
| `original_inspiration` | Canal/tendência que inspirou |
| `target_audience` | Para quem fala especificamente |
| `estimated_length` | Duração estimada |
| `format` | video-ensaio, storytelling, reflexão, diário-em-vídeo, análise-pessoal |
| `hook_idea` | Como abrir nos primeiros 30 segundos |
| `viral_potential` | Baixo, Médio, Alto |
| `authority_building` | Baixo, Médio, Alto |
| `keywords` | Palavras-chave para SEO |

---

## Prompt: Roteirizador

Usado no node `Preparar Prompt: Roteiro`.

### System Prompt

Define o papel de roteirista:
- Identidade: roteirista da Isis para YouTube
- Estilo: conversacional, dinâmico, pessoal, profissional
- 5 marcações especiais de produção:

| Marcação | Uso |
|----------|-----|
| `[INSERIR HISTÓRIA PESSOAL: sugestão]` | Onde Isis coloca vivências próprias |
| `[NOTA DE PRODUÇÃO: descrição]` | B-roll, gráficos, transições, zoom |
| `[GANCHO VISUAL: descrição]` | Destaque visual necessário |
| `[PAUSA DRAMÁTICA]` | Silêncio intencional |
| `[MUDANÇA DE ENERGIA]` | Mudança de tom |

### User Prompt

Estrutura obrigatória do roteiro:

1. **GANCHO (0:00-0:30)** — Primeiros 30 segundos. Curiosidade imediata, dado impactante ou pergunta provocativa. Nota de produção.

2. **INTRO (0:30-1:30)** — Contexto e promessa. Isis se apresenta. História pessoal de por que o tema importa.

3. **DESENVOLVIMENTO (1:30-8:00)** — 3-4 blocos, cada um com subtítulo, conteúdo, história pessoal (mínimo 2 blocos), notas de produção e transição.

4. **CLÍMAX (8:00-9:00)** — Insight principal, momento "aha" que conecta tudo.

5. **CTA (9:00-9:30)** — Inscrição, newsletter AI Pulse, comentários. Natural, não forçado.

6. **ENCERRAMENTO (9:30-10:00)** — Despedida pessoal, prévia do próximo vídeo.

### Extras solicitados

- 3 opções de título (A/B test, SEO-friendly)
- 3 sugestões de thumbnail (descrição visual + texto overlay)
- 10-15 tags para YouTube
- Descrição completa com timestamps

### Parâmetros de IA

| Parâmetro | Valor | Razão |
|-----------|-------|-------|
| model | `gpt-4o` | Qualidade máxima para texto longo |
| temperature | `0.75` | Criativo mas estruturado |
| max_tokens | `10000` | Roteiro completo + todos os extras |
| response_format | `json_object` | JSON garantido |

---

## Como Ajustar os Prompts

### Mudar a filosofia do canal

Edite o `systemPrompt` no node `Preparar Prompt: YouTube`. As seções relevantes são:
- `FILOSOFIA CENTRAL DO CANAL`
- `POSICIONAMENTO CENTRAL DE ISIS`
- `PILARES DE CONTEÚDO`

### Mudar o estilo das ideias

Edite o `userPrompt` no node `Preparar Prompt: YouTube`:
- `REGRA DE VOZ` — exemplos do que evitar/buscar
- `DISTRIBUIÇÃO DAS 5 IDEIAS` — proporção entre pilares
- `CRITÉRIOS PARA CADA IDEIA` — o que cada ideia precisa ter

### Mudar a estrutura do roteiro

Edite o `userPrompt` no node `Preparar Prompt: Roteiro`:
- `ESTRUTURA OBRIGATÓRIA` — seções e durações
- Adicione ou remova seções conforme o formato evolui

### Mudar os canais de referência

No `systemPrompt` do `Preparar Prompt: YouTube`, atualize a seção `CANAIS DE REFERÊNCIA`. Cada canal deve ter uma descrição do que ele inspira (formato, tom, estilo).

### Dicas gerais

- Sempre teste com "Execute Node" no N8N antes de salvar
- Se o GPT retornar JSON inválido, reduza `temperature` para 0.7
- Se as ideias estiverem genéricas, aumente `temperature` para 0.9
- Se o roteiro estiver curto, aumente `max_tokens`
- Para testar rápido e barato, mude o `model` para `gpt-4o-mini`
