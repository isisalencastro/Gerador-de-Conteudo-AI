# Guia de Setup — Notion Databases

Guia detalhado para configurar os 4 databases do Notion necessários para o sistema de automação.

## Pré-requisitos

1. Conta no Notion (gratuito funciona)
2. Uma **Internal Integration** criada em [notion.so/my-integrations](https://www.notion.so/my-integrations)
3. Permissões: Read content, Update content, Insert content

## Passo 1: Criar a Integration

1. Acesse [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Clique em **"+ New integration"**
3. Nome: `IBA Automação`
4. Workspace: selecione seu workspace
5. Capabilities: marque **Read content**, **Update content**, **Insert content**
6. Clique em **Submit**
7. Copie o **Internal Integration Secret** (começa com `ntn_` ou `secret_`)

## Passo 2: Criar os Databases

Crie uma página principal chamada **"Hub de Conteúdo"** e dentro dela crie os 4 databases:

### Database 1: Newsletter

Crie um **Full page database** com as seguintes propriedades:

| Propriedade | Tipo | Configuração |
|------------|------|--------------|
| Name | Title | (padrão) |
| Status | Select | Opções: `Revisar` (amarelo), `Publicado` (verde) |
| Data | Date | — |
| Topics | Multi-select | Deixe vazio (preenchido automaticamente) |

### Database 2: Instagram

| Propriedade | Tipo | Configuração |
|------------|------|--------------|
| Name | Title | (padrão) |
| Status | Select | Opções: `Revisar` (amarelo), `Aprovado` (azul), `Publicado` (verde) |
| Data | Date | — |
| Formato | Select | Opções: `carousel`, `single`, `breaking` |
| Hashtags | Rich Text | — |
| CTA | Rich Text | — |
| Visual JSON | Rich Text | — |

### Database 3: LinkedIn

| Propriedade | Tipo | Configuração |
|------------|------|--------------|
| Name | Title | (padrão) |
| Status | Select | Opções: `Revisar` (amarelo), `Aprovado` (azul), `Publicado` (verde) |
| Data | Date | — |
| Hashtags | Rich Text | — |
| Image Prompt | Rich Text | — |
| Caracteres | Number | Formato: Number |
| Estratégia | Rich Text | — |

### Database 4: YouTube

| Propriedade | Tipo | Configuração |
|------------|------|--------------|
| Name | Title | (padrão) |
| Status | Select | Opções: `Ideia` (cinza), `Aprovada` (azul), `Roteirizada` (roxo), `Filmada` (laranja), `Publicada` (verde) |
| Data | Date | — |
| Formato | Select | Opções: `video-ensaio`, `storytelling`, `reflexão`, `diário-em-vídeo`, `análise-pessoal` |
| Inspiração | Rich Text | — |
| Ângulo Isis | Rich Text | — |
| Público-alvo | Rich Text | — |
| Duração Estimada | Rich Text | — |
| Potencial Viral | Select | Opções: `Baixo`, `Médio`, `Alto` |
| Keywords | Rich Text | — |
| Opções de Título | Rich Text | — |
| Tags YouTube | Rich Text | — |

## Passo 3: Conectar a Integration

Para **cada** database:

1. Abra o database em página inteira
2. Clique nos **3 pontinhos** (⋯) no canto superior direito
3. Clique em **"Connections"** → **"Connect to"**
4. Busque e selecione **"IBA Automação"**
5. Confirme

## Passo 4: Obter os Database IDs

Para cada database:

1. Abra o database em página inteira no navegador
2. A URL terá o formato: `https://www.notion.so/workspace/DATABASE_ID?v=...`
3. O DATABASE_ID são os 32 caracteres hexadecimais na URL
4. Copie e formate como UUID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

Use esses IDs nas variáveis de ambiente do N8N.

## Passo 5: Criar Views (Opcional mas Recomendado)

### Newsletter — Views sugeridas

- **Todas**: Table view sem filtro
- **Para Revisar**: Table view filtrada por Status = "Revisar"
- **Calendário**: Calendar view pela propriedade Data

### Instagram — Views sugeridas

- **Para Revisar**: Table view filtrada por Status = "Revisar"
- **Galeria**: Gallery view para preview visual
- **Por Formato**: Table view agrupada por Formato

### LinkedIn — Views sugeridas

- **Para Revisar**: Table view filtrada por Status = "Revisar"
- **Calendário**: Calendar view pela propriedade Data

### YouTube — Views sugeridas

- **Pipeline**: Board view agrupada por Status
- **Ideias Novas**: Table view filtrada por Status = "Ideia"
- **Aprovadas**: Table view filtrada por Status = "Aprovada"

## Dicas de Workflow no Notion

1. **Revise diariamente**: Abra a view "Para Revisar" de cada database
2. **Instagram**: Revise o copy, ajuste o visual no Figma usando o Visual JSON, publique
3. **LinkedIn**: Revise o texto, gere a imagem usando o Image Prompt, publique
4. **YouTube**: Mude status para "Aprovada" quando quiser roteirizar → trigger o workflow 05
5. **Newsletter**: Revise no Notion, depois publique no Beehiiv

## Automação do Status no Notion

Para facilitar, configure automações nativas do Notion:
- Quando uma página é criada → setar Data para hoje (se não preenchida)
- Quando Status muda para "Publicado" → adicionar data de publicação
