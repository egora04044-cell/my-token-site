// Run with: node scripts/remove-bg.js
// Removes background by flood-fill from corners (preserves letters)
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const sharp = require('sharp');
    const inputPath = path.join(__dirname, '../public/viral-logo.png');
    const { data, info } = await sharp(inputPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const { width, height, channels } = info;
    const getIdx = (x, y) => (y * width + x) * channels;
    
    // Flood fill from corners - mark background pixels (white/very light)
    const threshold = 250; // Consider white if R,G,B all >= threshold
    const isBackground = (i) => {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      return r >= threshold && g >= threshold && b >= threshold;
    };
    
    const visited = new Uint8Array(width * height);
    const stack = [];
    
    // Start from corners and edges
    for (let y = 0; y < height; y++) {
      stack.push([0, y]);
      stack.push([width - 1, y]);
    }
    for (let x = 0; x < width; x++) {
      stack.push([x, 0]);
      stack.push([x, height - 1]);
    }
    
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const idx = getIdx(x, y);
      const pixelIdx = (y * width + x);
      if (visited[pixelIdx]) continue;
      if (!isBackground(idx)) continue;
      
      visited[pixelIdx] = 1;
      
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }
    
    // Make all background pixels transparent
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIdx = y * width + x;
        if (visited[pixelIdx]) {
          const idx = pixelIdx * channels;
          data[idx + 3] = 0;
        }
      }
    }
    
    const outputPath = path.join(__dirname, '../public/viral-logo-new.png');
    await sharp(data, { raw: { width, height, channels } })
      .png()
      .toFile(outputPath);
    
    fs.renameSync(outputPath, inputPath);
    console.log('Background removed');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
main();
