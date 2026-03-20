# Setup do Notion — Database de Conteudo

Guia para configurar o database do Notion usado pelo workflow principal de YouTube. Os databases complementares (Newsletter, Instagram, LinkedIn) seguem no final.

## Pre-requisitos

1. Conta no Notion (gratuito funciona)
2. Uma **Internal Integration** criada em [notion.so/my-integrations](https://www.notion.so/my-integrations)
3. Permissoes: Read content, Update content, Insert content

## Passo 1: Criar a Integration

1. Acesse [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Clique em **"+ New integration"**
3. Nome: escolha um nome descritivo (ex: `Content Pipeline API`)
4. Workspace: selecione seu workspace
5. Capabilities: marque **Read content**, **Update content**, **Insert content**
6. Clique em **Submit**
7. Copie o **Internal Integration Secret** (comeca com `ntn_` ou `secret_`)

## Passo 2: Criar o Database de YouTube

Crie uma pagina chamada **"Hub de Conteudo"** (ou o nome que preferir) e dentro dela crie um **Full page database** com as seguintes propriedades:

### Database: YouTube (Principal)

| Propriedade | Tipo | Configuracao | Customizavel? |
|------------|------|--------------|---------------|
| Name | Title | (padrao) — titulo da ideia/video | -- |
| Status | Select | `Ideia`, `Aprovada`, `Roteirizada`, `Filmada`, `Publicada` | Adicione ou renomeie estagios conforme seu pipeline |
| Data | Date | Data de criacao da ideia | -- |
| Formato | Select | `video-ensaio`, `storytelling`, `reflexao`, `diario-em-video`, `analise-pessoal` | Adapte para os formatos do seu canal |
| Inspiracao | Rich Text | Canal ou tendencia que inspirou | -- |
| Angulo Editorial | Rich Text | Perspectiva unica do creator sobre o tema | Renomeie para refletir seu posicionamento |
| Publico-alvo | Rich Text | Audiencia especifica do video | -- |
| Duracao Estimada | Rich Text | Tempo estimado do video | -- |
| Potencial Viral | Select | `Baixo`, `Medio`, `Alto` | -- |
| Keywords | Rich Text | Palavras-chave separadas por virgula | -- |
| Opcoes de Titulo | Rich Text | Alternativas de titulo para A/B test | -- |
| Tags YouTube | Rich Text | Tags para YouTube | -- |

> **Nota sobre "Angulo Editorial":** Na implementacao de referencia, esse campo se chama "Angulo Isis". Se voce renomear, atualize tambem o mapeamento no node `Notion: Salvar Ideia YouTube` para o novo nome da propriedade.

### Como o workflow usa cada propriedade

**Preenchidas pelo Gerador de Ideias:**
- Name, Status (`Ideia`), Data, Formato, Inspiracao, Angulo Editorial, Publico-alvo, Duracao Estimada, Potencial Viral, Keywords

**Preenchidas pelo Roteirizador (quando status = `Aprovada`):**
- Status (atualiza para `Roteirizada`), Opcoes de Titulo, Tags YouTube, Duracao Estimada (refinada)
- O roteiro completo e adicionado como conteudo no corpo da pagina

**Preenchidas manualmente pelo creator:**
- Status `Aprovada` (trigger para roteirizar), `Filmada`, `Publicada`

### Propriedades que voce pode adicionar

Dependendo do seu fluxo, considere adicionar:

| Propriedade sugerida | Tipo | Uso |
|---------------------|------|-----|
| URL do Video | URL | Link do video publicado |
| Data de Publicacao | Date | Quando foi publicado |
| Performance | Select | `Abaixo`, `Esperado`, `Acima` |
| Observacoes | Rich Text | Notas pessoais do creator |

Essas propriedades nao sao usadas pelo workflow automatizado, mas ajudam no gerenciamento manual.

## Passo 3: Conectar a Integration ao Database

1. Abra o database em pagina inteira
2. Clique nos **3 pontinhos** (⋯) no canto superior direito
3. Clique em **"Connections"** → **"Connect to"**
4. Busque e selecione a Integration que voce criou
5. Confirme

## Passo 4: Obter o Database ID

1. Abra o database em pagina inteira no navegador
2. A URL tera o formato: `https://www.notion.so/workspace/DATABASE_ID?v=...`
3. O DATABASE_ID sao os 32 caracteres hexadecimais na URL
4. Formate como UUID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

Configure o ID como variavel de ambiente `NOTION_YOUTUBE_DB_ID` no N8N (Settings → Variables). O workflow ja referencia essa variavel automaticamente nos nodes:

- `Notion: Ideias Existentes`
- `Notion: Salvar Ideia YouTube`
- `Preparar Query Notion`

## Passo 5: Views Recomendadas

### Pipeline (Board View) — Principal

Agrupe por **Status**. Cada coluna representa um estagio:

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
- Ordenacao: Data (mais recente primeiro)
- Colunas visiveis: Name, Formato, Potencial Viral, Publico-alvo, Keywords

### Para Roteirizar (Table View)

- Filtro: Status = `Aprovada`
- Mostra ideias aguardando o roteirizador automatico

### Calendario (Calendar View)

- Por propriedade Data
- Visao geral de quando cada ideia foi gerada

## Fluxo de Trabalho no Notion

1. **Gerador roda** → 5 ideias aparecem com status `Ideia`
2. **Creator revisa** na view "Ideias Novas"
3. **Creator muda status** para `Aprovada` nas ideias que quer roteirizar
4. **Roteirizador detecta** (em ate 30 min) e gera o roteiro completo
5. **Status muda** automaticamente para `Roteirizada`
6. **Creator abre a pagina** e encontra o roteiro com marcacoes de producao
7. **Creator filma** e muda status para `Filmada`
8. **Creator publica** e muda status para `Publicada`

---

## Databases Complementares

Opcionais. Usados pelos workflows 01-03 gerados via `generate-workflows.js`.

### Database: Newsletter

| Propriedade | Tipo | Configuracao |
|------------|------|--------------|
| Name | Title | Titulo da edicao |
| Status | Select | `Revisar`, `Aguardando Aprovacao`, `Publicado` |
| Data | Date | Data da edicao |
| Topics | Multi-select | Topicos cobertos (preenchido automaticamente) |

### Database: Instagram

| Propriedade | Tipo | Configuracao |
|------------|------|--------------|
| Name | Title | Hook/titulo do post |
| Status | Select | `Revisar`, `Aprovado`, `Publicado` |
| Data | Date | Data do post |
| Formato | Select | `carousel`, `single`, `breaking` |
| Hashtags | Rich Text | Hashtags do post |
| CTA | Rich Text | Call to action |
| Visual JSON | Rich Text | Instrucoes visuais para design |

### Database: LinkedIn

| Propriedade | Tipo | Configuracao |
|------------|------|--------------|
| Name | Title | Hook do post |
| Status | Select | `Revisar`, `Aprovado`, `Publicado` |
| Data | Date | Data do post |
| Hashtags | Rich Text | Hashtags |
| Image Prompt | Rich Text | Prompt para geracao de imagem |
| Caracteres | Number | Contagem de caracteres |
| Estrategia | Rich Text | Estrategia de engajamento |

Para os workflows complementares (01-03), configure as variaveis de ambiente no N8N:

| Variavel | Database |
|----------|----------|
| `NOTION_YOUTUBE_DB_ID` | YouTube |
| `NOTION_NEWSLETTER_DB_ID` | Newsletter |
| `NOTION_INSTAGRAM_DB_ID` | Instagram |
| `NOTION_LINKEDIN_DB_ID` | LinkedIn |
| `BEEHIIV_PUBLICATION_ID` | ID da publicacao no Beehiiv |
