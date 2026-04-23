// ================= CONFIGURAÇÃO DA API =================
const API_URL = 'https://karaoke-api-backend3.vercel.app/api';

// Planos disponíveis (com preços corretos)
const PLANS = {
    mensal: { name: 'Plano Mensal', price: 5.00, originalPrice: 5.00, period: '1 mês' },
    trimestral: { name: 'Plano Trimestral', price: 49.90, originalPrice: 74.70, period: '3 meses' },
    semestral: { name: 'Plano Semestral', price: 89.90, originalPrice: 149.40, period: '6 meses' },
    anual: { name: 'Plano Anual', price: 159.90, originalPrice: 298.80, period: '12 meses' }
};

// Chave Pública do Mercado Pago
const MP_PUBLIC_KEY = 'APP_USR-63ba9966-8d21-4c54-ba75-ac07077ee125';

// ================= VARIÁVEIS GLOBAIS =================
let mp = null;
let bricksBuilder = null;
let cardBrickController = null;
let selectedPlan = 'trimestral';
let currentPaymentMethod = 'card';
let brickLoading = false;

// ================= INICIALIZAR MERCADO PAGO =================
function initMercadoPago() {
    if (typeof MercadoPago !== 'undefined') {
        mp = new MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
        bricksBuilder = mp.bricks();
        console.log('✅ MP SDK + Bricks prontos');
        return true;
    }
    return false;
}

// ================= DESTRUIR BRICK =================
async function destroyCardBrick() {
    if (cardBrickController) {
        try { 
            await cardBrickController.unmount(); 
        } catch(e) {}
        cardBrickController = null;
    }
    const container = document.getElementById('cardPaymentBrick_container');
    if (container) container.innerHTML = '';
}

// ================= RECRIAR BRICK =================
async function recreateCardBrick() {
    if (brickLoading) return;
    brickLoading = true;

    await destroyCardBrick();

    if (!mp || !bricksBuilder) {
        brickLoading = false;
        console.warn('⏳ SDK ainda carregando, aguardando...');
        setTimeout(recreateCardBrick, 500);
        return;
    }

    const email = document.getElementById('email')?.value?.trim() || '';
    const plan = PLANS[selectedPlan];

    try {
        cardBrickController = await bricksBuilder.create(
            'cardPayment',
            'cardPaymentBrick_container',
            {
                initialization: {
                    amount: plan.price,
                    payer: email ? { email } : undefined
                },
                customization: {
                    visual: {
                        style: {
                            theme: 'default',
                            customVariables: {
                                baseColor: '#6366f1',
                                baseColorFirstVariant: '#4f46e5',
                                baseColorSecondVariant: '#4338ca',
                                errorColor: '#ef4444',
                                successColor: '#22c55e',
                                fontSizeSmall: '13px',
                                fontSizeMedium: '15px',
                                borderRadiusMedium: '8px',
                            }
                        },
                        hideFormTitle: true,
                        hidePaymentButton: false,
                    },
                    paymentMethods: {
                        types: { excluded: ['debit_card'] }
                    }
                },
                callbacks: {
                    onReady: () => {
                        brickLoading = false;
                        console.log('✅ Card Brick pronto');
                    },
                    onSubmit: async (cardFormData) => {
                        await processCardBrickPayment(cardFormData);
                    },
                    onError: (error) => {
                        brickLoading = false;
                        console.error('❌ Brick error:', error);
                        showAlert('Erro no formulário do cartão: ' + (error.message || error.type), 'error');
                    }
                }
            }
        );
    } catch(err) {
        brickLoading = false;
        console.error('❌ Erro ao criar Card Brick:', err);
        showAlert('Não foi possível carregar o formulário de cartão.', 'error');
    }
}

// ================= PROCESSAR PAGAMENTO CARTÃO =================
async function processCardBrickPayment(cardFormData) {
    const email = document.getElementById('email')?.value?.trim();

    if (!email || !email.includes('@')) {
        showAlert('Digite um e-mail válido antes de pagar.', 'error');
        return;
    }

    showModal('Processando pagamento...', 'Autorizando transação', 'loading');

    try {
        console.log('📦 cardFormData do Brick:', cardFormData);

        const response = await fetch(`${API_URL}/criar-pagamento`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                metodo: 'card',
                token: cardFormData.token,
                payment_method_id: cardFormData.payment_method_id,
                installments: cardFormData.installments,
                issuer_id: cardFormData.issuer_id,
                cpf: cardFormData.payer?.identification?.number || '',
                email: email,
                plan: selectedPlan
            })
        });

        const data = await response.json();
        console.log('📦 Resposta backend:', data);

        if (data.sucesso === true) {
            localStorage.setItem('pagamento_aprovado', JSON.stringify({ email, plan: selectedPlan }));
            showModal('✅ Pagamento Confirmado!', 'Seu pagamento foi aprovado. Redirecionando...', 'success');
            setTimeout(() => { 
                window.location.href = '/sucesso.html';
            }, 2000);
        } else {
            throw new Error(data.erro || data.mensagem || 'Pagamento recusado');
        }

    } catch(err) {
        console.error('❌ Erro:', err);
        showModal('❌ Falha no Pagamento', err.message, 'error');
    }
}

// ================= PROCESSAR PAGAMENTO PIX =================
async function processPixPayment() {
    const email = document.getElementById('email')?.value?.trim();
    const plan = PLANS[selectedPlan];
    
    if (!email || !email.includes('@')) { 
        showAlert('Digite um e-mail válido.', 'error'); 
        return false; 
    }

    showModal('Gerando PIX...', 'Criando QR Code para pagamento', 'loading');

    try {
        const response = await fetch(`${API_URL}/criar-pagamento`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                metodo: 'pix', 
                email, 
                plan: selectedPlan 
            })
        });

        const data = await response.json();

        if (data.sucesso) {
            const qrHtml = `
                <div class="text-center mt-4">
                    <div class="bg-white p-4 rounded-2xl inline-block">
                        <img src="data:image/jpeg;base64,${data.qr_code_base64 || ''}" class="w-48 h-48 mx-auto">
                    </div>
                    <p class="text-xs text-gray-500 mt-3 break-all bg-gray-50 p-3 rounded-lg">${data.qr_code || ''}</p>
                    <button onclick="copyPixCode('${data.qr_code}')" class="mt-3 bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600">
                        📋 Copiar código PIX
                    </button>
                    <p class="text-xs text-gray-400 mt-3">⏱️ QR Code válido por 30 minutos</p>
                </div>`;
            
            showModal('Pagamento via PIX', 'Escaneie o QR Code com o app do seu banco', 'pix', qrHtml);
            
            // Salva os dados do PIX
            window.pixDataAtual = data;
            
            // Monitora o status do pagamento
            startPixStatusCheck(data.id, email);
            return true;
        } else {
            throw new Error(data.erro || 'Erro ao gerar PIX');
        }
    } catch(err) {
        showModal('❌ Erro', err.message, 'error');
        return false;
    }
}

// ================= VERIFICAR STATUS PIX =================
let statusCheckInterval = null;

function startPixStatusCheck(paymentId, email) {
    if (statusCheckInterval) clearInterval(statusCheckInterval);
    
    statusCheckInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_URL}/verificar-pagamento?id=${paymentId}`);
            const data = await response.json();
            
            if (data.status === 'approved') {
                clearInterval(statusCheckInterval);
                localStorage.setItem('pagamento_aprovado', JSON.stringify({ email, plan: selectedPlan }));
                showModal('✅ Pagamento Confirmado!', 'PIX confirmado! Redirecionando...', 'success');
                setTimeout(() => { 
                    window.location.href = '/sucesso.html';
                }, 2000);
            }
        } catch(e) { 
            console.error('Erro ao verificar PIX:', e); 
        }
    }, 5000);
}

// ================= FUNÇÕES DE UTILIDADE =================
function showAlert(msg, type) {
    const alertDiv = document.getElementById('customAlert');
    if (!alertDiv) return;
    
    alertDiv.innerHTML = `
        <div class="fixed bottom-4 right-4 z-50 animate-fade-in-up">
            <div class="px-4 py-3 rounded-xl shadow-lg flex items-center gap-2
                ${type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}">
                ${type === 'error' ? '❌' : '✅'} ${msg}
            </div>
        </div>`;
    
    setTimeout(() => { alertDiv.innerHTML = ''; }, 5000);
}

function showModal(title, message, type = 'loading', extraHtml = '') {
    const modal = document.getElementById('paymentModal');
    const iconEl = document.getElementById('modalIcon');
    const titleEl = document.getElementById('modalTitle');
    const messageEl = document.getElementById('modalMessage');
    const progressEl = document.getElementById('modalProgress');
    const extraEl = document.getElementById('modalExtra');
    const closeBtn = document.getElementById('modalCloseBtn');

    if (!modal) return;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    if (closeBtn) closeBtn.style.display = 'none';

    if (type === 'loading') {
        iconEl.innerHTML = '<i class="fas fa-spinner fa-pulse text-4xl text-indigo-500"></i>';
        progressEl.classList.remove('hidden');
        let progress = 0;
        const iv = setInterval(() => {
            progress += 10;
            const bar = document.getElementById('progressBar');
            if (bar) bar.style.width = progress + '%';
            if (progress >= 90) clearInterval(iv);
        }, 200);
    } else if (type === 'success') {
        iconEl.innerHTML = '<i class="fas fa-check-circle text-5xl text-green-500"></i>';
        progressEl.classList.add('hidden');
        if (closeBtn) closeBtn.style.display = 'block';
    } else if (type === 'error') {
        iconEl.innerHTML = '<i class="fas fa-times-circle text-5xl text-red-500"></i>';
        progressEl.classList.add('hidden');
        if (closeBtn) closeBtn.style.display = 'block';
    } else if (type === 'pix') {
        iconEl.innerHTML = '<img src="https://img.icons8.com/color/48/pix.png" class="w-16 h-16">';
        progressEl.classList.add('hidden');
        if (closeBtn) closeBtn.style.display = 'block';
    }

    titleEl.textContent = title;
    messageEl.textContent = message;
    if (extraHtml) extraEl.innerHTML = extraHtml;
}

function hideModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = 'auto';
    }
}

window.copyPixCode = function(qrCode) {
    if (qrCode) {
        navigator.clipboard.writeText(qrCode);
        showAlert('Código PIX copiado!', 'success');
    }
};

// ================= FUNÇÕES DE AUTENTICAÇÃO =================
async function fazerLogin(email, senha) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (data.sucesso) {
            localStorage.setItem('token', data.token);
            if (data.usuario) {
                localStorage.setItem('usuario', JSON.stringify(data.usuario));
            }
            window.location.href = '/karaoke.html';
        } else {
            alert('Erro: ' + (data.erro || 'Credenciais inválidas'));
        }
    } catch (error) {
        console.error('Erro no login:', error);
        alert('Erro ao conectar com o servidor');
    }
}

async function registrarUsuario(email, senha, nome, plano) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha, nome, plano })
        });

        const data = await response.json();

        if (data.sucesso) {
            alert('✅ Cadastro realizado com sucesso! Faça o login.');
            window.location.href = '/login.html';
        } else {
            alert('❌ Erro: ' + (data.erro || 'Não foi possível cadastrar'));
        }
    } catch (error) {
        console.error('Erro no registro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

function isLogado() {
    return localStorage.getItem('token') !== null;
}

function fazerLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/login.html';
}

function getToken() {
    return localStorage.getItem('token');
}

// ================= EXPORTAR FUNÇÕES =================
// Para uso no navegador (disponível globalmente)
window.PLANS = PLANS;
window.fazerLogin = fazerLogin;
window.registrarUsuario = registrarUsuario;
window.isLogado = isLogado;
window.fazerLogout = fazerLogout;
window.getToken = getToken;
window.processPixPayment = processPixPayment;
window.recreateCardBrick = recreateCardBrick;
window.hideModal = hideModal;

// Inicializar ao carregar
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (initMercadoPago()) {
            setTimeout(() => recreateCardBrick(), 500);
        }
    });
}

// ================= EXPORT (se usar módulos) =================
// module.exports = { 
//     fazerLogin, registrarUsuario, isLogado, fazerLogout, getToken, 
//     processPixPayment, recreateCardBrick, PLANS, PLANS 
// };
