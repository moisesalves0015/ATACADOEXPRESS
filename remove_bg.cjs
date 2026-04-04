const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const directoryPath = 'public/assets/categories/';

async function removeBackground() {
  const files = fs.readdirSync(directoryPath).filter(file => file.endsWith('.png'));

  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    console.log(`Processando: ${filePath}`);

    try {
      const image = await Jimp.read(filePath);
      const width = image.bitmap.width;
      const height = image.bitmap.height;

      // Scan and make white transparent
      image.scan(0, 0, width, height, function(x, y, idx) {
        const r = this.bitmap.data[idx + 0];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];
        const a = this.bitmap.data[idx + 3];

        // Se for quase branco, deixa transparente
        // Como são renders, as bordas podem ter cinzas muito claros
        if (r > 245 && g > 245 && b > 245) {
          this.bitmap.data[idx + 3] = 0;
        }
      });

      // Cortar espaços vazios
      image.autocrop();

      await image.writeAsync(filePath);
      console.log(`Sucesso: ${file}`);
    } catch (err) {
      console.error(`Erro ao processar ${file}:`, err);
    }
  }
}

removeBackground().then(() => console.log('Finalizado!'));
