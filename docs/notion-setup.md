# Guia de Setup — Notion Database para YouTube

Guia para configurar o database do Notion usado pelo workflow principal de YouTube. Os databases complementares (Newsletter, Instagram, LinkedIn) seguem no final.

## Pré-requisitos

1. Conta no Notion (gratuito funciona)
2. Uma **Internal Integration** criada em [notion.so/my-integrations](https://www.notion.so/my-integrations)
3. Permissões: Read content, Update content, Insert content

## Passo 1: Criar a Integration

1. Acesse [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Clique em **"+ New integration"**
3. Nome: escolha um nome descritivo (ex: `Minha Notion API`)
4. Workspace: selecione seu workspace
5. Capabilities: marque **Read content**, **Update content**, **Insert content**
6. Clique em **Submit**
7. Copie o **Internal Integration Secret** (começa com `ntn_` ou `secret_`)

## Passo 2: Criar o Database de YouTube

Crie uma página chamada **"Hub de Conteúdo"** e dentro dela crie um **Full page database** com as seguintes propriedades:

### Database: YouTube (Principal)

| Propriedade | Tipo | Configuração |
|------------|------|--------------|
| Name | Title | (padrão) — título da ideia/vídeo |
| Status | Select | `Ideia` (cinza), `Aprovada` (azul), `Roteirizada` (roxo), `Filmada` (laranja), `Publicada` (verde) |
| Data | Date | Data de criação da ideia |
| Formato | Select | `video-ensaio`, `storytelling`, `reflexão`, `diário-em-vídeo`, `análise-pessoal` |
| Inspiração | Rich Text | Canal ou tendência que inspirou |
| Ângulo Isis | Rich Text | Perspectiva pessoal da Isis |
| Público-alvo | Rich Text | Audiência específica do vídeo |
| Duração Estimada | Rich Text | Tempo estimado do vídeo |
| Potencial Viral | Select | `Baixo`, `Médio`, `Alto` |
| Keywords | Rich Text | Palavras-chave separadas por vírgula |
| Opções de Título | Rich Text | Alternativas de título para A/B test (preenchido pelo roteirizador) |
| Tags YouTube | Rich Text | Tags para YouTube (preenchido pelo roteirizador) |

### Como o workflow usa cada propriedade

**Preenchidas pelo Gerador de Ideias:**
- Name, Status (`Ideia`), Data, Formato, Inspiração, Ângulo Isis, Público-alvo, Duração Estimada, Potencial Viral, Keywords

**Preenchidas pelo Roteirizador (quando status = `Aprovada`):**
- Status (atualiza para `Roteirizada`), Opções de Título, Tags YouTube, Duração Estimada (refinada)
- O roteiro completo é adicionado como conteúdo no corpo da página

**Preenchidas manualmente por Isis:**
- Status `Aprovada` (trigger para roteirizar), `Filmada`, `Publicada`

## Passo 3: Conectar a Integration ao Database

1. Abra o database em página inteira
2. Clique nos **3 pontinhos** (⋯) no canto superior direito
3. Clique em **"Connections"** → **"Connect to"**
4. Busque e selecione a Integration que você criou
5. Confirme

## Passo 4: Obter o Database ID

1. Abra o database em página inteira no navegador
2. A URL terá o formato: `https://www.notion.so/workspace/DATABASE_ID?v=...`
3. O DATABASE_ID são os 32 caracteres hexadecimais na URL
4. Formate como UUID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

Configure o ID como variável de ambiente `NOTION_YOUTUBE_DB_ID` no N8N (Settings → Variables). O workflow já referencia essa variável automaticamente nos nodes:

- `Notion: Ideias Existentes`
- `Notion: Salvar Ideia YouTube`
- `Preparar Query Notion`

## Passo 5: Views Recomendadas

### Pipeline (Board View) — Principal

Agrupe por **Status**. Cada coluna representa um estágio:

```
┌──────────┬──────────┬──────────────┬──────────┬───────────┐
│  Ideia   │ Aprovada │ Roteirizada  │ Filmada  │ Publicada │
│          │          │              │          │           │
│  ○ ○ ○   │  ○ ○     │    ○ ○       │   ○      │   ○ ○ ○   │
│  ○ ○     │          │              │          │           │
└──────────┴──────────┴──────────────┴──────────┴───────────┘
```

### Ideias Novas (Table View)

- Filtro: Status = `Ideia`
- Ordenação: Data (mais recente primeiro)
- Colunas visíveis: Name, Formato, Potencial Viral, Público-alvo, Keywords

### Para Roteirizar (Table View)

- Filtro: Status = `Aprovada`
- Mostra ideias aguardando o roteirizador automático

### Calendário (Calendar View)

- Por propriedade Data
- Visão geral de quando cada ideia foi gerada

## Fluxo de Trabalho no Notion

1. **Gerador roda** → 5 ideias aparecem com status `Ideia`
2. **Isis revisa** na view "Ideias Novas"
3. **Isis muda status** para `Aprovada` nas ideias que quer roteirizar
4. **Roteirizador detecta** (em até 30 min) e gera o roteiro completo
5. **Status muda** automaticamente para `Roteirizada`
6. **Isis abre a página** e encontra o roteiro com marcações de produção
7. **Isis filma** e muda status para `Filmada`
8. **Isis publica** e muda status para `Publicada`

---

## Databases Complementares

### Database: Newsletter

| Propriedade | Tipo | Configuração |
|------------|------|--------------|
| Name | Title | Título da edição |
| Status | Select | `Revisar`, `Aguardando Aprovação`, `Publicado` |
| Data | Date | Data da edição |
| Topics | Multi-select | Tópicos cobertos (preenchido automaticamente) |

### Database: Instagram

| Propriedade | Tipo | Configuração |
|------------|------|--------------|
| Name | Title | Hook/título do post |
| Status | Select | `Revisar`, `Aprovado`, `Publicado` |
| Data | Date | Data do post |
| Formato | Select | `carousel`, `single`, `breaking` |
| Hashtags | Rich Text | Hashtags do post |
| CTA | Rich Text | Call to action |
| Visual JSON | Rich Text | Instruções visuais para design |

### Database: LinkedIn

| Propriedade | Tipo | Configuração |
|------------|------|--------------|
| Name | Title | Hook do post |
| Status | Select | `Revisar`, `Aprovado`, `Publicado` |
| Data | Date | Data do post |
| Hashtags | Rich Text | Hashtags |
| Image Prompt | Rich Text | Prompt para geração de imagem |
| Caracteres | Number | Contagem de caracteres |
| Estratégia | Rich Text | Estratégia de engajamento |

Para os workflows complementares (01–03), configure as variáveis de ambiente no N8N:

| Variável | Database |
|----------|----------|
| `NOTION_NEWSLETTER_DB_ID` | Newsletter |
| `NOTION_INSTAGRAM_DB_ID` | Instagram |
| `NOTION_LINKEDIN_DB_ID` | LinkedIn |
| `NOTION_YOUTUBE_DB_ID` | YouTube |
| `BEEHIIV_PUBLICATION_ID` | ID da publicação no Beehiiv |
