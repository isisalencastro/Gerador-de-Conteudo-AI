#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const WORKFLOWS_DIR = path.join(__dirname, 'workflows');

// ============================================================
// WORKFLOW 1: NEWSLETTER PIPELINE (Diário às 15h)
// ============================================================
function buildNewsletterPipeline() {
  const nodes = [
    {
      parameters: {
        rule: {
          interval: [{ field: "cronExpression", expression: "0 15 * * *" }]
        }
      },
      id: "schedule-newsletter",
      name: "Diário às 15h",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [250, 300]
    },
    {
      parameters: {
        resource: "databasePage",
        operation: "getAll",
        databaseId: "={{ $env.NOTION_NEWSLETTER_DB_ID }}",
        returnAll: false,
        limit: 30,
        options: {}
      },
      id: "notion-get-previous",
      name: "Notion: Edições Anteriores",
      type: "n8n-nodes-base.notion",
      typeVersion: 2.2,
      position: [500, 300],
      credentials: {
        notionApi: { id: "notion-cred", name: "Notion" }
      }
    },
    {
      parameters: {
        jsCode: `
const previousTopics = [];
for (const item of items) {
  const props = item.json.properties || {};
  const titleArr = props.Name?.title || [];
  if (titleArr.length > 0) previousTopics.push(titleArr[0].plain_text);
  const topicsArr = props.Topics?.multi_select || [];
  for (const t of topicsArr) previousTopics.push(t.name);
}
const uniqueTopics = [...new Set(previousTopics)];
const today = new Date().toLocaleDateString('pt-BR');

const systemPrompt = [
  'Você é um curador de notícias especializado em Inteligência Artificial e Tecnologia.',
  'Sua missão é identificar os 10 acontecimentos mais relevantes e impactantes das últimas 24 a 48 horas.',
  'Foque APENAS em fatos concretos e verificáveis — não inclua rumores ou especulações.',
  'Priorize: lançamentos de modelos de IA, atualizações de produtos, aquisições, parcerias estratégicas,',
  'pesquisas publicadas, mudanças regulatórias e marcos tecnológicos.'
].join(' ');

const userPrompt = [
  'Data de hoje: ' + today,
  '',
  'Identifique os 10 tópicos mais relevantes das últimas 24-48 horas em IA e tecnologia.',
  '',
  'Categorias aceitas: IA, Cloud, Dev, Negócios, Regulação',
  '',
  'Tópicos já cobertos anteriormente (EVITAR repetição):',
  uniqueTopics.length > 0 ? uniqueTopics.join(', ') : 'Nenhum registro anterior',
  '',
  'Retorne APENAS um JSON válido sem markdown, no formato:',
  '{',
  '  "topics": [',
  '    {',
  '      "title": "Título conciso do acontecimento",',
  '      "category": "IA|Cloud|Dev|Negócios|Regulação",',
  '      "summary": "1-2 frases objetivas sobre o que aconteceu"',
  '    }',
  '  ]',
  '}'
].join('\\n');

return [{
  json: {
    previousTopics: uniqueTopics,
    requestBody: {
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }
  }
}];
`.trim()
      },
      id: "code-prepare-topics",
      name: "Preparar Prompt: Tópicos",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [750, 300]
    },
    {
      parameters: {
        method: "POST",
        url: "https://api.openai.com/v1/chat/completions",
        authentication: "predefinedCredentialType",
        nodeCredentialType: "openAiApi",
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.requestBody) }}",
        options: { timeout: 120000 }
      },
      id: "openai-topics",
      name: "OpenAI: Descobrir Tópicos",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1000, 300],
      credentials: {
        openAiApi: { id: "openai-cred", name: "OpenAI" }
      }
    },
    {
      parameters: {
        jsCode: `
const response = items[0].json;
const content = response.choices[0].message.content;
let topicsData;
try {
  topicsData = JSON.parse(content);
} catch (e) {
  const jsonMatch = content.match(/\\{[\\s\\S]*\\}/);
  topicsData = jsonMatch ? JSON.parse(jsonMatch[0]) : { topics: [] };
}

const topics = topicsData.topics || [];
const topicsSummary = topics.map((t, i) =>
  (i + 1) + '. [' + t.category + '] ' + t.title + ' — ' + t.summary
).join('\\n');

const systemPrompt = [
  'Você é um pesquisador investigativo de tecnologia com acesso a conhecimento atualizado.',
  'Para cada tópico fornecido, elabore uma pesquisa aprofundada e factual.',
  'Inclua contexto histórico, impacto no mercado, players envolvidos e referências de fontes',
  'como TechCrunch, The Verge, MIT Technology Review, Ars Technica e blogs oficiais.'
].join(' ');

const userPrompt = [
  'Faça deep research sobre cada um dos tópicos abaixo.',
  '',
  'TÓPICOS:',
  topicsSummary,
  '',
  'Para CADA tópico, forneça:',
  '- detailed_summary: Resumo detalhado (3-4 parágrafos)',
  '- historical_context: Contexto histórico relevante',
  '- market_impact: Impacto no mercado e na indústria',
  '- key_players: Empresas e pessoas envolvidas',
  '- sources: Lista de fontes reais (URLs quando possível)',
  '',
  'Retorne APENAS JSON válido sem markdown:',
  '{',
  '  "research": [',
  '    {',
  '      "title": "...",',
  '      "category": "...",',
  '      "detailed_summary": "...",',
  '      "historical_context": "...",',
  '      "market_impact": "...",',
  '      "key_players": ["..."],',
  '      "sources": ["..."]',
  '    }',
  '  ]',
  '}'
].join('\\n');

return [{
  json: {
    topics: topics,
    requestBody: {
      model: 'gpt-4o',
      temperature: 0.5,
      max_tokens: 10000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }
  }
}];
`.trim()
      },
      id: "code-prepare-research",
      name: "Preparar Prompt: Pesquisa",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1250, 300]
    },
    {
      parameters: {
        method: "POST",
        url: "https://api.openai.com/v1/chat/completions",
        authentication: "predefinedCredentialType",
        nodeCredentialType: "openAiApi",
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.requestBody) }}",
        options: { timeout: 180000 }
      },
      id: "openai-research",
      name: "OpenAI: Deep Research",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1500, 300],
      credentials: {
        openAiApi: { id: "openai-cred", name: "OpenAI" }
      }
    },
    {
      parameters: {
        jsCode: `
const response = items[0].json;
const content = response.choices[0].message.content;
let researchData;
try {
  researchData = JSON.parse(content);
} catch (e) {
  const jsonMatch = content.match(/\\{[\\s\\S]*\\}/);
  researchData = jsonMatch ? JSON.parse(jsonMatch[0]) : { research: [] };
}

const research = researchData.research || [];
const today = new Date().toLocaleDateString('pt-BR', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

const researchText = research.map(r => [
  '## ' + r.title + ' [' + r.category + ']',
  '',
  '### Resumo',
  r.detailed_summary,
  '',
  '### Contexto Histórico',
  r.historical_context,
  '',
  '### Impacto no Mercado',
  r.market_impact,
  '',
  '### Players Envolvidos',
  (r.key_players || []).join(', '),
  '',
  '### Fontes',
  (r.sources || []).join('\\n'),
  ''
].join('\\n')).join('\\n---\\n');

const systemPrompt = [
  'Você é a Isis Alencastro, redatora da newsletter "AI Pulse" da IBACompany.',
  'Seu tom é inteligente mas acessível — como uma conversa informada entre colegas de tecnologia.',
  'Use dados concretos, evite hype vazio. Seja analítica e perspicaz.',
  'Você conecta fatos técnicos com impactos reais para profissionais e empresas.'
].join(' ');

const userPrompt = [
  'Escreva a edição de hoje (' + today + ') da newsletter AI Pulse.',
  '',
  'PESQUISA BASE:',
  researchText,
  '',
  'ESTRUTURA OBRIGATÓRIA DA NEWSLETTER:',
  '',
  '1. TÍTULO: Chamativo, que capture a essência do dia em IA/tech (máx 80 caracteres)',
  '',
  '2. RESUMO EXECUTIVO: 3-4 parágrafos resumindo os destaques do dia de forma envolvente.',
  '   Comece com o fato mais impactante. Crie narrativa que conecte os acontecimentos.',
  '',
  '3. SEÇÕES POR CATEGORIA: Agrupe as notícias em seções (IA, Cloud, Dev, Negócios, Regulação).',
  '   Cada notícia deve ter:',
  '   - Título da notícia',
  '   - Resumo de 2-3 parágrafos com fatos e análise',
  '   - "Por que isso importa:" com análise de impacto (1-2 parágrafos)',
  '',
  '4. PENSAMENTO DO DIA: Escolha o tema mais relevante e escreva uma análise aprofundada',
  '   de 4-5 parágrafos. Conecte com tendências maiores do mercado. Reflita sobre o impacto',
  '   para profissionais de tecnologia. Este é o diferencial da newsletter.',
  '',
  '5. ENCERRAMENTO: Despedida pessoal da Isis, com prévia do próximo dia.',
  '',
  'Retorne APENAS JSON válido:',
  '{',
  '  "title": "Título da newsletter",',
  '  "executive_summary": "Resumo executivo completo",',
  '  "sections": [',
  '    {',
  '      "category": "Nome da categoria",',
  '      "articles": [',
  '        {',
  '          "title": "Título do artigo",',
  '          "content": "Conteúdo completo",',
  '          "why_it_matters": "Análise de impacto"',
  '        }',
  '      ]',
  '    }',
  '  ],',
  '  "thought_of_the_day": {',
  '    "title": "Título do pensamento",',
  '    "content": "Análise aprofundada completa"',
  '  },',
  '  "closing": "Texto de encerramento",',
  '  "topics_covered": ["lista", "de", "tópicos", "cobertos"]',
  '}'
].join('\\n');

return [{
  json: {
    research: research,
    requestBody: {
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 12000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }
  }
}];
`.trim()
      },
      id: "code-prepare-newsletter",
      name: "Preparar Prompt: Newsletter",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1750, 300]
    },
    {
      parameters: {
        method: "POST",
        url: "https://api.openai.com/v1/chat/completions",
        authentication: "predefinedCredentialType",
        nodeCredentialType: "openAiApi",
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.requestBody) }}",
        options: { timeout: 180000 }
      },
      id: "openai-newsletter",
      name: "OpenAI: Escrever Newsletter",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [2000, 300],
      credentials: {
        openAiApi: { id: "openai-cred", name: "OpenAI" }
      }
    },
    {
      parameters: {
        jsCode: `
const response = items[0].json;
const content = response.choices[0].message.content;
let newsletter;
try {
  newsletter = JSON.parse(content);
} catch (e) {
  const jsonMatch = content.match(/\\{[\\s\\S]*\\}/);
  newsletter = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
}

const today = new Date().toISOString().split('T')[0];

let htmlContent = '<h1>' + (newsletter.title || 'AI Pulse') + '</h1>';
htmlContent += '<div class="executive-summary">' + (newsletter.executive_summary || '').replace(/\\n/g, '<br>') + '</div>';
htmlContent += '<hr>';

if (newsletter.sections) {
  for (const section of newsletter.sections) {
    htmlContent += '<h2>' + section.category + '</h2>';
    for (const article of (section.articles || [])) {
      htmlContent += '<h3>' + article.title + '</h3>';
      htmlContent += '<p>' + article.content.replace(/\\n/g, '<br>') + '</p>';
      htmlContent += '<p><strong>Por que isso importa:</strong> ' + article.why_it_matters.replace(/\\n/g, '<br>') + '</p>';
      htmlContent += '<hr>';
    }
  }
}

if (newsletter.thought_of_the_day) {
  htmlContent += '<h2>💡 Pensamento do Dia: ' + newsletter.thought_of_the_day.title + '</h2>';
  htmlContent += '<p>' + newsletter.thought_of_the_day.content.replace(/\\n/g, '<br>') + '</p>';
}

if (newsletter.closing) {
  htmlContent += '<hr><p><em>' + newsletter.closing.replace(/\\n/g, '<br>') + '</em></p>';
}

let markdownContent = '# ' + (newsletter.title || 'AI Pulse') + '\\n\\n';
markdownContent += newsletter.executive_summary + '\\n\\n---\\n\\n';
if (newsletter.sections) {
  for (const section of newsletter.sections) {
    markdownContent += '## ' + section.category + '\\n\\n';
    for (const article of (section.articles || [])) {
      markdownContent += '### ' + article.title + '\\n\\n';
      markdownContent += article.content + '\\n\\n';
      markdownContent += '**Por que isso importa:** ' + article.why_it_matters + '\\n\\n---\\n\\n';
    }
  }
}
if (newsletter.thought_of_the_day) {
  markdownContent += '## 💡 Pensamento do Dia: ' + newsletter.thought_of_the_day.title + '\\n\\n';
  markdownContent += newsletter.thought_of_the_day.content + '\\n\\n';
}
if (newsletter.closing) {
  markdownContent += '---\\n\\n*' + newsletter.closing + '*\\n';
}

return [{
  json: {
    title: newsletter.title || 'AI Pulse - ' + today,
    date: today,
    htmlContent: htmlContent,
    markdownContent: markdownContent,
    topicsCovered: newsletter.topics_covered || [],
    newsletterData: newsletter,
    status: 'Revisar'
  }
}];
`.trim()
      },
      id: "code-format-output",
      name: "Formatar Newsletter",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [2250, 300]
    },
    {
      parameters: {
        resource: "databasePage",
        operation: "create",
        databaseId: "={{ $env.NOTION_NEWSLETTER_DB_ID }}",
        title: "={{ $json.title }}",
        propertiesUi: {
          propertyValues: [
            {
              key: "Status|select",
              selectValue: "Revisar"
            },
            {
              key: "Data|date",
              date: "={{ $json.date }}"
            }
          ]
        },
        blockUi: {
          blockValues: [
            {
              type: "paragraph",
              richText: false,
              textContent: "={{ $json.markdownContent }}"
            }
          ]
        },
        options: {}
      },
      id: "notion-save-newsletter",
      name: "Notion: Salvar Newsletter",
      type: "n8n-nodes-base.notion",
      typeVersion: 2.2,
      position: [2500, 300],
      credentials: {
        notionApi: { id: "notion-cred", name: "Notion" }
      }
    },
    {
      parameters: {
        method: "POST",
        url: "https://api.beehiiv.com/v2/publications/{{ $env.BEEHIIV_PUBLICATION_ID }}/posts",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={{ JSON.stringify({
  title: $('Formatar Newsletter').item.json.title,
  subtitle: 'AI Pulse - Newsletter diária de IA e Tecnologia',
  content: $('Formatar Newsletter').item.json.htmlContent,
  status: 'draft'
}) }}`,
        options: {}
      },
      id: "beehiiv-publish",
      name: "Beehiiv: Publicar Newsletter",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [2750, 300],
      credentials: {
        httpHeaderAuth: { id: "beehiiv-cred", name: "Beehiiv API" }
      }
    }
  ];

  const connections = {
    "Diário às 15h": {
      main: [[{ node: "Notion: Edições Anteriores", type: "main", index: 0 }]]
    },
    "Notion: Edições Anteriores": {
      main: [[{ node: "Preparar Prompt: Tópicos", type: "main", index: 0 }]]
    },
    "Preparar Prompt: Tópicos": {
      main: [[{ node: "OpenAI: Descobrir Tópicos", type: "main", index: 0 }]]
    },
    "OpenAI: Descobrir Tópicos": {
      main: [[{ node: "Preparar Prompt: Pesquisa", type: "main", index: 0 }]]
    },
    "Preparar Prompt: Pesquisa": {
      main: [[{ node: "OpenAI: Deep Research", type: "main", index: 0 }]]
    },
    "OpenAI: Deep Research": {
      main: [[{ node: "Preparar Prompt: Newsletter", type: "main", index: 0 }]]
    },
    "Preparar Prompt: Newsletter": {
      main: [[{ node: "OpenAI: Escrever Newsletter", type: "main", index: 0 }]]
    },
    "OpenAI: Escrever Newsletter": {
      main: [[{ node: "Formatar Newsletter", type: "main", index: 0 }]]
    },
    "Formatar Newsletter": {
      main: [[{ node: "Notion: Salvar Newsletter", type: "main", index: 0 }]]
    },
    "Notion: Salvar Newsletter": {
      main: [[{ node: "Beehiiv: Publicar Newsletter", type: "main", index: 0 }]]
    }
  };

  return {
    name: "01 - Newsletter Pipeline (Diário 15h)",
    nodes,
    connections,
    active: false,
    settings: { executionOrder: "v1" },
    tags: [{ name: "newsletter" }, { name: "automação" }],
    pinData: {}
  };
}

// ============================================================
// WORKFLOW 2: INSTAGRAM CONTENT (Diário às 15h30)
// ============================================================
function buildInstagramContent() {
  const nodes = [
    {
      parameters: {
        rule: {
          interval: [{ field: "cronExpression", expression: "30 15 * * *" }]
        }
      },
      id: "schedule-instagram",
      name: "Diário às 15h30",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [250, 300]
    },
    {
      parameters: {
        resource: "databasePage",
        operation: "getAll",
        databaseId: "={{ $env.NOTION_NEWSLETTER_DB_ID }}",
        returnAll: false,
        limit: 1,
        sort: {
          sortValue: [{ key: "created_time", direction: "descending", timestamp: true }]
        },
        options: {}
      },
      id: "notion-get-newsletter",
      name: "Notion: Última Newsletter",
      type: "n8n-nodes-base.notion",
      typeVersion: 2.2,
      position: [500, 300],
      credentials: {
        notionApi: { id: "notion-cred", name: "Notion" }
      }
    },
    {
      parameters: {
        jsCode: `
const page = items[0].json;
const props = page.properties || {};
const title = props.Name?.title?.[0]?.plain_text || 'Newsletter do dia';

let pageContent = '';
if (page.body) {
  pageContent = page.body;
} else if (page.content) {
  pageContent = page.content;
} else {
  const allText = [];
  for (const [key, val] of Object.entries(props)) {
    if (val.rich_text) {
      const texts = val.rich_text.map(t => t.plain_text).join('');
      if (texts) allText.push(key + ': ' + texts);
    }
  }
  pageContent = allText.join('\\n\\n');
}

const systemPrompt = [
  'Você é o social media da IBACompany no Instagram.',
  'A IBACompany é a marca de desenvolvimento e IA da Isis Alencastro.',
  'Seu estilo é: moderno, dados em destaque, emojis estratégicos, linguagem direta e impactante.',
  'O objetivo de CADA post é gerar desejo pela newsletter paga "AI Pulse".',
  'NUNCA entregue tudo que a newsletter entrega — mostre um recorte que desperte curiosidade.',
  'O CTA sempre direciona para a assinatura da newsletter.'
].join(' ');

const userPrompt = [
  'NEWSLETTER DE HOJE:',
  'Título: ' + title,
  '',
  pageContent,
  '',
  '---',
  '',
  'Com base na newsletter acima, crie 3 posts para o Instagram da IBACompany.',
  '',
  'REGRAS PARA CADA POST:',
  '1. Extraia UM gancho específico da newsletter (uma notícia, dado ou insight)',
  '2. Entregue um recorte de valor — o suficiente para impressionar, não para saciar',
  '3. Termine com CTA forte para assinar a newsletter AI Pulse',
  '',
  'FORMATO DE CADA POST:',
  '- hook: Primeira linha que para o scroll (máx 15 palavras, impactante)',
  '- body: Corpo do post (máx 200 palavras, informativo e envolvente)',
  '- cta: Chamada para ação direcionando à newsletter',
  '- visual_json: JSON com instruções para design no Figma:',
  '  { "layout": "tipo", "highlight_data": "dado destaque", "colors": ["hex1","hex2"],',
  '    "emoji_accent": "emoji", "style": "moderno|tech|dados" }',
  '- hashtags: Array com 5-8 hashtags relevantes',
  '- carousel_slides: Se for carrossel, array com texto de cada slide (3-7 slides)',
  '',
  'ESTILOS VISUAIS VARIADOS — use pelo menos 2 formatos diferentes entre:',
  '- Carrossel educativo com dados',
  '- Post único com dado impactante em destaque',
  '- Formato "breaking news" para novidades quentes',
  '',
  'Retorne APENAS JSON válido:',
  '{',
  '  "posts": [',
  '    {',
  '      "hook": "...",',
  '      "body": "...",',
  '      "cta": "...",',
  '      "visual_json": { ... },',
  '      "hashtags": ["..."],',
  '      "format": "carousel|single|breaking",',
  '      "carousel_slides": ["..."] ',
  '    }',
  '  ]',
  '}'
].join('\\n');

return [{
  json: {
    newsletterTitle: title,
    requestBody: {
      model: 'gpt-4o',
      temperature: 0.8,
      max_tokens: 6000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }
  }
}];
`.trim()
      },
      id: "code-prepare-ig",
      name: "Preparar Prompt: Instagram",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [750, 300]
    },
    {
      parameters: {
        method: "POST",
        url: "https://api.openai.com/v1/chat/completions",
        authentication: "predefinedCredentialType",
        nodeCredentialType: "openAiApi",
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.requestBody) }}",
        options: { timeout: 120000 }
      },
      id: "openai-instagram",
      name: "OpenAI: Gerar Posts Instagram",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1000, 300],
      credentials: {
        openAiApi: { id: "openai-cred", name: "OpenAI" }
      }
    },
    {
      parameters: {
        jsCode: `
const response = items[0].json;
const content = response.choices[0].message.content;
let postsData;
try {
  postsData = JSON.parse(content);
} catch (e) {
  const jsonMatch = content.match(/\\{[\\s\\S]*\\}/);
  postsData = jsonMatch ? JSON.parse(jsonMatch[0]) : { posts: [] };
}

const posts = postsData.posts || [];
const today = new Date().toISOString().split('T')[0];

return posts.map((post, index) => ({
  json: {
    title: post.hook,
    body: post.body,
    cta: post.cta,
    visualJson: JSON.stringify(post.visual_json || {}),
    hashtags: (post.hashtags || []).join(' '),
    format: post.format || 'single',
    carouselSlides: JSON.stringify(post.carousel_slides || []),
    fullContent: post.hook + '\\n\\n' + post.body + '\\n\\n' + post.cta + '\\n\\n' + (post.hashtags || []).join(' '),
    date: today,
    postNumber: index + 1,
    status: 'Revisar'
  }
}));
`.trim()
      },
      id: "code-parse-ig",
      name: "Separar Posts",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1250, 300]
    },
    {
      parameters: {
        resource: "databasePage",
        operation: "create",
        databaseId: "={{ $env.NOTION_INSTAGRAM_DB_ID }}",
        title: "={{ 'IG #' + $json.postNumber + ' - ' + $json.title }}",
        propertiesUi: {
          propertyValues: [
            { key: "Status|select", selectValue: "Revisar" },
            { key: "Data|date", date: "={{ $json.date }}" },
            { key: "Formato|select", selectValue: "={{ $json.format }}" },
            { key: "Hashtags|rich_text", textContent: "={{ $json.hashtags }}" },
            { key: "CTA|rich_text", textContent: "={{ $json.cta }}" },
            { key: "Visual JSON|rich_text", textContent: "={{ $json.visualJson }}" }
          ]
        },
        blockUi: {
          blockValues: [
            {
              type: "paragraph",
              richText: false,
              textContent: "={{ $json.fullContent }}"
            }
          ]
        },
        options: {}
      },
      id: "notion-save-ig",
      name: "Notion: Salvar Post Instagram",
      type: "n8n-nodes-base.notion",
      typeVersion: 2.2,
      position: [1500, 300],
      credentials: {
        notionApi: { id: "notion-cred", name: "Notion" }
      }
    }
  ];

  const connections = {
    "Diário às 15h30": {
      main: [[{ node: "Notion: Última Newsletter", type: "main", index: 0 }]]
    },
    "Notion: Última Newsletter": {
      main: [[{ node: "Preparar Prompt: Instagram", type: "main", index: 0 }]]
    },
    "Preparar Prompt: Instagram": {
      main: [[{ node: "OpenAI: Gerar Posts Instagram", type: "main", index: 0 }]]
    },
    "OpenAI: Gerar Posts Instagram": {
      main: [[{ node: "Separar Posts", type: "main", index: 0 }]]
    },
    "Separar Posts": {
      main: [[{ node: "Notion: Salvar Post Instagram", type: "main", index: 0 }]]
    }
  };

  return {
    name: "02 - Instagram IBACompany (Diário 15h30)",
    nodes,
    connections,
    active: false,
    settings: { executionOrder: "v1" },
    tags: [{ name: "instagram" }, { name: "automação" }],
    pinData: {}
  };
}

// ============================================================
// WORKFLOW 3: LINKEDIN CONTENT (Seg/Qua/Sex às 8h)
// ============================================================
function buildLinkedInContent() {
  const nodes = [
    {
      parameters: {
        rule: {
          interval: [{ field: "cronExpression", expression: "0 8 * * 1,3,5" }]
        }
      },
      id: "schedule-linkedin",
      name: "Seg/Qua/Sex às 8h",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [250, 300]
    },
    {
      parameters: {
        resource: "databasePage",
        operation: "getAll",
        databaseId: "={{ $env.NOTION_NEWSLETTER_DB_ID }}",
        returnAll: false,
        limit: 1,
        sort: {
          sortValue: [{ key: "created_time", direction: "descending", timestamp: true }]
        },
        options: {}
      },
      id: "notion-get-newsletter-li",
      name: "Notion: Última Newsletter",
      type: "n8n-nodes-base.notion",
      typeVersion: 2.2,
      position: [500, 300],
      credentials: {
        notionApi: { id: "notion-cred", name: "Notion" }
      }
    },
    {
      parameters: {
        jsCode: `
const page = items[0].json;
const props = page.properties || {};
const title = props.Name?.title?.[0]?.plain_text || 'Newsletter';

let pageContent = '';
if (page.body) {
  pageContent = page.body;
} else if (page.content) {
  pageContent = page.content;
} else {
  const allText = [];
  for (const [key, val] of Object.entries(props)) {
    if (val.rich_text) {
      const texts = val.rich_text.map(t => t.plain_text).join('');
      if (texts) allText.push(key + ': ' + texts);
    }
  }
  pageContent = allText.join('\\n\\n');
}

const systemPrompt = [
  'Você é a Isis Alencastro escrevendo para seu LinkedIn pessoal.',
  'Isis é gestora de automações, assistente de suporte em TI, desenvolvedora full-stack e analista de marketing.',
  'Ela atua na interseção entre tecnologia, inteligência artificial e negócios digitais.',
  'No LinkedIn, Isis constrói sua marca pessoal mostrando sua jornada real como profissional e ser humano em evolução.',
  '',
  'DIRETRIZES DE TOM E VOZ:',
  '- Autêntica e vulnerável quando apropriado',
  '- Profissional mas humana — nunca corporativês frio',
  '- Construindo em público — compartilha a jornada real com acertos e erros',
  '- Reflexiva e perspicaz — conecta tecnologia com a condição humana',
  '- Inspiradora sem ser clichê — mostra, não apenas diz',
  '',
  'REGRA FUNDAMENTAL: O post NÃO reproduz a newsletter.',
  'Ele usa o tema da newsletter como PONTO DE PARTIDA para uma reflexão pessoal.',
  'O objetivo é criar curiosidade sobre a newsletter e posicionar Isis como referência.'
].join('\\n');

const userPrompt = [
  'ÚLTIMA NEWSLETTER:',
  'Título: ' + title,
  '',
  pageContent,
  '',
  '---',
  '',
  'Crie 2 posts para o LinkedIn da Isis Alencastro.',
  '',
  'CADA POST DEVE:',
  '1. Usar um tema/notícia da newsletter como ponto de partida',
  '2. Conectar com carreira, desenvolvimento pessoal ou evolução profissional em um mundo movido por IA',
  '3. Incluir reflexão pessoal genuína da Isis (como se ela estivesse refletindo sobre o tema)',
  '4. Criar curiosidade que leve o leitor a querer o produto completo (newsletter)',
  '5. Terminar com CTA sutil para a newsletter AI Pulse',
  '',
  'FORMATO LINKEDIN (otimizado para algoritmo):',
  '- Hook: Primeira linha poderosa que gera cliques em "ver mais" (máx 2 linhas)',
  '- Espaçamento: Parágrafos curtos (1-3 linhas), com linha em branco entre eles',
  '- Extensão: 1200-1500 caracteres (ideal para engajamento no LinkedIn)',
  '- Storytelling: Use estrutura problema → jornada → insight',
  '',
  'IMPORTANTE: Varie os estilos entre os 2 posts:',
  '- Post 1: Mais reflexivo/filosófico sobre o impacto da IA na vida profissional',
  '- Post 2: Mais prático/tático, compartilhando um aprendizado ou framework',
  '',
  'Retorne APENAS JSON válido:',
  '{',
  '  "posts": [',
  '    {',
  '      "hook": "Primeira linha do post (que aparece antes do ver mais)",',
  '      "content": "Texto COMPLETO do post incluindo o hook, corpo e CTA",',
  '      "image_prompt": "Prompt detalhado para gerar imagem no DALL-E ou Midjourney que complemente o post",',
  '      "char_count": 1350,',
  '      "hashtags": ["hashtag1", "hashtag2"],',
  '      "best_time_to_post": "08:00",',
  '      "engagement_strategy": "Pergunta ou provocação para gerar comentários"',
  '    }',
  '  ]',
  '}'
].join('\\n');

return [{
  json: {
    newsletterTitle: title,
    requestBody: {
      model: 'gpt-4o',
      temperature: 0.8,
      max_tokens: 5000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }
  }
}];
`.trim()
      },
      id: "code-prepare-li",
      name: "Preparar Prompt: LinkedIn",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [750, 300]
    },
    {
      parameters: {
        method: "POST",
        url: "https://api.openai.com/v1/chat/completions",
        authentication: "predefinedCredentialType",
        nodeCredentialType: "openAiApi",
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.requestBody) }}",
        options: { timeout: 120000 }
      },
      id: "openai-linkedin",
      name: "OpenAI: Gerar Posts LinkedIn",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1000, 300],
      credentials: {
        openAiApi: { id: "openai-cred", name: "OpenAI" }
      }
    },
    {
      parameters: {
        jsCode: `
const response = items[0].json;
const content = response.choices[0].message.content;
let postsData;
try {
  postsData = JSON.parse(content);
} catch (e) {
  const jsonMatch = content.match(/\\{[\\s\\S]*\\}/);
  postsData = jsonMatch ? JSON.parse(jsonMatch[0]) : { posts: [] };
}

const posts = postsData.posts || [];
const today = new Date().toISOString().split('T')[0];

return posts.map((post, index) => ({
  json: {
    title: post.hook,
    content: post.content,
    imagePrompt: post.image_prompt || '',
    charCount: post.char_count || post.content.length,
    hashtags: (post.hashtags || []).join(' '),
    engagementStrategy: post.engagement_strategy || '',
    date: today,
    postNumber: index + 1,
    status: 'Revisar'
  }
}));
`.trim()
      },
      id: "code-parse-li",
      name: "Separar Posts",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1250, 300]
    },
    {
      parameters: {
        resource: "databasePage",
        operation: "create",
        databaseId: "={{ $env.NOTION_LINKEDIN_DB_ID }}",
        title: "={{ 'LI #' + $json.postNumber + ' - ' + $json.title }}",
        propertiesUi: {
          propertyValues: [
            { key: "Status|select", selectValue: "Revisar" },
            { key: "Data|date", date: "={{ $json.date }}" },
            { key: "Hashtags|rich_text", textContent: "={{ $json.hashtags }}" },
            { key: "Image Prompt|rich_text", textContent: "={{ $json.imagePrompt }}" },
            { key: "Caracteres|number", numberValue: "={{ $json.charCount }}" },
            { key: "Estratégia|rich_text", textContent: "={{ $json.engagementStrategy }}" }
          ]
        },
        blockUi: {
          blockValues: [
            {
              type: "paragraph",
              richText: false,
              textContent: "={{ $json.content }}"
            }
          ]
        },
        options: {}
      },
      id: "notion-save-li",
      name: "Notion: Salvar Post LinkedIn",
      type: "n8n-nodes-base.notion",
      typeVersion: 2.2,
      position: [1500, 300],
      credentials: {
        notionApi: { id: "notion-cred", name: "Notion" }
      }
    }
  ];

  const connections = {
    "Seg/Qua/Sex às 8h": {
      main: [[{ node: "Notion: Última Newsletter", type: "main", index: 0 }]]
    },
    "Notion: Última Newsletter": {
      main: [[{ node: "Preparar Prompt: LinkedIn", type: "main", index: 0 }]]
    },
    "Preparar Prompt: LinkedIn": {
      main: [[{ node: "OpenAI: Gerar Posts LinkedIn", type: "main", index: 0 }]]
    },
    "OpenAI: Gerar Posts LinkedIn": {
      main: [[{ node: "Separar Posts", type: "main", index: 0 }]]
    },
    "Separar Posts": {
      main: [[{ node: "Notion: Salvar Post LinkedIn", type: "main", index: 0 }]]
    }
  };

  return {
    name: "03 - LinkedIn Isis Alencastro (Seg/Qua/Sex 8h)",
    nodes,
    connections,
    active: false,
    settings: { executionOrder: "v1" },
    tags: [{ name: "linkedin" }, { name: "automação" }],
    pinData: {}
  };
}

// ============================================================
// WORKFLOW 4: GERADOR DE IDEIAS YOUTUBE (Semanal Qua 9h)
// ============================================================
function buildYouTubeMonitor() {
  const nodes = [
    {
      parameters: {
        rule: {
          interval: [{
            field: "weeks",
            triggerAtDay: [3],
            triggerAtHour: 9
          }]
        }
      },
      id: "schedule-youtube",
      name: "Gerador automático",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [250, 300]
    },
    {
      parameters: {
        resource: "databasePage",
        operation: "getAll",
        databaseId: "={{ $env.NOTION_YOUTUBE_DB_ID }}",
        options: {}
      },
      id: "notion-get-yt-ideas",
      name: "Notion: Ideias Existentes",
      type: "n8n-nodes-base.notion",
      typeVersion: 2.2,
      position: [500, 300],
      credentials: {
        notionApi: { id: "notion-cred", name: "Notion" }
      }
    },
    {
      parameters: {
        jsCode: `
const existingIdeas = [];
for (const item of items) {
  const props = item.json.properties || {};
  const title = props.Name?.title?.[0]?.plain_text;
  if (title) existingIdeas.push(title);
}
const today = new Date().toLocaleDateString('pt-BR');

const systemPrompt = [
  'Você é um assistente de estratégia de conteúdo para a criadora Isis Alencastro.',
  'Isis é gestora de automações, desenvolvedora full-stack e analista de marketing.',
  'Ela está construindo um canal no YouTube na interseção entre tecnologia, IA e desenvolvimento pessoal.',
  '',
  'FILOSOFIA CENTRAL DO CANAL — LEIA COM ATENÇÃO:',
  'Isis NÃO é expert dando dicas. Isis é uma pessoa em evolução documentando sua jornada.',
  'A diferença é fundamental:',
  '- Expert diz "faça assim" → Isis diz "eu tentei isso e aprendi tal coisa"',
  '- Expert ensina de cima → Isis caminha junto com o espectador',
  '- Expert tem respostas → Isis tem perguntas honestas e descobertas reais',
  'O canal é um diário público de crescimento — profissional E pessoal.',
  'O espectador não sai com um tutorial. Sai sentindo que não está sozinho.',
  '',
  'POSICIONAMENTO CENTRAL DE ISIS:',
  'Ela usa tecnologia como ferramenta de autoconhecimento, produtividade consciente',
  'e construção de vida com propósito. Mostra a jornada REAL: acertos, erros, crises e viradas.',
  'O tech é o contexto. O desenvolvimento pessoal é o coração do canal.',
  '',
  'PILARES DE CONTEÚDO (em ordem de prioridade):',
  '1. EVOLUÇÃO DOCUMENTADA — mostrar quem ela era, quem está se tornando, o que mudou',
  '2. AUTOCONHECIMENTO na jornada em tecnologia — o que aprender revela sobre si mesma',
  '3. DESENVOLVIMENTO PESSOAL aplicado à vida de quem trabalha com tech',
  '   — identidade profissional, síndrome do impostor, burnout, limites, propósito',
  '4. PRODUTIVIDADE CONSCIENTE — sistemas que respeitam a vida, não apenas otimizam',
  '5. IA & TECH como gatilho de reflexão pessoal — não como tema técnico isolado',
  '',
  'CANAIS DE REFERÊNCIA:',
  '- pearlieee (video-ensaios intimistas, psicologia, autoconhecimento e healing com tom pessoal)',
  '- Nathaniel Drew (video-ensaios introspectivos sobre identidade e mudança)',
  '- Rowena Tsai (autodesenvolvimento, identidade, vida com propósito)',
  '- For You From Eve (relacionamentos, limites, honestidade sem filtro)',
  '- Tina Huang (data science, carreira em tech, perspectiva feminina e honesta)',
  '- Fireship (tech trends, formato dinâmico — referência de ritmo)',
  '- Theo t3.gg (opiniões fortes, building in public — referência de autenticidade)',
  '- Ali Abdaal (estrutura e formato de vídeos longos — referência de produção)',
  '',
  'PÚBLICO-ALVO: profissionais de TI e devs que sentem que falta algo além do técnico,',
  'pessoas em transição de carreira para tech, mulheres em tecnologia, curiosos sobre IA',
  'que querem entender o impacto na vida humana — não só no mercado.'
].join('\\n');

const userPrompt = [
  'Data: ' + today,
  '',
  'Gere 5 ideias de vídeo para o canal da Isis Alencastro.',
  '',
  'REGRA PRINCIPAL: desenvolvimento pessoal deve ser o FIO CONDUTOR de cada ideia.',
  'Tech e IA entram como contexto, gatilho ou ferramenta — nunca como foco exclusivo.',
  '',
  'REGRA DE VOZ — CRÍTICA:',
  'Nenhuma ideia pode soar como "aprenda X comigo" ou "dicas de Y".',
  'Toda ideia deve soar como "isso aconteceu comigo e mudou algo" ou "estou descobrindo X e quero compartilhar".',
  'O título deve convidar para uma jornada, não prometer um tutorial.',
  'Exemplos do que EVITAR: "Como fazer X", "5 dicas para Y", "O guia definitivo de Z"',
  'Exemplos do que BUSCAR: "O que X me ensinou sobre mim mesma", "Quando percebi que Z mudou tudo",',
  '"Estou tentando X — o que aprendi até agora", "Por que parei de fazer Y (e o que isso revelou)"',
  '',
  'IDEIAS JÁ EXISTENTES (evitar repetição):',
  existingIdeas.length > 0 ? existingIdeas.join(', ') : 'Nenhuma ideia anterior registrada',
  '',
  'DISTRIBUIÇÃO DAS 5 IDEIAS:',
  '- 2 ideias com foco em autoconhecimento/identidade/emoções (estilo pearlieee/Nathaniel Drew)',
  '- 1 ideia sobre a jornada real de carreira — com erros, dúvidas e viradas',
  '- 1 ideia sobre como Isis usa (ou tenta usar) tech/IA de forma mais consciente',
  '- 1 ideia livre que conecte qualquer pilar com uma experiência pessoal marcante',
  '',
  'CRITÉRIOS PARA CADA IDEIA:',
  '1. O título deve despertar curiosidade emocional, não apenas informacional',
  '2. Deve haver um momento real e específico da vida da Isis que ancora o vídeo',
  '3. O espectador deve sair sentindo algo — não apenas sabendo algo',
  '4. Deve ser filmável solo com equipamento básico',
  '5. Formatos preferidos: video-ensaio, storytelling pessoal, reflexão em voz alta, diário em vídeo',
  '',
  'Retorne APENAS JSON válido:',
  '{',
  '  "ideas": [',
  '    {',
  '      "title_suggestion": "Título em português (convida para uma jornada, não promete tutorial)",',
  '      "core_insight": "O insight ou virada central que ancora o vídeo",',
  '      "isis_real_moment": "Qual momento ou experiência real da Isis serve de base para esse vídeo",',
  '      "emotional_takeaway": "O que o espectador vai SENTIR ao terminar o vídeo",',
  '      "original_inspiration": "Qual canal/tendência inspirou o formato ou tema",',
  '      "target_audience": "Para quem esse vídeo fala especificamente",',
  '      "estimated_length": "Duração estimada",',
  '      "format": "video-ensaio|storytelling|reflexão|diário-em-vídeo|análise-pessoal",',
  '      "hook_idea": "Como abrir o vídeo nos primeiros 30 segundos",',
  '      "viral_potential": "Baixo|Médio|Alto",',
  '      "authority_building": "Baixo|Médio|Alto",',
  '      "keywords": ["palavra-chave1", "palavra-chave2"]',
  '    }',
  '  ]',
  '}'
].join('\\n');

return [{
  json: {
    existingIdeas: existingIdeas,
    requestBody: {
      model: 'gpt-4o',
      temperature: 0.85,
      max_tokens: 5000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }
  }
}];
`.trim()
      },
      id: "code-prepare-yt",
      name: "Preparar Prompt: YouTube",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [750, 300]
    },
    {
      parameters: {
        method: "POST",
        url: "https://api.openai.com/v1/chat/completions",
        authentication: "predefinedCredentialType",
        nodeCredentialType: "openAiApi",
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.requestBody) }}",
        options: { timeout: 120000 }
      },
      id: "openai-youtube",
      name: "OpenAI: Gerar Ideias YouTube",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1000, 300],
      credentials: {
        openAiApi: { id: "openai-cred", name: "OpenAI" }
      }
    },
    {
      parameters: {
        jsCode: `
const response = items[0].json;
const content = response.choices[0].message.content;
let ideasData;
try {
  ideasData = JSON.parse(content);
} catch (e) {
  const jsonMatch = content.match(/\\{[\\s\\S]*\\}/);
  ideasData = jsonMatch ? JSON.parse(jsonMatch[0]) : { ideas: [] };
}

const ideas = ideasData.ideas || [];
const today = new Date().toISOString().split('T')[0];

return ideas.map((idea, index) => ({
  json: {
    title: idea.title_suggestion,
    inspiration: idea.original_inspiration || '',
    isisAngle: idea.isis_angle || '',
    targetAudience: idea.target_audience || '',
    estimatedLength: idea.estimated_length || '',
    format: idea.format || 'opinião',
    hookIdea: idea.hook_idea || '',
    viralPotential: idea.viral_potential || 'médio',
    authorityBuilding: idea.authority_building || 'médio',
    keywords: (idea.keywords || []).join(', '),
    date: today,
    ideaNumber: index + 1,
    status: 'Ideia'
  }
}));
`.trim()
      },
      id: "code-parse-yt",
      name: "Separar Ideias",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1250, 300]
    },
    {
      parameters: {
        resource: "databasePage",
        databaseId: "={{ $env.NOTION_YOUTUBE_DB_ID }}",
        title: "={{ $json.title }}",
        propertiesUi: {
          propertyValues: [
            { key: "Status|select", selectValue: "={{ $json.status }}" },
            { key: "Data|date", date: "={{ $json.date }}" },
            { key: "Formato|select", selectValue: "={{ $json.format }}" },
            { key: "Inspiração|rich_text", textContent: "={{ $json.inspiration }}" },
            { key: "Ângulo Isis|rich_text", textContent: "={{ $json.isisAngle }}" },
            { key: "Público-alvo|rich_text", textContent: "={{ $json.targetAudience }}" },
            { key: "Duração Estimada|rich_text", textContent: "={{ $json.estimatedLength }}" },
            { key: "Potencial Viral|select", selectValue: "={{ $json.viralPotential }}" },
            { key: "Keywords|rich_text", textContent: "={{ $json.keywords }}" }
          ]
        },
        blockUi: {
          blockValues: [
            {
              textContent: "={{ '## Gancho\\n' + $json.hookIdea + '\\n\\n## Ângulo da Isis\\n' + $json.isisAngle + '\\n\\n## Inspiração\\n' + $json.inspiration }}"
            }
          ]
        },
        options: {}
      },
      id: "notion-save-yt",
      name: "Notion: Salvar Ideia YouTube",
      type: "n8n-nodes-base.notion",
      typeVersion: 2.2,
      position: [1500, 300],
      credentials: {
        notionApi: { id: "notion-cred", name: "Notion" }
      }
    }
  ];

  const connections = {
    "Gerador automático": {
      main: [[{ node: "Notion: Ideias Existentes", type: "main", index: 0 }]]
    },
    "Notion: Ideias Existentes": {
      main: [[{ node: "Preparar Prompt: YouTube", type: "main", index: 0 }]]
    },
    "Preparar Prompt: YouTube": {
      main: [[{ node: "OpenAI: Gerar Ideias YouTube", type: "main", index: 0 }]]
    },
    "OpenAI: Gerar Ideias YouTube": {
      main: [[{ node: "Separar Ideias", type: "main", index: 0 }]]
    },
    "Separar Ideias": {
      main: [[{ node: "Notion: Salvar Ideia YouTube", type: "main", index: 0 }]]
    }
  };

  return {
    name: "Gerador de ideias para vídeos",
    nodes,
    connections,
    active: false,
    settings: { executionOrder: "v1" },
    tags: [{ name: "youtube" }, { name: "automação" }],
    pinData: {}
  };
}

// ============================================================
// WORKFLOW 5: YOUTUBE SCRIPTWRITER (Trigger Manual / Webhook)
// ============================================================
function buildYouTubeScriptwriter() {
  const nodes = [
    {
      parameters: {
        path: "youtube-script",
        responseMode: "responseNode",
        options: {}
      },
      id: "webhook-yt-script",
      name: "Webhook: Roteirizar Vídeo",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [250, 300],
      webhookId: "youtube-script-webhook"
    },
    {
      parameters: {
        resource: "databasePage",
        operation: "getAll",
        databaseId: { "__rl": true, "mode": "id", "value": "={{ $env.NOTION_YOUTUBE_DB_ID }}" },
        returnAll: false,
        limit: 10,
        simple: true,
        filterType: "manual",
        matchType: "allFilters",
        filters: {
          conditions: [
            {
              key: "Status|select",
              condition: "equals",
              selectValue: "Aprovada"
            }
          ]
        },
        sort: {
          sortValue: [{ key: "created_time", direction: "descending", timestamp: true }]
        },
        options: {}
      },
      id: "notion-get-approved",
      name: "Notion: Ideias Aprovadas",
      type: "n8n-nodes-base.notion",
      typeVersion: 2.2,
      position: [500, 300],
      credentials: {
        notionApi: { id: "notion-cred", name: "Notion" }
      }
    },
    {
      parameters: {
        conditions: {
          boolean: [],
          number: [
            {
              value1: "={{ $input.all().length }}",
              operation: "largerEqual",
              value2: 1
            }
          ]
        }
      },
      id: "if-has-ideas",
      name: "Tem Ideias Aprovadas?",
      type: "n8n-nodes-base.if",
      typeVersion: 1,
      position: [750, 300]
    },
    {
      parameters: {
        jsCode: `
const idea = items[0].json;
const props = idea.properties || {};
const title = props.Name?.title?.[0]?.plain_text || 'Ideia de vídeo';

let ideaDetails = 'Título: ' + title + '\\n';

for (const [key, val] of Object.entries(props)) {
  if (val.rich_text && val.rich_text.length > 0) {
    const text = val.rich_text.map(t => t.plain_text).join('');
    if (text) ideaDetails += key + ': ' + text + '\\n';
  }
  if (val.select && val.select.name) {
    ideaDetails += key + ': ' + val.select.name + '\\n';
  }
}

let bodyContent = '';
if (idea.body) bodyContent = idea.body;
if (idea.content) bodyContent = idea.content;

const systemPrompt = [
  'Você é roteirista da criadora de conteúdo Isis Alencastro para YouTube.',
  'Isis é gestora de automações, desenvolvedora full-stack e analista de marketing.',
  'Ela fala sobre tecnologia, IA e desenvolvimento pessoal com autenticidade.',
  '',
  'ESTILO DE ROTEIRO:',
  '- Conversacional — como se Isis estivesse falando diretamente com um amigo',
  '- Dinâmico — mudanças de ritmo, perguntas retóricas, hooks visuais',
  '- Pessoal — marcações claras onde Isis deve inserir histórias pessoais',
  '- Profissional — conteúdo denso mas acessível',
  '',
  'MARCAÇÕES ESPECIAIS NO ROTEIRO:',
  '- [INSERIR HISTÓRIA PESSOAL: sugestão do que contar] — onde Isis adiciona vivências próprias',
  '- [NOTA DE PRODUÇÃO: descrição] — sugestões de B-roll, gráficos, transições, zoom',
  '- [GANCHO VISUAL: descrição] — momentos que precisam de destaque visual',
  '- [PAUSA DRAMÁTICA] — momentos de silêncio intencional',
  '- [MUDANÇA DE ENERGIA] — quando o tom deve mudar'
].join('\\n');

const userPrompt = [
  'IDEIA DO VÍDEO:',
  ideaDetails,
  '',
  bodyContent ? 'DETALHES ADICIONAIS:\\n' + bodyContent + '\\n' : '',
  'Crie um MINI ROTEIRO COMPLETO para este vídeo.',
  '',
  'ESTRUTURA OBRIGATÓRIA:',
  '',
  '1. GANCHO (0:00-0:30)',
  '   Primeiros 30 segundos que prendem o espectador.',
  '   Deve criar curiosidade imediata, usar dado impactante ou pergunta provocativa.',
  '   [NOTA DE PRODUÇÃO] com sugestão de como filmar.',
  '',
  '2. INTRO (0:30-1:30)',
  '   Contexto e promessa clara do que o vídeo entrega.',
  '   Isis se apresenta brevemente e estabelece credibilidade.',
  '   [INSERIR HISTÓRIA PESSOAL] — por que esse tema importa para ela.',
  '',
  '3. DESENVOLVIMENTO (1:30-8:00)',
  '   3-4 blocos de conteúdo, cada um com:',
  '   - Subtítulo do bloco',
  '   - Conteúdo principal (falas da Isis)',
  '   - [INSERIR HISTÓRIA PESSOAL] em pelo menos 2 blocos',
  '   - [NOTA DE PRODUÇÃO] com sugestões de B-roll e gráficos',
  '   - Transição natural para o próximo bloco',
  '',
  '4. CLÍMAX (8:00-9:00)',
  '   O insight principal ou virada do vídeo.',
  '   O momento "aha" que faz tudo se conectar.',
  '',
  '5. CTA (9:00-9:30)',
  '   Chamada para ação: inscrever no canal, assinar a newsletter AI Pulse, comentar.',
  '   Deve sentir natural, não forçado.',
  '',
  '6. ENCERRAMENTO (9:30-10:00)',
  '   Despedida pessoal, prévia do próximo vídeo.',
  '',
  'ADICIONAL — Forneça também:',
  '- 3 opções de título para teste A/B (SEO-friendly, chamativo)',
  '- 3 sugestões de thumbnail (descrição visual detalhada)',
  '- Tags sugeridas para YouTube (10-15 tags)',
  '- Descrição sugerida para o vídeo (com links e timestamps)',
  '',
  'Retorne APENAS JSON válido:',
  '{',
  '  "script": {',
  '    "hook": "Texto completo do gancho com marcações",',
  '    "intro": "Texto completo da intro com marcações",',
  '    "development": [',
  '      {',
  '        "block_title": "Título do bloco",',
  '        "content": "Texto completo com marcações",',
  '        "production_notes": "Notas de produção para este bloco"',
  '      }',
  '    ],',
  '    "climax": "Texto do clímax com marcações",',
  '    "cta": "Texto do CTA",',
  '    "closing": "Texto do encerramento"',
  '  },',
  '  "title_options": ["Título 1", "Título 2", "Título 3"],',
  '  "thumbnail_suggestions": [',
  '    { "description": "Descrição visual da thumbnail", "text_overlay": "Texto na thumbnail" }',
  '  ],',
  '  "youtube_tags": ["tag1", "tag2"],',
  '  "video_description": "Descrição completa com timestamps",',
  '  "estimated_duration": "duração estimada"',
  '}'
].join('\\n');

return [{
  json: {
    ideaTitle: title,
    ideaPageId: idea.id,
    requestBody: {
      model: 'gpt-4o',
      temperature: 0.75,
      max_tokens: 10000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }
  }
}];
`.trim()
      },
      id: "code-prepare-script",
      name: "Preparar Prompt: Roteiro",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1000, 300]
    },
    {
      parameters: {
        method: "POST",
        url: "https://api.openai.com/v1/chat/completions",
        authentication: "predefinedCredentialType",
        nodeCredentialType: "openAiApi",
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.requestBody) }}",
        options: { timeout: 180000 }
      },
      id: "openai-script",
      name: "OpenAI: Gerar Roteiro",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1250, 300],
      credentials: {
        openAiApi: { id: "openai-cred", name: "OpenAI" }
      }
    },
    {
      parameters: {
        jsCode: `
const response = items[0].json;
const content = response.choices[0].message.content;
let scriptData;
try {
  scriptData = JSON.parse(content);
} catch (e) {
  const jsonMatch = content.match(/\\{[\\s\\S]*\\}/);
  scriptData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
}

const script = scriptData.script || {};
const today = new Date().toISOString().split('T')[0];

let fullScript = '# ROTEIRO\\n\\n';
fullScript += '## 🎬 GANCHO (0:00-0:30)\\n' + (script.hook || '') + '\\n\\n';
fullScript += '## 📢 INTRO (0:30-1:30)\\n' + (script.intro || '') + '\\n\\n';

if (script.development) {
  fullScript += '## 📝 DESENVOLVIMENTO\\n\\n';
  script.development.forEach((block, i) => {
    fullScript += '### Bloco ' + (i + 1) + ': ' + block.block_title + '\\n';
    fullScript += block.content + '\\n';
    if (block.production_notes) {
      fullScript += '\\n[NOTA DE PRODUÇÃO] ' + block.production_notes + '\\n';
    }
    fullScript += '\\n';
  });
}

fullScript += '## 💡 CLÍMAX\\n' + (script.climax || '') + '\\n\\n';
fullScript += '## 📣 CTA\\n' + (script.cta || '') + '\\n\\n';
fullScript += '## 👋 ENCERRAMENTO\\n' + (script.closing || '') + '\\n\\n';

fullScript += '---\\n\\n## OPÇÕES DE TÍTULO\\n';
(scriptData.title_options || []).forEach((t, i) => {
  fullScript += (i + 1) + '. ' + t + '\\n';
});

fullScript += '\\n## SUGESTÕES DE THUMBNAIL\\n';
(scriptData.thumbnail_suggestions || []).forEach((t, i) => {
  fullScript += (i + 1) + '. ' + t.description + ' | Texto: ' + (t.text_overlay || '') + '\\n';
});

fullScript += '\\n## TAGS\\n' + (scriptData.youtube_tags || []).join(', ');
fullScript += '\\n\\n## DESCRIÇÃO DO VÍDEO\\n' + (scriptData.video_description || '');

const ideaTitle = $('Preparar Prompt: Roteiro').item.json.ideaTitle;
const ideaPageId = $('Preparar Prompt: Roteiro').item.json.ideaPageId;

return [{
  json: {
    ideaTitle: ideaTitle,
    ideaPageId: ideaPageId,
    fullScript: fullScript,
    titleOptions: (scriptData.title_options || []).join(' | '),
    thumbnailSuggestions: JSON.stringify(scriptData.thumbnail_suggestions || []),
    youtubeTags: (scriptData.youtube_tags || []).join(', '),
    videoDescription: scriptData.video_description || '',
    estimatedDuration: scriptData.estimated_duration || '',
    date: today,
    scriptData: scriptData,
    status: 'Roteirizada'
  }
}];
`.trim()
      },
      id: "code-format-script",
      name: "Formatar Roteiro",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1500, 300]
    },
    {
      parameters: {
        resource: "databasePage",
        operation: "update",
        pageId: { "__rl": true, "mode": "id", "value": "={{ $json.ideaPageId }}" },
        simple: true,
        propertiesUi: {
          propertyValues: [
            { key: "Status|select", selectValue: "Roteirizada" },
            { key: "Opções de Título|rich_text", textContent: "={{ $json.titleOptions }}" },
            { key: "Tags YouTube|rich_text", textContent: "={{ $json.youtubeTags }}" },
            { key: "Duração Estimada|rich_text", textContent: "={{ $json.estimatedDuration }}" }
          ]
        },
        blockUi: {
          blockValues: [
            {
              type: "paragraph",
              richText: false,
              textContent: "={{ $json.fullScript }}"
            }
          ]
        },
        options: {}
      },
      id: "notion-update-yt",
      name: "Notion: Atualizar com Roteiro",
      type: "n8n-nodes-base.notion",
      typeVersion: 2.2,
      position: [1750, 300],
      credentials: {
        notionApi: { id: "notion-cred", name: "Notion" }
      }
    },
    {
      parameters: {
        respondWith: "json",
        responseBody: "={{ JSON.stringify({ success: true, message: 'Roteiro gerado com sucesso para: ' + $json.ideaTitle }) }}",
        options: {}
      },
      id: "respond-webhook",
      name: "Resposta: Sucesso",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [2000, 300]
    },
    {
      parameters: {
        respondWith: "json",
        responseBody: "={{ JSON.stringify({ success: false, message: 'Nenhuma ideia com status Aprovada encontrada no Notion' }) }}",
        options: {}
      },
      id: "respond-no-ideas",
      name: "Resposta: Sem Ideias",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [1000, 500]
    }
  ];

  const connections = {
    "Webhook: Roteirizar Vídeo": {
      main: [[{ node: "Notion: Ideias Aprovadas", type: "main", index: 0 }]]
    },
    "Notion: Ideias Aprovadas": {
      main: [[{ node: "Tem Ideias Aprovadas?", type: "main", index: 0 }]]
    },
    "Tem Ideias Aprovadas?": {
      main: [
        [{ node: "Preparar Prompt: Roteiro", type: "main", index: 0 }],
        [{ node: "Resposta: Sem Ideias", type: "main", index: 0 }]
      ]
    },
    "Preparar Prompt: Roteiro": {
      main: [[{ node: "OpenAI: Gerar Roteiro", type: "main", index: 0 }]]
    },
    "OpenAI: Gerar Roteiro": {
      main: [[{ node: "Formatar Roteiro", type: "main", index: 0 }]]
    },
    "Formatar Roteiro": {
      main: [[{ node: "Notion: Atualizar com Roteiro", type: "main", index: 0 }]]
    },
    "Notion: Atualizar com Roteiro": {
      main: [[{ node: "Resposta: Sucesso", type: "main", index: 0 }]]
    }
  };

  return {
    name: "05 - YouTube Roteirizador (Manual)",
    nodes,
    connections,
    active: false,
    settings: { executionOrder: "v1" },
    tags: [{ name: "youtube" }, { name: "automação" }],
    pinData: {}
  };
}

// ============================================================
// GENERATE ALL WORKFLOW FILES
// ============================================================
const workflows = [
  { fn: buildNewsletterPipeline, file: "01-newsletter-pipeline.json" },
  { fn: buildInstagramContent, file: "02-instagram-content.json" },
  { fn: buildLinkedInContent, file: "03-linkedin-content.json" },
  { fn: buildYouTubeMonitor, file: "04-youtube-monitor.json" },
  { fn: buildYouTubeScriptwriter, file: "05-youtube-scriptwriter.json" }
];

for (const { fn, file } of workflows) {
  const workflow = fn();
  const filePath = path.join(WORKFLOWS_DIR, file);
  fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));
  console.log(`✓ Gerado: ${file} (${workflow.nodes.length} nodes)`);
}

console.log("\nTodos os workflows gerados com sucesso!");
