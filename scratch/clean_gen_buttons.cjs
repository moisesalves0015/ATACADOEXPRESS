const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

const inputDir = 'C:\\Users\\utente\\.gemini\\antigravity\\brain\\a504d106-4735-4e0a-a964-c64746e8c4f2\\';
const outputDir = 'public/assets/buttons/';

const files = [
  'premium_button_01_pink_glow_1778642985049.png',
  'premium_button_02_white_glass_1778643008160.png',
  'premium_button_03_black_luxury_1778643036493.png',
  'premium_button_04_gold_champagne_1778643060188.png',
  'premium_button_05_vibrant_pink_circle_icon_1778643086352.png',
  'premium_button_06_gold_outline_1778643118660.png',
  'premium_button_07_pink_double_chevron_1778643238966.png',
  'premium_button_08_black_double_chevron_1778643263090.png',
  'premium_button_09_white_double_chevron_1778643291518.png',
  'premium_button_10_gold_double_chevron_1778643314622.png'
];

async function processButtons() {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const inputPath = path.join(inputDir, fileName);
    const outputPath = path.join(outputDir, `btn_gen_${String(i + 1).padStart(2, '0')}.png`);

    try {
      console.log(`Limpando: ${fileName}`);
      const image = await Jimp.read(inputPath);
      
      // Make white background transparent
      image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
        const r = this.bitmap.data[idx + 0];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];
        
        // Remove white/light grey
        if (r > 240 && g > 240 && b > 240) {
          this.bitmap.data[idx + 3] = 0;
        }
      });

      image.autocrop({ leaveBorder: 10 });
      await image.write(outputPath);
      console.log(`Salvo: ${outputPath}`);
    } catch (err) {
      console.error(`Erro em ${fileName}:`, err);
    }
  }
}

processButtons().then(() => console.log('Processamento concluído!'));
