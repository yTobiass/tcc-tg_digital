# Guia de Instalação — Sistema Tiro de Guerra
## Windows PowerShell — Passo a Passo Completo

> **Estrutura do projeto:** as dependências ficam em duas pastas:
> `backend` (API, porta **3001**) e `frontend` (interface, porta **5173**).
> No navegador você acessa o **frontend** (5173); ele encaminha as chamadas
> `/api` para o backend (3001) automaticamente.

---

## PARTE 1 — Instalar o Node.js (fazer uma única vez)

1. Abrir o navegador e acessar: https://nodejs.org
2. Clicar no botão **"LTS"** (versão recomendada)
3. Baixar e instalar normalmente (next, next, finish)
4. Após instalar, abrir o **PowerShell** e verificar:

```powershell
node -v
npm -v
```

Se aparecer a versão dos dois, o Node.js está instalado corretamente.

---

## PARTE 2 — Configurar o projeto (fazer uma única vez)

### 1. Navegar até a pasta do projeto
```powershell
cd C:\caminho\para\tiro-de-guerra
```
> Substituir pelo caminho real onde o projeto está salvo.
> Exemplo: `cd C:\Users\SeuNome\Desktop\tcc`

### 2. Instalar todas as dependências (frontend + backend de uma vez)
```powershell
npm install
```
> Isso instala automaticamente as dependências do `frontend` e do `backend`
> graças ao script `postinstall` configurado no `package.json` da raiz.

### 3. Criar o banco de dados
```powershell
npm run migrate
```
> Roda as migrations do `backend` (cria o arquivo SQLite e as tabelas).

### 4. Fazer o build do frontend (opcional — só para produção)
```powershell
npm run build
```
> Para a apresentação no modo de desenvolvimento (PARTE 3) o build **não é
> necessário** — o Vite serve o frontend direto.

### 5. Instalar o PM2 (para subir o sistema automaticamente com o Windows)
```powershell
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
```

### 6. Iniciar o sistema (backend + frontend juntos)
```powershell
pm2 start npm --name tiro-de-guerra -- run dev
pm2 save
```
> O script `dev` da raiz sobe o **backend** (3001) e o **frontend** (5173)
> ao mesmo tempo. O `pm2 save` faz o sistema voltar sozinho quando o Windows liga.

### 7. Descobrir o IP da máquina
```powershell
ipconfig
```
> Procurar o valor de **"Endereço IPv4"** — ex: `192.168.1.100`
> Esse é o endereço que outros dispositivos usam para acessar o sistema.

---

## PARTE 3 — Usar no dia a dia

Após a configuração inicial, o sistema sobe **automaticamente** quando o Windows liga.

Para acessar, abrir qualquer navegador e digitar:
```
http://localhost:5173
```
Ou de outro dispositivo na mesma rede:
```
http://192.168.1.100:5173
```

---

## PARTE 4 — Comandos úteis do PM2

```powershell
# Ver se o sistema está rodando
pm2 status

# Parar o sistema
pm2 stop tiro-de-guerra

# Iniciar o sistema manualmente
pm2 start tiro-de-guerra

# Reiniciar o sistema
pm2 restart tiro-de-guerra

# Ver logs de erro
pm2 logs tiro-de-guerra
```

---

## PARTE 5 — Script npm install único na raiz

Para que um único `npm install` na raiz instale tudo, o `package.json` da raiz
(`tiro-de-guerra/package.json`) usa um script `postinstall`:

```json
{
  "name": "tiro-de-guerra",
  "version": "1.0.0",
  "description": "Sistema de Gestão do Tiro de Guerra 02-032",
  "private": true,
  "scripts": {
    "postinstall": "npm install --prefix backend && npm install --prefix frontend",
    "install:all": "npm install --prefix backend && npm install --prefix frontend",
    "dev": "concurrently --names \"backend,frontend\" --prefix-colors \"blue,green\" \"npm run dev --prefix backend\" \"npm run dev --prefix frontend\"",
    "build": "npm run build --prefix frontend",
    "migrate": "npm run migrate --prefix backend",
    "migrate:rollback": "npm run migrate:rollback --prefix backend"
  },
  "devDependencies": {
    "concurrently": "^9.2.1"
  }
}
```

Com esse `package.json` na raiz, ao rodar `npm install`, o `postinstall`
dispara automaticamente e instala as dependências do `frontend` e do `backend`
também.

---

## PARTE 6 — Passo a passo resumido para a apresentação

Copiar e colar em sequência no PowerShell:

```powershell
# 1. Entrar na pasta do projeto
cd C:\caminho\para\tiro-de-guerra

# 2. Instalar tudo (frontend + backend)
npm install

# 3. Criar o banco
npm run migrate

# 4. Iniciar backend + frontend
pm2 start npm --name tiro-de-guerra -- run dev
pm2 save

# 5. Verificar se está rodando
pm2 status

# 6. Abrir no navegador
start http://localhost:5173
```

> Sem PM2? Dá para subir tudo direto com `npm run dev` (deixe a janela do
> PowerShell aberta enquanto usa o sistema).

---

## POSSÍVEIS ERROS E SOLUÇÕES

**Erro: `node` não é reconhecido**
→ O Node.js não foi instalado corretamente. Reinstalar pelo site nodejs.org.

**Erro: `pm2` não é reconhecido**
→ Rodar: `npm install -g pm2`

**Erro nas migrations: `Cannot find module 'knex'`**
→ Rodar na raiz: `npm install` (reinstala as dependências do backend)

**Porta 5173 ou 3001 já em uso**
→ Rodar: `pm2 stop tiro-de-guerra` e depois `pm2 start tiro-de-guerra`
→ Ou alterar a porta do backend no arquivo `backend\.env` (`PORT=3001`)

**Outros dispositivos não conseguem acessar**
→ Verificar se estão na mesma rede Wi-Fi
→ Verificar o IP com `ipconfig` e usar o "Endereço IPv4"
→ Verificar se o Firewall do Windows está bloqueando a porta 5173:
```powershell
netsh advfirewall firewall add rule name="Tiro de Guerra" dir=in action=allow protocol=TCP localport=5173
```

---

## PARTE 7 — Configuração do `.env` (segurança)

Para desenvolvimento e apresentação está quase perfeito! Só mude uma coisa importante:

O **`JWT_SECRET`** — troque por uma chave aleatória e difícil. É a chave que
assina os tokens de login. Se ficar com o valor padrão, é uma brecha de segurança.
Gere uma chave segura rodando isso no PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Vai gerar algo como `a3f8c2e1b4d7...`. Cole esse valor no lugar de
`troque_esta_chave_antes_de_usar_em_producao`.

O restante do `backend\.env` está correto:

- `PORT=3001` → o servidor (API) roda na porta 3001
- `FRONTEND_URL=http://localhost:5173` → ok para desenvolvimento
- `JWT_EXPIRES_IN=8h` → token expira em 8 horas (bom para um dia de uso)

**Atenção:** quando for instalar no computador do TG, atualizar o `backend\.env` com:

```dotenv
PORT=3001
FRONTEND_URL=http://IP-DO-COMPUTADOR:5173
JWT_SECRET=sua_chave_gerada
JWT_EXPIRES_IN=8h
```

Substituindo `IP-DO-COMPUTADOR` pelo IP fixo da máquina do TG.

npx knex migrate:latest - cria um banco limpo, pronto para uso real.