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
  '',
  'IDENTIDADE E TOM:',
  '- Escreva como uma profissional de tech que conversa com colegas no café.',
  '- Você é curiosa, tem opiniões fortes (e não tem medo de expressá-las), e às vezes fica genuinamente surpresa ou frustrada com as notícias.',
  '- Use dados concretos. Quando não tiver certeza, admita. Isso é humano.',
  '- Misture frases curtas e diretas com explicações mais longas quando o assunto pede.',
  '',
  'REGRAS DE ESCRITA — HUMANIZAÇÃO (SEGUIR À RISCA):',
  '',
  'NUNCA use estas expressões (são marcas óbvias de texto gerado por IA):',
  '- "No cenário/contexto/panorama atual"',
  '- "É importante destacar/ressaltar/salientar que"',
  '- "Vale ressaltar/destacar/mencionar que"',
  '- "Nesse/Neste contexto/sentido"',
  '- "Diante disso/desse cenário"',
  '- "Em suma" / "Em síntese"',
  '- "Sem dúvida" / "Sem sombra de dúvida"',
  '- "De forma significativa/expressiva"',
  '- "Cabe destacar/mencionar"',
  '- "É inegável que"',
  '- "Em um mundo cada vez mais..."',
  '- "Na era da/do..."',
  '- "Revolucionário" / "Transformador" / "Disruptivo"',
  '- "Ecossistema" (fora de biologia)',
  '- "Navegando" (uso metafórico)',
  '- "Jornada" (quando não for viagem real)',
  '- "Crucial" / "Fundamental" / "Notável" / "Notavelmente"',
  '- "Ademais" / "Impulsionado por" / "De ponta"',
  '- Começar parágrafos com "Além disso," / "Portanto," / "Contudo," / "Todavia," / "Entretanto,"',
  '- "Paisagem" ou "landscape" (uso metafórico sobre mercado)',
  '- "Abraçar" (quando não for abraço físico)',
  '',
  'FAÇA ISTO EM VEZ DISSO:',
  '- Comece parágrafos de formas variadas: com o fato direto, uma pergunta, uma reação pessoal, um dado.',
  '- Use "E" e "Mas" pra começar frases — gente real faz isso.',
  '- Inclua reações genuínas: "Confesso que não esperava", "Olha, faz sentido quando a gente para pra pensar", "Isso me pegou de surpresa".',
  '- Varie o tamanho dos parágrafos. Um de uma linha só. Outro de três frases longas.',
  '- Use parênteses pra apartes (como quem pensa em voz alta).',
  '- Faça perguntas retóricas ao leitor.',
  '- Prefira números específicos: "37%" é melhor que "aumento expressivo".',
  '- Use fragmentos de frase por estilo. Assim.',
  '- Não termine todos os parágrafos com frase de arremate.',
  '- Evite que todas as listas tenham exatamente 3 ou 5 itens.',
  '- Varie a estrutura: nem toda notícia precisa do mesmo formato.',
  '- Contrações informais são bem-vindas: "pra", "tá", "né".',
  '- Referências a coisas do cotidiano e cultura pop são ótimas quando cabem.'
].join('\\n');

const userPrompt = [
  'Escreva a edição de hoje (' + today + ') da newsletter AI Pulse.',
  '',
  'PESQUISA BASE:',
  researchText,
  '',
  'A NEWSLETTER DEVE SER DIVIDIDA EM 3 PARTES (publicáveis separadamente):',
  '',
  'PARTE 1 — RADAR (leitura rápida, ~2 min):',
  '- Título próprio desta parte',
  '- Abertura pessoal da Isis (2-3 frases, como quem acabou de sentar com o café)',
  '- 5-7 notícias em formato telegráfico: título + 2-3 frases de contexto cada',
  '- Cada notícia com uma frase curta de impacto no final (varie o formato — nada de "Por que isso importa" repetido em todas)',
  '- Fechamento rápido provocando curiosidade pra Parte 2',
  '',
  'PARTE 2 — DEEP DIVE (leitura média, ~5 min):',
  '- Título próprio desta parte',
  '- Pegue 2-3 notícias do Radar e aprofunde de verdade',
  '- 3-4 parágrafos por tema com contexto, dados concretos e análise',
  '- Opinião pessoal da Isis em pelo menos um dos temas',
  '- Transições naturais entre os temas (não mecânicas)',
  '- Fechamento que prepara terreno pra Parte 3',
  '',
  'PARTE 3 — PERSPECTIVA (leitura longa, ~4 min):',
  '- Título próprio desta parte',
  '- O tema mais relevante do dia vira mini-ensaio de opinião',
  '- 4-6 parágrafos conectando com tendências maiores e a realidade de quem trabalha com tech no Brasil',
  '- Termine com reflexão aberta — NÃO amarre tudo em um laço bonito. Deixe o leitor pensando.',
  '- Despedida pessoal da Isis (como se falasse com um amigo)',
  '',
  'REGRA FINAL: Releia o que escreveu. Se alguma frase soa como "uma IA escreveu isso", reescreva com mais personalidade e imperfeição humana.',
  '',
  'Retorne APENAS JSON válido:',
  '{',
  '  "title": "Título geral da edição",',
  '  "parts": [',
  '    {',
  '      "part_number": 1,',
  '      "part_title": "Radar — Título curto e chamativo",',
  '      "content": "Conteúdo completo em texto corrido (use \\\\n para quebras de linha)",',
  '      "reading_time_minutes": 2',
  '    },',
  '    {',
  '      "part_number": 2,',
  '      "part_title": "Deep Dive — Título curto e chamativo",',
  '      "content": "Conteúdo completo da Parte 2",',
  '      "reading_time_minutes": 5',
  '    },',
  '    {',
  '      "part_number": 3,',
  '      "part_title": "Perspectiva — Título curto e chamativo",',
  '      "content": "Conteúdo completo da Parte 3",',
  '      "reading_time_minutes": 4',
  '    }',
  '  ],',
  '  "topics_covered": ["lista", "de", "tópicos", "cobertos"]',
  '}'
].join('\\n');

return [{
  json: {
    research: research,
    requestBody: {
      model: 'gpt-4o',
      temperature: 0.75,
      max_tokens: 16000,
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

const parts = newsletter.parts || [];

let htmlContent = '<h1>' + (newsletter.title || 'AI Pulse') + '</h1>';
for (const part of parts) {
  htmlContent += '<div style="margin: 30px 0;">';
  htmlContent += '<h2>' + part.part_title + '</h2>';
  htmlContent += '<p style="color: #666; font-size: 14px;"><em>~' + part.reading_time_minutes + ' min de leitura</em></p>';
  htmlContent += '<div>' + (part.content || '').replace(/\\n/g, '<br>') + '</div>';
  htmlContent += '</div><hr>';
}

let markdownContent = '# ' + (newsletter.title || 'AI Pulse') + '\\n\\n';
for (const part of parts) {
  markdownContent += '## ' + part.part_title + '\\n';
  markdownContent += '*~' + part.reading_time_minutes + ' min de leitura*\\n\\n';
  markdownContent += (part.content || '') + '\\n\\n---\\n\\n';
}

let emailHtml = '<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 620px; margin: 0 auto; padding: 20px;">';
emailHtml += '<h1 style="color: #1a1a2e; border-bottom: 3px solid #6366f1; padding-bottom: 10px;">Nova Edição: ' + (newsletter.title || 'AI Pulse') + '</h1>';
emailHtml += '<p style="color: #444; font-size: 16px;">Uma nova edição da AI Pulse foi gerada e aguarda sua aprovação.</p>';
emailHtml += '<h2 style="color: #6366f1; margin-top: 25px;">Preview das Partes:</h2>';
for (const part of parts) {
  const preview = (part.content || '').substring(0, 280).replace(/\\n/g, ' ');
  emailHtml += '<div style="border-left: 4px solid #6366f1; padding: 10px 15px; margin: 15px 0; background: #f8f9fa; border-radius: 0 6px 6px 0;">';
  emailHtml += '<h3 style="margin: 0 0 5px 0; color: #1a1a2e;">' + part.part_title + '</h3>';
  emailHtml += '<p style="color: #888; margin: 0 0 8px 0; font-size: 13px;">~' + part.reading_time_minutes + ' min de leitura</p>';
  emailHtml += '<p style="color: #555; margin: 0; line-height: 1.5;">' + preview + '...</p>';
  emailHtml += '</div>';
}
emailHtml += '<hr style="margin: 35px 0; border: none; border-top: 1px solid #ddd;">';
emailHtml += '<div style="text-align: center;">';
emailHtml += '<a href="[APPROVE_URL]" style="display: inline-block; background: #22c55e; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 8px;">Aprovar e Publicar</a>';
emailHtml += '<a href="[REJECT_URL]" style="display: inline-block; background: #ef4444; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 8px;">Rejeitar</a>';
emailHtml += '</div>';
emailHtml += '<p style="text-align: center; color: #aaa; margin-top: 20px; font-size: 12px;">O conteúdo completo está no Notion com status "Aguardando Aprovação".</p>';
emailHtml += '</div>';

return [{
  json: {
    title: newsletter.title || 'AI Pulse - ' + today,
    date: today,
    htmlContent: htmlContent,
    markdownContent: markdownContent,
    topicsCovered: newsletter.topics_covered || [],
    newsletterData: newsletter,
    parts: parts,
    emailHtml: emailHtml,
    status: 'Aguardando Aprovação'
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
              selectValue: "Aguardando Aprovação"
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
        fromEmail: "={{ $env.APPROVAL_EMAIL }}",
        toEmail: "={{ $env.APPROVAL_EMAIL }}",
        subject: "={{ 'AI Pulse — Aprovar edição: ' + $('Formatar Newsletter').item.json.title }}",
        emailType: "html",
        html: "={{ $('Formatar Newsletter').item.json.emailHtml.replace('[APPROVE_URL]', $execution.resumeUrl + '?approved=true').replace('[REJECT_URL]', $execution.resumeUrl + '?approved=false') }}",
        options: {}
      },
      id: "email-send-approval",
      name: "Email: Pedido de Aprovação",
      type: "n8n-nodes-base.emailSend",
      typeVersion: 2.1,
      position: [2750, 300],
      credentials: {
        smtp: { id: "smtp-cred", name: "SMTP" }
      }
    },
    {
      parameters: {
        resume: "webhook",
        options: {}
      },
      id: "wait-approval",
      name: "Aguardar Aprovação",
      type: "n8n-nodes-base.wait",
      typeVersion: 1.1,
      position: [3000, 300]
    },
    {
      parameters: {
        conditions: {
          options: { caseSensitive: false },
          combinator: "and",
          conditions: [
            {
              leftValue: "={{ $json.query.approved }}",
              rightValue: "true",
              operator: { type: "string", operation: "equals" }
            }
          ]
        }
      },
      id: "if-approved",
      name: "Aprovado?",
      type: "n8n-nodes-base.if",
      typeVersion: 2,
      position: [3250, 300]
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
      position: [3500, 300],
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
      main: [[{ node: "Email: Pedido de Aprovação", type: "main", index: 0 }]]
    },
    "Email: Pedido de Aprovação": {
      main: [[{ node: "Aguardar Aprovação", type: "main", index: 0 }]]
    },
    "Aguardar Aprovação": {
      main: [[{ node: "Aprovado?", type: "main", index: 0 }]]
    },
    "Aprovado?": {
      main: [
        [{ node: "Beehiiv: Publicar Newsletter", type: "main", index: 0 }],
        []
      ]
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
// GENERATE ALL WORKFLOW FILES
// ============================================================
const workflows = [
  { fn: buildNewsletterPipeline, file: "01-newsletter-pipeline.json" },
  { fn: buildInstagramContent, file: "02-instagram-content.json" },
  { fn: buildLinkedInContent, file: "03-linkedin-content.json" }
];

for (const { fn, file } of workflows) {
  const workflow = fn();
  const filePath = path.join(WORKFLOWS_DIR, file);
  fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));
  console.log(`✓ Gerado: ${file} (${workflow.nodes.length} nodes)`);
}

console.log("\nTodos os workflows gerados com sucesso!");
