const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE_IMAGES = [
  {
    input: 'c:/Users/Mukul raj/OneDrive/Desktop/rez/Hailuo_Image_1 Cafes    A cozy modern cafe_456199682720030727.png',
    output: 'cafes.png'
  },
  {
    input: 'c:/Users/Mukul raj/OneDrive/Desktop/rez/Hailuo_Image_2 Family Restaurants    A war_456199841797402630.png',
    output: 'family-restaurants.png'
  },
  {
    input: 'c:/Users/Mukul raj/OneDrive/Desktop/rez/Hailuo_Image_3 Fine Dining    An elegant f_456200175865380873.png',
    output: 'fine-dining.png'
  },
  {
    input: 'c:/Users/Mukul raj/OneDrive/Desktop/rez/Hailuo_Image_4 QSR_Fast Food    A vibrant _456200234430435337.png',
    output: 'qsr-fast-food.png'
  }
];

const OUTPUT_DIR = path.join(__dirname, '../assets/images/going-out-categories');

async function compressImages() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Starting image compression...\n');

  for (const image of SOURCE_IMAGES) {
    try {
      const outputPath = path.join(OUTPUT_DIR, image.output);

      await sharp(image.input)
        .resize(256, 256, {
          fit: 'cover',
          position: 'center'
        })
        .png({
          quality: 85,
          compressionLevel: 9
        })
        .toFile(outputPath);

      // Get file sizes
      const inputStats = fs.statSync(image.input);
      const outputStats = fs.statSync(outputPath);

      console.log(`✓ ${image.output}`);
      console.log(`  Original: ${(inputStats.size / 1024).toFixed(1)} KB`);
      console.log(`  Compressed: ${(outputStats.size / 1024).toFixed(1)} KB`);
      console.log(`  Reduction: ${((1 - outputStats.size / inputStats.size) * 100).toFixed(1)}%\n`);
    } catch (error) {
      console.error(`✗ Error processing ${image.output}:`, error.message);
    }
  }

  console.log('Done! Images saved to:', OUTPUT_DIR);
}

compressImages();
