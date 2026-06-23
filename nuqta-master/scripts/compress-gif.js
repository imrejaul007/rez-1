const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputPath = path.resolve(__dirname, '../../gif color edit.gif');
const outputPath = path.resolve(__dirname, '../assets/images/pay-in-store-icon-compressed.gif');

async function compressGif() {
  try {
    // Get input file info
    const inputStats = fs.statSync(inputPath);
    console.log(`Input file size: ${(inputStats.size / 1024 / 1024).toFixed(2)} MB`);

    // Get metadata of the input GIF
    const metadata = await sharp(inputPath, { animated: true }).metadata();
    console.log(`Original dimensions: ${metadata.width}x${metadata.height}`);
    console.log(`Pages/Frames: ${metadata.pages || 1}`);

    // Target size for icon - displayed at 32x32, use 100x100 for quality
    const targetSize = 100;
    console.log(`Target size: ${targetSize}x${targetSize} per frame`);

    // Process animated GIF with proper page height
    const frameCount = metadata.pages || 1;
    const pageHeight = Math.round(metadata.height / frameCount);

    await sharp(inputPath, { animated: true, pages: -1 })
      .resize(targetSize, targetSize * frameCount, {
        fit: 'fill'
      })
      .gif({
        colours: 128,
        loop: 0
      })
      .toFile(outputPath);

    // Get output file info
    const outputStats = fs.statSync(outputPath);
    console.log(`Output file size: ${(outputStats.size / 1024).toFixed(2)} KB`);
    console.log(`Compression ratio: ${((1 - outputStats.size / inputStats.size) * 100).toFixed(2)}%`);
    console.log(`\nGIF compressed successfully!`);
    console.log(`Saved to: ${outputPath}`);

  } catch (error) {
    console.error('Error compressing GIF:', error.message);
    process.exit(1);
  }
}

compressGif();
