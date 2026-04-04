const { removeBackground } = require('@imgly/background-removal-node');
const fs = require('fs');
const path = require('path');

const directoryPath = 'public/assets/categories/';

async function cleanIcons() {
  const files = fs.readdirSync(directoryPath).filter(file => file.endsWith('.png'));

  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    process.stdout.write(`[\u231b] Limpando fundo de: ${file}... `);

    try {
      // removeBackground returns a Blob/Buffer in Node.js version
      const result = await removeBackground(filePath);
      const buffer = Buffer.from(await result.arrayBuffer());
      
      fs.writeFileSync(filePath, buffer);
      process.stdout.write(`[\u2705] OK\n`);
    } catch (err) {
      process.stdout.write(`[\u274c] ERRO\n`);
      console.error(`Erro ao processar ${file}:`, err);
    }
  }
}

console.log('--- Iniciando limpeza profunda de fundos via IA ---');
cleanIcons().then(() => console.log('\n--- Finalizado com sucesso! ---'));
