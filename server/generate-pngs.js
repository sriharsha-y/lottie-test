// Simple script to generate PNG files using pngjs
// Run: cd server && npm install pngjs && node generate-pngs.js

const fs = require('fs');
const path = require('path');

// Check if pngjs is available
let PNG;
try {
  PNG = require('pngjs').PNG;
} catch (e) {
  console.log('pngjs not found. Installing...');
  const { execSync } = require('child_process');
  execSync('npm install pngjs', { stdio: 'inherit' });
  PNG = require('pngjs').PNG;
}

const SIZE = 200;

function createPng(filename, drawFn) {
  const png = new PNG({ width: SIZE, height: SIZE });

  // Fill with white background
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = (SIZE * y + x) << 2;
      png.data[idx] = 255;     // R
      png.data[idx + 1] = 255; // G
      png.data[idx + 2] = 255; // B
      png.data[idx + 3] = 255; // A
    }
  }

  // Draw the shape
  drawFn(png);

  // Write file
  const filepath = path.join(__dirname, 'assets', filename);
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filepath, buffer);
  console.log(`Created: ${filepath}`);
}

// v1.png - Blue circle
createPng('v1.png', (png) => {
  const cx = 100, cy = 100, r = 80;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r * r) {
        const idx = (SIZE * y + x) << 2;
        png.data[idx] = 0x21;     // R (blue: #2196F3)
        png.data[idx + 1] = 0x96; // G
        png.data[idx + 2] = 0xF3; // B
        png.data[idx + 3] = 255;  // A
      }
    }
  }
});

// v2.png - Red square
createPng('v2.png', (png) => {
  const margin = 20;
  for (let y = margin; y < SIZE - margin; y++) {
    for (let x = margin; x < SIZE - margin; x++) {
      const idx = (SIZE * y + x) << 2;
      png.data[idx] = 0xF4;     // R (red: #F44336)
      png.data[idx + 1] = 0x43; // G
      png.data[idx + 2] = 0x36; // B
      png.data[idx + 3] = 255;  // A
    }
  }
});

console.log('PNG files generated successfully!');
