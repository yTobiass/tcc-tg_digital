# Script para Claude Code — Sistema de Gestão do Tiro de Guerra (TCC)

## Contexto do Projeto

Estou desenvolvendo meu TCC: um sistema web completo para gerenciamento de um Tiro de Guerra (TG), utilizando React no frontend e Node.js com SQLite no backend. O sistema deve cobrir todas as operações diárias do TG, com hierarquia de usuários, dashboards de evolução de treinos e geração de PDFs do diário de rotina.

---

## Stack Tecnológica

- **Frontend:** React + Vite, React Router, TailwindCSS, Recharts (gráficos), React-PDF ou jsPDF (geração de PDF)
- **Backend:** Node.js + Express
- **Banco de dados:** SQLite com better-sqlite3
- **Autenticação:** JWT (JSON Web Token)
- **ORM/Query Builder:** Knex.js
- **Outros:** date-fns (datas), zod (validação)

---

## Estrutura de Pastas

```
tiro-de-guerra/
├── client/                  # Frontend React
│   ├── src/
│   │   ├── assets/
│   │   ├── components/      # Componentes reutilizáveis
│   │   │   ├── ui/          # Botões, inputs, modais, tabelas
│   │   │   ├── layout/      # Sidebar, Header, ProtectedRoute
│   │   │   └── charts/      # Componentes de gráfico
│   │   ├── pages/
│   │   │   ├── auth/        # Login
│   │   │   ├── dashboard/   # Dashboard principal
│   │   │   ├── soldados/    # CRUD de soldados
│   │   │   ├── treinos/     # Registro e dashboard de treinos
│   │   │   ├── diario/      # Diário de rotina + geração de PDF
│   │   │   ├── relatorios/  # Relatórios e exportações
│   │   │   └── admin/       # Gerenciamento de usuários (comandante)
│   │   ├── hooks/           # useAuth, useSoldados, useTreinos, etc.
│   │   ├── services/        # Chamadas à API (axios)
│   │   ├── context/         # AuthContext
│   │   ├── utils/           # Formatadores, helpers PDF
│   │   └── routes/          # Definição de rotas e guards
│   └── package.json
│
├── server/                  # Backend Node.js
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middlewares/     # auth, roles, validação
│   │   ├── models/          # Queries SQLite
│   │   ├── services/
│   │   └── database/
│   │       ├── db.js        # Conexão SQLite
│   │       └── migrations/  # Scripts de criação de tabelas
│   └── package.json
│
└── README.md
```

---

## Modelagem do Banco de Dados (SQLite)

```sql
-- Usuários do sistema
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  login TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('comandante', 'sargento', 'soldado')),
  soldado_id INTEGER REFERENCES soldados(id), -- vinculado se role = 'soldado'
  ativo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Soldados do Tiro de Guerra
CREATE TABLE soldados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ra TEXT UNIQUE NOT NULL,           -- Registro de Atirador
  nome_completo TEXT NOT NULL,
  data_nascimento TEXT,
  data_incorporacao TEXT,
  pelotao TEXT,
  turma TEXT,
  status TEXT DEFAULT 'ativo' CHECK(status IN ('ativo', 'licenca', 'baixado', 'dispensado')),
  foto_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Tipos de treino/atividade
CREATE TABLE tipos_treino (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,                 -- Ex: "Corrida 12min", "Flexão", "Abdominal"
  unidade TEXT,                       -- Ex: "metros", "repetições", "segundos"
  descricao TEXT
);

-- Registros de presença/treino por soldado
CREATE TABLE registros_treino (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  soldado_id INTEGER NOT NULL REFERENCES soldados(id),
  tipo_treino_id INTEGER NOT NULL REFERENCES tipos_treino(id),
  data TEXT NOT NULL,
  resultado REAL,                     -- Valor numérico (distância, reps, tempo)
  presente INTEGER DEFAULT 1,         -- 0 = ausente, 1 = presente
  observacao TEXT,
  registrado_por INTEGER REFERENCES usuarios(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Avaliações físicas periódicas (TAF)
CREATE TABLE avaliacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  soldado_id INTEGER NOT NULL REFERENCES soldados(id),
  data TEXT NOT NULL,
  corrida_resultado REAL,
  flexao_resultado INTEGER,
  abdominal_resultado INTEGER,
  nota_final REAL,
  conceito TEXT CHECK(conceito IN ('Excelente', 'Muito Bom', 'Bom', 'Regular', 'Insuficiente')),
  avaliado_por INTEGER REFERENCES usuarios(id)
);

-- Diário de Rotina
-- Baseado no formulário oficial: Ministério da Defesa - Exército Brasileiro
-- CMSE - CMDO 2ª RM — Tiro de Guerra 02-032 (Rio Claro-SP)
-- "Parte do Comandante da Guarda Relativa ao Serviço"
-- Os campos são auto-populados a partir dos dados já cadastrados no sistema
CREATE TABLE diario_rotina (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Cabeçalho (auto-preenchido)
  data_servico TEXT UNIQUE NOT NULL,   -- "DO DIA __/__/____" → data da guarda
  data_para TEXT NOT NULL,             -- "PARA O DIA __/__/____" → dia seguinte (auto)
  ch_instr_id INTEGER REFERENCES usuarios(id), -- Ch Instr que assina o VISTO

  -- Item 01: Parada Diária
  -- "Com ou Sem Alteração. Relacionar faltas, atrasos ou qualquer ocorrência"
  parada_diaria_status TEXT NOT NULL CHECK(parada_diaria_status IN ('Com Alteração','Sem Alteração')),
  parada_diaria_descricao TEXT,        -- Detalhes se houver alteração

  -- Item 02: Recebimento do Serviço
  -- "Recebi do Monitor/Atirador (Nº e Nome de Guerra), com ou sem alteração"
  recebimento_monitor_numero TEXT,     -- Nº do monitor anterior (auto da escala anterior)
  recebimento_monitor_nome TEXT,       -- Nome de guerra (auto-preenchido)
  recebimento_status TEXT NOT NULL CHECK(recebimento_status IN ('Com Alteração','Sem Alteração')),

  -- Item 03: Pessoal de Serviço
  -- a) Cmt Gd: Monitor nº ___-___ (nome de guerra)  → cabo da escala vinculada
  -- b) Guardas: Atirador nº ___-___ x3              → atiradores da escala vinculada
  -- Todos auto-preenchidos ao selecionar a escala do dia
  escala_id INTEGER REFERENCES escalas_guarda(id),

  -- Tabela Posto/Quarto/Nº/Nome
  -- Posto 1 tem 3 quartos com horários fixos:
  --   1º: 08h às 10h / 14h às 16h / 20h às 22h / 02h às 04h
  --   2º: 10h às 12h / 16h às 20h / 22h às 24h / 04h às 06h
  --   3º: 12h às 14h / 18h às 22h / 20h às 24h / 06h às 08h
  -- Armazenado em JSON: [{ quarto:"1º", numero:"101-1", nome:"SOUZA" }, ...]
  postos_sentinela TEXT,               -- JSON com os 3 sentinelas do Posto 1

  -- Item 04: Material Carga
  material_carga_status TEXT NOT NULL CHECK(material_carga_status IN ('Com Alteração','Sem Alteração')),
  material_carga_descricao TEXT,

  -- Item 05: Instalações
  instalacoes_status TEXT NOT NULL CHECK(instalacoes_status IN ('Com Alteração','Sem Alteração')),
  instalacoes_descricao TEXT,

  -- Item 06: Iluminação
  iluminacao_status TEXT NOT NULL CHECK(iluminacao_status IN ('Com Alteração','Sem Alteração')),
  iluminacao_descricao TEXT,

  -- Item 07: Ocorrências
  -- "Relatar todas as alterações ocorridas durante o serviço"
  ocorrencias_texto TEXT,              -- Se vazio, imprime "Nada a Registrar" no PDF

  -- Item 08: Passagem do Serviço
  -- "Fiz ao Monitor/Atirador Nº ___ - Nome de Guerra ___, com todas as ordens em vigor"
  passagem_monitor_numero TEXT,        -- Auto da próxima escala (se cadastrada)
  passagem_monitor_nome TEXT,

  -- Rodapé (todos auto-preenchidos)
  -- "Tiro de Guerra em Rio Claro-SP, ___ de ________ de 2024."
  -- Assinatura: NOME COMPLETO - MONITOR / CMT DA GUARDA → cabo da escala

  registrado_por INTEGER REFERENCES usuarios(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Ocorrências/comunicados
CREATE TABLE ocorrencias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  soldado_id INTEGER REFERENCES soldados(id),  -- Pode ser geral (NULL)
  tipo TEXT,                         -- 'elogio', 'advertencia', 'dispensa', 'outro'
  descricao TEXT NOT NULL,
  data TEXT NOT NULL,
  registrado_por INTEGER REFERENCES usuarios(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Escalas de guarda
CREATE TABLE escalas_guarda (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK(tipo IN ('verde', 'preta', 'vermelha')),
  data_inicio TEXT NOT NULL,         -- Data de início da guarda
  data_fim TEXT NOT NULL,            -- Data de fim da guarda
  status TEXT DEFAULT 'agendada' CHECK(status IN ('agendada', 'em_andamento', 'concluida', 'cancelada')),
  observacoes TEXT,                  -- Campo livre para punições/repetições justificadas
  criado_por INTEGER REFERENCES usuarios(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Membros de cada escala (quem foi escalado)
CREATE TABLE escala_membros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  escala_id INTEGER NOT NULL REFERENCES escalas_guarda(id) ON DELETE CASCADE,
  soldado_id INTEGER NOT NULL REFERENCES soldados(id),
  funcao TEXT NOT NULL CHECK(funcao IN ('cabo', 'atirador')),
  motivo_repeticao TEXT,             -- Preenchido quando é punição/repetição fora da ordem
  UNIQUE(escala_id, soldado_id)
);

-- Fila de rotação por tipo de guarda
-- Controla a posição de cada soldado na fila de cada tipo de guarda
CREATE TABLE fila_rotacao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  soldado_id INTEGER NOT NULL REFERENCES soldados(id),
  tipo_guarda TEXT NOT NULL CHECK(tipo_guarda IN ('verde', 'preta', 'vermelha')),
  posicao INTEGER NOT NULL,          -- Posição atual na fila (menor = próximo a ser escalado)
  ultima_escala_id INTEGER REFERENCES escalas_guarda(id),
  ultima_data TEXT,                  -- Data da última vez que fez essa guarda
  UNIQUE(soldado_id, tipo_guarda)
);
```

---

## Hierarquia de Permissões

| Funcionalidade                  | Comandante | Sargento | Soldado |
|---------------------------------|:----------:|:--------:|:-------:|
| Ver próprio perfil/treinos      | ✅         | ✅       | ✅      |
| Registrar treinos e presenças   | ✅         | ✅       | ❌      |
| Cadastrar/editar soldados       | ✅         | ✅       | ❌      |
| Preencher diário de rotina      | ✅         | ✅       | ❌      |
| Gerar PDFs                      | ✅         | ✅       | ❌      |
| Gerenciar escalas de guarda     | ✅         | ✅       | ❌      |
| Ver própria escala de guarda    | ✅         | ✅       | ✅      |
| Gerenciar usuários do sistema   | ✅         | ❌       | ❌      |
| Ver todos os dashboards         | ✅         | ✅       | ❌      |
| Ver relatórios completos        | ✅         | ✅       | ❌      |

---

## Rotas da API (Backend)

### Autenticação
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

### Soldados
```
GET    /api/soldados              # Listar todos (com filtros: turma, pelotão, status)
GET    /api/soldados/:id          # Detalhes do soldado
POST   /api/soldados              # Cadastrar novo soldado
PUT    /api/soldados/:id          # Editar soldado
PATCH  /api/soldados/:id/status   # Alterar status (ativo, licença, etc.)
GET    /api/soldados/:id/treinos  # Histórico de treinos do soldado
GET    /api/soldados/:id/avaliacoes # Histórico de avaliações
```

### Treinos e Presenças
```
GET    /api/treinos               # Listar registros (com filtro por data, soldado)
POST   /api/treinos               # Registrar treino/presença (individual ou em lote)
PUT    /api/treinos/:id           # Editar registro
GET    /api/treinos/dashboard     # Dados agregados para o dashboard
```

### Avaliações Físicas
```
GET    /api/avaliacoes
POST   /api/avaliacoes
PUT    /api/avaliacoes/:id
GET    /api/avaliacoes/comparativo # Evolução ao longo do tempo
```

### Diário de Rotina
```
GET    /api/diario                # Listar diários (paginado)
GET    /api/diario/:data          # Buscar diário por data
POST   /api/diario                # Criar diário do dia
PUT    /api/diario/:data          # Atualizar diário
GET    /api/diario/:data/pdf      # Gerar PDF do diário
```

### Relatórios
```
GET    /api/relatorios/presenca        # Relatório de presença por período
GET    /api/relatorios/evolucao        # Evolução de treinos por soldado/turma
GET    /api/relatorios/avaliacao       # Comparativo de avaliações
GET    /api/relatorios/efetivo         # Relatório de efetivo
```

### Admin (apenas comandante)
```
GET    /api/usuarios
POST   /api/usuarios
PUT    /api/usuarios/:id
DELETE /api/usuarios/:id
```

### Escalas de Guarda
```
GET    /api/escalas                        # Listar escalas (filtro: tipo, mês, status)
GET    /api/escalas/:id                    # Detalhes de uma escala com membros
POST   /api/escalas                        # Criar nova escala (manual ou gerada pela fila)
PUT    /api/escalas/:id                    # Editar escala (trocar membro, observação)
PATCH  /api/escalas/:id/status            # Atualizar status (concluída, cancelada)
DELETE /api/escalas/:id                    # Cancelar/remover escala agendada

GET    /api/escalas/sugestao              # Retorna sugestão automática baseada na fila de rotação
                                          # query params: tipo, data_inicio
GET    /api/escalas/fila/:tipo            # Ver fila de rotação atual de um tipo de guarda
POST   /api/escalas/fila/:tipo/reordenar  # Reordenar fila manualmente (punição/ajuste)

GET    /api/escalas/soldado/:id           # Histórico de guardas de um soldado
GET    /api/escalas/calendario            # Visão calendário com todas as escalas do mês
GET    /api/escalas/pdf/:id               # Gerar PDF da escala
```

---

## Páginas e Fluxos do Frontend

### 1. Login
- Formulário de login com campo de usuário e senha
- Redirecionamento conforme o role após autenticação
- JWT salvo no localStorage ou cookie httpOnly

### 2. Dashboard Principal
- Cards de resumo: total de soldados ativos, presença do dia, próxima avaliação
- Gráfico de linha: evolução de presença nas últimas 4 semanas
- Gráfico de barras: comparativo de resultados por pelotão/turma
- Alertas: soldados com muitas faltas, avaliações pendentes

### 3. Gerenciamento de Soldados
- Tabela paginada com busca, filtro por turma/pelotão/status
- Botão de cadastrar novo soldado (modal ou página separada)
- Perfil do soldado: dados pessoais, foto, histórico de treinos, gráfico de evolução, ocorrências

### 4. Registro de Treinos e Presenças
- Seleção de data e tipo de atividade
- Lista de todos os soldados com campo de resultado e checkbox de presença
- Opção de "registro em lote" para marcar presença de toda a turma de uma vez
- Histórico de registros com filtros

### 5. Avaliações Físicas (TAF)
- Formulário de nova avaliação por soldado
- Campos: corrida, flexão, abdominal → cálculo automático de nota e conceito
- Histórico e gráfico de evolução individual

### 6. Diário de Rotina
Baseado no formulário oficial "Parte do Comandante da Guarda Relativa ao Serviço" (TG 02-032, Rio Claro-SP).

**Fluxo de preenchimento:**
1. Sargento seleciona a **data da guarda** → o sistema busca automaticamente a escala vinculada
2. Os seguintes campos são **auto-preenchidos** sem interação do usuário:
   - Cabeçalho: "DO DIA" e "PARA O DIA" (data + dia seguinte)
   - **Item 02:** Nº e Nome de Guerra do monitor anterior (buscado da escala do dia anterior)
   - **Item 03a:** Cabo da escala (Cmt Gd / Monitor) → Nº de RA e nome de guerra
   - **Item 03b:** Os 3 atiradores escalados → Nº e nome de guerra de cada um
   - **Item 08:** Nº e Nome do monitor da próxima escala (se já cadastrada)
   - **Rodapé:** Data por extenso + Nome completo do cabo (CMT DA GUARDA)
3. O sargento preenche apenas os campos de **conteúdo variável**:
   - Item 01 – Parada Diária: botão "Com/Sem Alteração" + campo de texto se houver
   - Item 03 – Tabela de Posto: Nº e Nome dos 3 sentinelas para os quartos (1º, 2º, 3º)
   - Item 04 – Material Carga: Com/Sem Alteração + detalhes
   - Item 05 – Instalações: Com/Sem Alteração + detalhes
   - Item 06 – Iluminação: Com/Sem Alteração + detalhes
   - Item 07 – Ocorrências: campo de texto livre (se vazio → "Nada a Registrar" no PDF)
4. **Preview** do documento antes de salvar
5. Botão **"Gerar PDF"** → gera documento idêntico ao formulário físico, pronto para impressão

**Layout do PDF:**
- Cabeçalho oficial: "MINISTÉRIO DA DEFESA – EXÉRCITO BRASILEIRO – CMSE – CMDO 2ª RM"
- "TIRO DE GUERRA 02-032 (RIO CLARO-SP)"
- Tabela de postos com horários fixos impressos (conforme formulário)
- Seções numeradas de 01 a 08
- Rodapé com local, data por extenso e campo de assinatura
- Margem de 1,5 cm dos dois lados (conforme instrução do formulário)
- Sem linhas em branco (conforme regra do formulário físico)

**Histórico:** Lista de diários anteriores com busca por data; diários já gerados ficam bloqueados para edição (somente leitura), com opção de reimpressão do PDF.

### 7. Relatórios
- Relatório de presença: filtro por período, turma, soldado → tabela + gráfico + exportar PDF
- Relatório de evolução de treinos: gráfico de linha por métrica
- Relatório de efetivo: situação atual de todos os soldados

### 8. Admin (Comandante)
- CRUD de usuários do sistema
- Definição de roles e vínculo com soldado

### 9. Escalas de Guarda
- **Visão calendário mensal:** mostra os dias com guardas agendadas, coloridas por tipo (verde 🟢, preta ⚫, vermelha 🔴)
- **Criar nova escala:** selecionar tipo → o sistema sugere automaticamente os próximos da fila → sargento confirma ou ajusta manualmente
- **Detalhe da escala:** exibe quem está escalado (cabo + atiradores), data/período, status
- **Fila de rotação:** tabela mostrando a posição atual de cada soldado na fila de cada tipo de guarda; permite reordenar via drag-and-drop ou mover para o fim (punição)
- **Histórico por soldado:** no perfil do soldado, aba com todas as guardas que já fez, por tipo
- **Gerar PDF da escala:** documento formal com os nomes dos escalados, tipo, data e assinatura
- **Notificação visual:** no dashboard, card mostrando as próximas guardas dos próximos 7 dias

---

## Regras de Negócio

1. **Presença:** Um soldado só pode ter um registro por tipo de treino por dia.
2. **TAF:** A nota final segue a tabela oficial do Exército Brasileiro. O conceito é calculado automaticamente com base na faixa de nota.
3. **Diário:** Apenas um diário por data. Se já existe, o formulário abre em modo de edição (bloqueado após PDF gerado).
   - O sistema auto-preenche todos os campos derivados da escala de guarda vinculada ao dia.
   - O campo "PARA O DIA" é sempre data_servico + 1 dia (calculado automaticamente).
   - O monitor recebido (item 02) é o cabo da escala do dia anterior; o monitor passado (item 08) é o cabo da escala do dia seguinte — ambos buscados do banco automaticamente.
   - Os horários dos quartos do Posto 1 são fixos e impressos no PDF sem necessidade de preenchimento:
     - 1º Quarto: 08h–10h / 14h–16h / 20h–22h / 02h–04h
     - 2º Quarto: 10h–12h / 16h–20h / 22h–24h / 04h–06h
     - 3º Quarto: 12h–14h / 18h–22h / 20h–24h / 06h–08h
   - Ocorrências vazias imprimem "Nada a Registrar" automaticamente no PDF.
   - O PDF respeita a instrução do formulário físico: margem de 1,5 cm, sem linhas em branco.
4. **Status do soldado:** Soldados com status `baixado` ou `dispensado` não aparecem nos registros de treino ativos, mas o histórico é preservado.
5. **Permissões:** Todas as rotas da API devem validar o JWT e o role do usuário. Respostas com 401 (não autenticado) e 403 (sem permissão) devem ser tratadas no frontend.
6. **PDF do diário:** O PDF replica fielmente o formulário físico oficial (TG 02-032, Rio Claro-SP), com todos os campos auto-preenchidos a partir dos dados do sistema. O sargento só digita o conteúdo variável (ocorrências, alterações). Após gerar o PDF, o registro é bloqueado para edição.
7. **Soldado vinculado a usuário:** Quando um soldado faz login, ele só visualiza seus próprios dados (perfil, treinos, avaliações) e suas escalas de guarda futuras.

### Regras de Negócio — Escalas de Guarda

**Tipos de guarda e composição:**
| Tipo | Período | Composição | Restrição |
|------|---------|------------|-----------|
| 🟢 Verde | Tarde de um dia (seg–sex) | 1 atirador | Apenas atiradores; 1 por tarde |
| ⚫ Preta | De um dia para o outro (~24h) | 1 cabo + 3 atiradores | Cabo obrigatório |
| 🔴 Vermelha | Sábado e domingo (fim de semana) | 1 cabo + 3 atiradores | Cabo obrigatório |

**Rotação automática:**
- Cada tipo de guarda tem sua própria fila independente de rotação.
- A fila é ordenada pela posição; o sistema sempre sugere os próximos soldados com menor posição (que há mais tempo não fazem aquele tipo de guarda).
- Após confirmada a escala, os soldados escalados vão para o fim de suas filas (posição máxima + 1), e os demais sobem na fila.
- A fila é inicializada na ordem de incorporação (data de entrada no TG) na primeira vez que o módulo é ativado.

**Punição / repetição manual:**
- O sargento pode mover qualquer soldado de volta para o início da fila (posição 1) como punição, registrando o motivo no campo `motivo_repeticao`.
- O motivo fica registrado no histórico da escala e no perfil do soldado.
- A fila dos demais não é afetada; o soldado punido simplesmente é inserido na próxima escala daquele tipo.

**Restrições de escalação:**
- Soldados com status `licenca`, `baixado` ou `dispensado` são automaticamente pulados na fila e não aparecem nas sugestões.
- Um soldado não pode estar em duas escalas simultâneas (sobreposição de datas).
- A guarda verde só pode ter **um** atirador por tarde — o sistema deve impedir duplicidade na mesma data/tarde.
- Para guardas preta e vermelha, o cabo deve ser um soldado com a graduação `cabo` registrada no cadastro (`graduacao` a ser adicionado na tabela `soldados`).

**Campo adicional na tabela `soldados`:**
```sql
ALTER TABLE soldados ADD COLUMN graduacao TEXT DEFAULT 'atirador'
  CHECK(graduacao IN ('atirador', 'cabo'));
```

---

## Ordem de Implementação Sugerida

1. Setup do projeto (Vite + React, Node + Express, SQLite, Knex migrations)
2. Autenticação (JWT, login, guards de rota)
3. CRUD de soldados (backend + frontend)
4. Registro de treinos e presenças
5. Dashboard com gráficos
6. Avaliações físicas (TAF)
7. Diário de rotina + geração de PDF
8. **Escalas de guarda** (fila de rotação, sugestão automática, calendário, PDF)
9. Relatórios e exportações
10. Módulo admin (gerenciamento de usuários)
11. Ajustes de UI, testes e documentação

---

## Observação sobre o Diário de Rotina

O formulário físico foi mapeado a partir da imagem oficial do TG 02-032 (Rio Claro-SP). O PDF gerado pelo sistema deve ser **idêntico ao formulário impresso**, com os campos auto-preenchidos pelos dados do banco. O sargento não precisa digitar nomes, números ou datas — apenas o conteúdo de ocorrências e alterações.

---

## Informações Levantadas com o Subtenente/Sargento

### Efetivo e Soldados
- Efetivo aproximado: **~100 soldados por ano** (varia a cada turma)
- Quantidade de cabos: **variável a cada ano** — o superior pode promover ou despromover a qualquer momento
- Por isso, a graduação (`atirador` / `cabo`) deve ser editável a qualquer momento no cadastro do soldado
- Os soldados têm acesso a computador/celular dentro do TG e podem acessar o sistema

### Estrutura do TG
- Existe apenas **Posto 1** (único posto de sentinela)
- Os horários dos 3 quartos são sempre fixos (conforme formulário físico)
- Não há outros relatórios ou documentos além do diário de rotina
- Já existe dados dos soldados em planilha/documento digital → implementar **importação via CSV ou Excel** no cadastro inicial

### Escalas de Guarda
- Guarda verde ocorre de **segunda a sexta** (não ocorre nos fins de semana)
- Apenas **atiradores** podem fazer guarda verde (cabos nunca são escalados na verde)
- Períodos sem guarda existem e são definidos pelo **comandante** (recesso, feriados especiais)
  → Implementar no sistema um campo de **bloqueio de período** (datas sem guarda) configurável pelo comandante
- A quantidade de cabos muda todo ano → o sistema deve se adaptar automaticamente à quantidade disponível

### Uso do Sistema no Dia a Dia
- Não haverá um responsável fixo diário — o uso é **periódico** (não todo dia)
- Isso impacta o design: a interface deve ser **intuitiva e autoexplicativa**, sem depender de treinamento contínuo
- Priorizar fluxos simples: poucos cliques para as ações mais comuns (registrar presença, preencher diário, gerar escala)

### Importação de Dados Iniciais
- Já existe uma planilha com dados dos soldados
- Implementar na tela de soldados um botão **"Importar CSV/Excel"** que leia as colunas da planilha e popule o banco
- Definir um modelo de planilha padrão para importação (disponibilizar para download no sistema)

### Infraestrutura e Rede
- Sistema roda **localmente no computador do TG** (sem hospedagem externa, custo zero)
- Acesso via navegador pelo IP local da máquina: `http://192.168.x.x:3000`
- Todos os dispositivos na mesma rede (Wi-Fi ou cabo) acessam normalmente
- Existem **2 roteadores** na unidade — verificar na instalação se estão em cascata (mesma rede) ou independentes
- Computadores conectados por cabo; soldados podem acessar por celular via Wi-Fi
- **Configurar IP fixo** no computador servidor para o endereço não mudar (configuração de rede do Windows, feita uma única vez na instalação)
- Implementar **script de inicialização automática** do servidor Node.js quando o Windows ligar (via PM2 ou Task Scheduler)

---

## Funcionalidades Adicionais Identificadas

1. **Importação de planilha:** botão na tela de soldados para importar CSV/Excel com os dados da turma do ano
2. **Modelo de planilha para download:** arquivo Excel padrão disponível no sistema para o sargento preencher e importar
3. **Bloqueio de períodos sem guarda:** comandante define datas de recesso/feriado onde nenhuma escala é gerada
4. **Interface autoexplicativa:** sistema usado periodicamente por pessoas sem treinamento contínuo → tooltips, textos de ajuda inline, fluxos de no máximo 3 cliques para ações principais
5. **Script de instalação:** documentar passo a passo de como instalar e configurar o sistema no Windows do TG, incluindo configuração de IP fixo e inicialização automática

---

**Gerado para uso com Claude Code — TCC Sistema Tiro de Guerra**
