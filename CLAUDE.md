Bug: ao fazer login, o sistema redireciona corretamente mas 
volta imediatamente para a tela de login.

Investigar e corrigir as seguintes causas possíveis:

1. Token JWT não está sendo salvo corretamente após o login
   - Verificar se o POST /api/auth/login está retornando o token
   - Verificar se o frontend está salvando o token 
     (localStorage ou cookie) após receber a resposta

2. AuthContext não está lendo o token salvo ao inicializar
   - Verificar se o useEffect do AuthContext lê o token 
     do localStorage ao carregar a página
   - Verificar se o estado 'user' está sendo populado corretamente

3. ProtectedRoute redirecionando antes do AuthContext terminar de carregar
   - Verificar se existe um estado 'loading' no AuthContext
   - O ProtectedRoute deve aguardar loading = false antes 
     de redirecionar para /login

4. CORS bloqueando a resposta do backend
   - Verificar se o CORS está configurado corretamente 
     no backend para http://localhost:5173
   - Verificar se o .env tem FRONTEND_URL=http://localhost:5173

Adicionar um console.log temporário no login para depurar:
- No backend: logar se o token está sendo gerado
- No frontend: logar o que está sendo recebido na resposta do login