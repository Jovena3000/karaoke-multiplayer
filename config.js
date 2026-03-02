// Configuração da API Karaokê
const CONFIG = {
    // Para testes locais (seu backend rodando no PC)
    API_URL: 'http://localhost:3000/api',
    
    // Para produção (quando fizer deploy na Vercel)
    // API_URL: 'https://karaoke-api-backend3.vercel.app/api',
    
    // Chave pública do Mercado Pago (obter no dashboard)
    MP_PUBLIC_KEY: 'TEST-be19ac09-9ef7-44b6-8f93-86ae1a72f028',
    
    // Planos disponíveis
    PLANS: {
        mensal: 19.90,
        trimestral: 49.90,
        semestral: 89.90,
        anual: 159.90
    }
};

// Função para criar pagamento
async function criarPagamento(plan, email) {
    try {
        const response = await fetch(`${CONFIG.API_URL}/criar-pagamento`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                plan: plan,
                email: email
            })
        });

        const data = await response.json();

        if (data.sucesso) {
            // Redireciona para o Mercado Pago
            window.location.href = data.init_point;
        } else {
            alert('Erro ao criar pagamento: ' + data.erro);
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

// Função para fazer login
async function fazerLogin(email, senha) {
    try {
        const response = await fetch(`${CONFIG.API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (data.sucesso) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
            window.location.href = '/karaoke.html';
        } else {
            alert('Erro no login: ' + data.erro);
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

// Função para registrar usuário
async function registrarUsuario(email, senha, nome, plano) {
    try {
        const response = await fetch(`${CONFIG.API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, senha, nome, plano })
        });

        const data = await response.json();

        if (data.sucesso) {
            alert('Usuário criado! Faça o login.');
            window.location.href = '/login.html';
        } else {
            alert('Erro no registro: ' + data.erro);
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

// ============================================
// CONFIGURAÇÃO DA API - KARAOKÊ MULTIPLAYER
// ============================================
const API_URL = 'https://karaoke-api-backend3.vercel.app';
