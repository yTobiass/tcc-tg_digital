# Guia de Instalação
## Passo a passo definitivo — testado e validado

## PASSO 1 — Instalar o Node.js v20

Acessar e instalar:
**https://nodejs.org/dist/v20.19.2/node-v20.19.2-x64.msi**
**IMPORTANTE:** na opção **"Add to PATH"**, garantir que está marcada
como **"Entire feature will be installed on local hard drive"**
**Reiniciar o computador**

## PASSO 2 — Copiar o projeto para o computador

1. Copiar a pasta `tcc-tg_digital-main` (pen drive ou download) para o computador
2. Anotar o caminho onde ela ficou. Exemplo:
   `C:\Users\TG\Desktop\tcc-tg_digital-main`

---

## PASSO 3 — Abrir o PowerShell na pasta do projeto

```powershell
Exemplo:
cd C:\Users\TG\Desktop\tcc-tg_digital-main
```
---

## PASSO 4 — Instalar as dependências

### Backend
```powershell
cd backend
npm install
```

### Frontend
```powershell
cd ..\frontend
npm install
```

---

## PASSO 5 — ⚠️ Criar o arquivo .env (PASSO MAIS IMPORTANTE)

```powershell
cd ..\backend

@"
PORT=3001
FRONTEND_URL=http://localhost:5173
JWT_SECRET=chave_secreta_tg_02032_rio_claro_2026
JWT_EXPIRES_IN=8h
"@ | Out-File -FilePath .env -Encoding utf8
```

> ATENÇÃO: a linha FRONTEND_URL não pode ter barra `/` no final!

---

## PASSO 6 — Criar o banco de dados

```powershell
npm run migrate
```

---

## PASSO 7 — Subir o sistema

```powershell
cd ..
npm run dev
```

Deve aparecer:
```
[backend] Servidor rodando em http://localhost:3001/
[frontend] Local: http://localhost:5173/
```

---

## PASSO 8 — Acessar o sistema

Abrir o navegador e digitar:
```
http://localhost:5173
```

Fazer login com o usuário comandante (ver login/senha no passo de verificação abaixo).

---

## VERIFICAR LOGIN DO COMANDANTE

Se não souber o login/senha do comandante, rodar:
```powershell
cd backend
cat src\database\migrations\20240010_seed_inicial.js
```
Isso mostra o usuário e senha iniciais criados no banco.
---

## ACESSO POR OUTROS DISPOSITIVOS (celular, outros PCs)

### 1. Descobrir o IP do computador
```powershell
ipconfig
```
Procurar **"Endereço IPv4"** — exemplo: `192.168.0.118`

### 2. Liberar a porta no Firewall do Windows
```powershell
netsh advfirewall firewall add rule name="TG Sistema" dir=in action=allow protocol=TCP localport=5173
netsh advfirewall firewall add rule name="TG Backend" dir=in action=allow protocol=TCP localport=3001
```

### 3. Acessar de outro dispositivo (mesma rede Wi-Fi)
```
http://192.168.0.118:5173
```
> Substituir pelo IP real encontrado

---

## PROBLEMAS COMUNS E SOLUÇÕES

**"npm não é reconhecido"**
→ Node instalado sem "Add to PATH". Reinstalar marcando a opção.

**"secretOrPrivateKey must have a value" ao logar**
→ Falta o arquivo .env no backend. Refazer o PASSO 5.

**Erro de Python / better-sqlite3 no npm install**
→ Node muito novo (v22+). Garantir que é o v20.

**Login redireciona de volta para tela de login**
→ Verificar se o backend está rodando (mensagem "Servidor rodando").

**"Deseja finalizar o arquivo em lotes (S/N)?" trava o terminal**
→ Responder N. Ou rodar backend e frontend em PowerShells separados.

**Porta já em uso**
→ Fechar o PowerShell antigo que ainda está rodando o servidor, ou reiniciar o PC.