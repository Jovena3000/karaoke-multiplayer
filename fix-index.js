#!/usr/bin/env node
// fix-index.js
// Execute: node fix-index.js
// Substitui todas as referências de checkout.html por checkout-bricks.html no index.html

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');

if (!fs.existsSync(filePath)) {
    console.error('❌ index.html não encontrado na pasta atual.');
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');
const original = content;

// Substitui todas as ocorrências de checkout.html por checkout-bricks.html
content = content.replace(/checkout\.html/g, 'checkout-bricks.html');

if (content === original) {
    console.log('⚠️  Nenhuma referência a checkout.html encontrada.');
} else {
    // Cria backup
    fs.writeFileSync(filePath + '.backup', original, 'utf8');
    fs.writeFileSync(filePath, content, 'utf8');

    const count = (original.match(/checkout\.html/g) || []).length;
    console.log(`✅ ${count} referência(s) substituída(s) com sucesso!`);
    console.log(`📦 Backup salvo em: index.html.backup`);
}
