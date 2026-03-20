# Guia de Adaptacao para Novos Creators

Este guia explica como adaptar o sistema para qualquer canal ou nicho. O workflow e um template — voce preenche com a identidade do seu canal e ele gera conteudo alinhado com sua estrategia.

## O Que E Fixo vs O Que Voce Adapta

### Fixo (nao precisa mexer)

- Estrutura do workflow (nodes, conexoes, logica de processamento)
- Integracao com Notion API e OpenAI API
- Fallback de JSON, chunking de texto, pipeline de status
- Schedule trigger do roteirizador (30 min)
- Formato de saida (JSON → Notion pages)

### Voce adapta

- Identidade editorial (quem voce e, como fala)
- Pilares de conteudo (sobre o que voce cria)
- Voz e tom (como seus titulos e roteiros soam)
- Canais de referencia (quem inspira formato e abordagem)
- Publico-alvo (para quem voce fala)
- Estrutura do roteiro (secoes, timing, marcacoes)
- Formatos de video (os tipos que voce produz)
- Propriedades do Notion (nomes de campos, opcoes de select)

---

## Passo a Passo

### 1. Defina Seu Perfil Editorial

Antes de tocar no N8N, responda estas perguntas:

| Pergunta | Exemplo |
|----------|---------|
| Quem e voce profissionalmente? | "Designer de produto e ilustradora" |
| Qual a intersecao do seu canal? | "Design, criatividade e saude mental" |
| Voce ensina ou documenta? | "Documento meu processo criativo" |
| Qual seu diferencial? | "Mostro o lado real do trabalho criativo, nao so o portfolio bonito" |
| Quais seus 3-5 pilares de conteudo? | "1. Processo criativo 2. Saude mental em tech 3. Ferramentas de design" |
| Para quem voce fala? | "Designers juniores, pessoas em transicao de carreira para design" |
| Quais canais te inspiram? | "The Futur (formato), Charli Marie (tom), Juxtopposed (ritmo)" |

### 2. Edite o System Prompt do Gerador de Ideias

No N8N, abra o node **`Preparar Prompt: YouTube`** e edite o `systemPrompt` no codigo JavaScript.

Substitua cada bloco com as informacoes do seu canal:

```javascript
const systemPrompt = `
Voce e assistente de criacao de conteudo para YouTube de [SEU NOME].
[SEU NOME] e [SEU CARGO/AREA]. Construindo um canal na intersecao entre
[TEMA A], [TEMA B] e [TEMA C].

FILOSOFIA CENTRAL DO CANAL:
[SEU NOME] NAO e [o que voce NAO e].
[SEU NOME] e [o que voce E].

Diferenca:
- Expert tradicional: "[exemplo do que experts fazem]"
- [SEU NOME]: "[exemplo do que voce faz diferente]"

POSICIONAMENTO CENTRAL:
[SEU NOME] usa [SEU TEMA] como ferramenta de:
- [VALOR 1]
- [VALOR 2]
- [VALOR 3]

PILARES DE CONTEUDO (em ordem de prioridade):
1. [PILAR 1] — [descricao]
2. [PILAR 2] — [descricao]
3. [PILAR 3] — [descricao]
4. [PILAR 4] — [descricao] (opcional)
5. [PILAR 5] — [descricao] (opcional)

CANAIS DE REFERENCIA:
- [Canal 1]: [o que extrair — formato, tom, estilo]
- [Canal 2]: [o que extrair]
- [Canal 3]: [o que extrair]

PUBLICO-ALVO:
- [Segmento 1]
- [Segmento 2]
- [Segmento 3]
`;
```

### 3. Edite o User Prompt do Gerador de Ideias

No mesmo node, edite o `userPrompt`. Os pontos principais:

**Regras de voz** — adapte os exemplos para o tom do seu canal:

```
REGRA DE VOZ:
- EVITAR: "[exemplos de titulos que NAO combinam com seu canal]"
- BUSCAR: "[exemplos de titulos que combinam]"
- PRINCIPIO: [descreva o efeito que seus titulos devem causar]
```

**Distribuicao das ideias** — ajuste a proporcao entre pilares:

```
DISTRIBUICAO DAS 5 IDEIAS:
- 2x [seu pilar principal]
- 1x [pilar 2]
- 1x [pilar 3]
- 1x livre
```

### 4. Edite o System Prompt do Roteirizador

No node **`Preparar Prompt: Roteiro`**, adapte:

- O nome do creator
- O estilo descrito (conversacional? tecnico? poetico?)
- As marcacoes de producao (adicione ou remova conforme precisar)

### 5. Edite o User Prompt do Roteirizador

Adapte a estrutura do roteiro para o formato dos seus videos:

**Para videos curtos (5-8 min):**
```
1. GANCHO (0:00-0:15)
2. CONTEXTO (0:15-1:00)
3. CONTEUDO PRINCIPAL (1:00-5:00) — 2-3 blocos
4. CONCLUSAO (5:00-5:30)
5. CTA (5:30-5:45)
```

**Para videos longos (15-25 min):**
```
1. GANCHO (0:00-0:30)
2. INTRO (0:30-2:00)
3. DESENVOLVIMENTO (2:00-18:00) — 5-6 blocos
4. CLIMAX (18:00-20:00)
5. CTA (20:00-21:00)
6. ENCERRAMENTO (21:00-22:00)
```

**Para reviews/tutoriais:**
```
1. GANCHO (0:00-0:20)
2. VISAO GERAL (0:20-1:30)
3. DEMONSTRACAO (1:30-8:00) — passo a passo
4. PROS E CONTRAS (8:00-9:00)
5. VEREDICTO (9:00-9:30)
6. CTA (9:30-10:00)
```

### 6. Ajuste o Database do Notion

No database de YouTube, adapte:

| O que mudar | Como |
|-------------|------|
| **Formatos** (Select) | Troque `video-ensaio`, `storytelling` etc. pelos formatos do seu canal |
| **Angulo Isis** (Rich Text) | Renomeie para "Angulo Editorial", "Perspectiva", ou algo que faca sentido |
| **Status** (Select) | Adicione estagios se precisar (ex: "Em Revisao", "Agendado") |

Se renomear "Angulo Isis" no Notion, atualize tambem:
1. O nome da propriedade no node `Notion: Salvar Ideia YouTube` (propertiesUi)
2. O campo `isisAngle` no node `Separar Ideias` (opcional, so afeta legibilidade interna)

### 7. Configure as Variaveis de Ambiente

No N8N (Settings → Variables):

| Variavel | Valor |
|----------|-------|
| `NOTION_YOUTUBE_DB_ID` | ID do seu database (formato UUID) |

Veja [`notion-setup.md`](notion-setup.md) para como obter o ID.

---

## Exemplos por Nicho

### Canal de Tecnologia / Dev

```
Pilares: 1. Experiencias reais em producao 2. Carreira em tech 3. Ferramentas e stack
Voz: "O que quebrou quando migrei para X" / "3 meses usando Y — minha experiencia honesta"
Formatos: tutorial-narrado, experiencia, review, live-coding
Canais ref: Fireship (ritmo), Theo t3.gg (opiniao), ThePrimeagen (autenticidade)
```

### Canal de Desenvolvimento Pessoal

```
Pilares: 1. Habitos e rotinas 2. Saude mental 3. Produtividade consciente
Voz: "O habito que mudou minha relacao com trabalho" / "Por que parei de otimizar tudo"
Formatos: video-ensaio, reflexao, diario-em-video, storytelling
Canais ref: Ali Abdaal (estrutura), Matt D'Avella (estetica), Nathaniel Drew (profundidade)
```

### Canal de Design / Criativo

```
Pilares: 1. Processo criativo 2. Ferramentas de design 3. Carreira criativa
Voz: "Meu processo real de criar X" / "O que 5 anos de design me ensinaram sobre Y"
Formatos: process-video, tutorial-criativo, review, antes-e-depois
Canais ref: The Futur (formato), Charli Marie (tom), Juxtopposed (energia)
```

### Canal de Financas / Negocios

```
Pilares: 1. Experiencias de empreendedorismo 2. Educacao financeira 3. Mentalidade
Voz: "Quanto gastei para X e o que aprendi" / "O erro financeiro que me ensinou Y"
Formatos: analise, storytelling, caso-real, painel
Canais ref: Graham Stephan (formato), Alex Hormozi (energia), My First Million (tom)
```

---

## Checklist de Adaptacao

Use esta lista para garantir que voce adaptou tudo:

- [ ] Respondeu as perguntas do Perfil Editorial (passo 1)
- [ ] Editou o `systemPrompt` no node `Preparar Prompt: YouTube`
- [ ] Editou o `userPrompt` no node `Preparar Prompt: YouTube` (regras de voz + distribuicao)
- [ ] Editou o `systemPrompt` no node `Preparar Prompt: Roteiro`
- [ ] Editou o `userPrompt` no node `Preparar Prompt: Roteiro` (estrutura do roteiro)
- [ ] Ajustou os formatos no Select "Formato" do Notion
- [ ] Renomeou propriedades do Notion se necessario (ex: "Angulo Isis")
- [ ] Configurou `NOTION_YOUTUBE_DB_ID` no N8N
- [ ] Mapeou credenciais (Notion + OpenAI) no workflow importado
- [ ] Testou o Gerador de Ideias (disparo manual do webhook)
- [ ] Verificou se as ideias apareceram no Notion
- [ ] Aprovou uma ideia e esperou o roteirizador rodar
- [ ] Verificou se o roteiro foi adicionado na pagina

---

## Dicas

- **Comece simples.** Adapte os textos dos prompts primeiro, teste, e depois refine.
- **Nao mude a estrutura dos nodes.** Os nodes, conexoes e logica de processamento ja funcionam — voce so precisa mudar o conteudo dos prompts.
- **Teste com `gpt-4o-mini`.** E 10x mais barato e serve bem para validar que a estrutura esta certa antes de usar o modelo completo.
- **Itere nos prompts.** Gere ideias, veja o que saiu, ajuste os prompts, repita. As primeiras 2-3 rodadas sao de calibracao.
- **O roteirizador depende das ideias.** Se as ideias estiverem fracas, o roteiro tambem sera. Invista mais tempo nos prompts do gerador.
