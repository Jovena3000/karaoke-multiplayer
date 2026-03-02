// Configuração da API
const CONFIG = {
    // URL da API (local para testes)
    API_URL: 'http://localhost:3000/api',
    
    // Quando fizer deploy, mude para:
    // API_URL: 'https://seu-backend.vercel.app/api',
    
    // Planos disponíveis
    PLANS: {
        mensal: { name: 'Plano Mensal', price: 19.90 },
        trimestral: { name: 'Plano Trimestral', price: 49.90 },
        semestral: { name: 'Plano Semestral', price: 89.90 },
        anual: { name: 'Plano Anual', price: 159.90 }
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
            body: JSON.stringify({ plan, email })
        });

        const data = await response.json();

        if (data.sucesso) {
            // Redireciona para o Mercado Pago
            window.location.href = data.init_point;
        } else {
            alert('Erro: ' + data.erro);
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
            alert('Erro: ' + data.erro);
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

// Função para registrar
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
            alert('Cadastro realizado! Faça o login.');
            window.location.href = '/login.html';
        } else {
            alert('Erro: ' + data.erro);
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}
