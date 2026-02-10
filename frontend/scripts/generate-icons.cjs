/**
 * Generate PWA icons from the favicon SVG.
 * Run: node scripts/generate-icons.js
 * Requires: npm install sharp (dev dependency)
 */
const fs = require('fs');
const path = require('path');

// We'll create simple PNG icons programmatically using raw pixel data
// Since we can't rely on sharp being installed, we'll use a minimal PNG encoder

// Minimal PNG creation (uncompressed)
function createPNG(width, height, rgbaData) {
  const zlib = require('zlib');
  
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  
  // Raw image data with filter bytes
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0; // No filter
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * (1 + width * 4) + 1 + x * 4;
      rawData[dstIdx] = rgbaData[srcIdx];     // R
      rawData[dstIdx + 1] = rgbaData[srcIdx + 1]; // G
      rawData[dstIdx + 2] = rgbaData[srcIdx + 2]; // B
      rawData[dstIdx + 3] = rgbaData[srcIdx + 3]; // A
    }
  }
  
  const compressed = zlib.deflateSync(rawData);
  
  function makeChunk(type, data) {
    const typeBuffer = Buffer.from(type);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData), 0);
    return Buffer.concat([length, typeBuffer, data, crc]);
  }
  
  // CRC32
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Draw the app icon
function drawIcon(size) {
  const data = Buffer.alloc(size * size * 4);
  
  const scale = size / 32;
  
  function setPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (y * size + x) * 4;
    // Alpha blending
    const srcA = a / 255;
    const dstA = data[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA > 0) {
      data[idx] = Math.round((r * srcA + data[idx] * dstA * (1 - srcA)) / outA);
      data[idx + 1] = Math.round((g * srcA + data[idx + 1] * dstA * (1 - srcA)) / outA);
      data[idx + 2] = Math.round((b * srcA + data[idx + 2] * dstA * (1 - srcA)) / outA);
      data[idx + 3] = Math.round(outA * 255);
    }
  }
  
  function fillCircle(cx, cy, r, red, green, blue, alpha) {
    cx *= scale; cy *= scale; r *= scale;
    const r2 = r * r;
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist2 = dx * dx + dy * dy;
        if (dist2 <= r2) {
          // Anti-aliasing at edges
          const edgeDist = r - Math.sqrt(dist2);
          const a = Math.min(1, Math.max(0, edgeDist)) * (alpha / 255);
          setPixel(Math.round(x), Math.round(y), red, green, blue, Math.round(a * 255));
        }
      }
    }
  }
  
  function fillRoundedRect(x, y, w, h, radius, red, green, blue, alpha) {
    x *= scale; y *= scale; w *= scale; h *= scale; radius *= scale;
    for (let py = Math.floor(y); py < Math.ceil(y + h); py++) {
      for (let px = Math.floor(x); px < Math.ceil(x + w); px++) {
        let inside = false;
        const lx = px - x;
        const ly = py - y;
        
        // Check if inside rounded rect
        if (lx >= radius && lx <= w - radius) inside = true;
        else if (ly >= radius && ly <= h - radius) inside = true;
        else {
          // Check corner circles
          const corners = [
            [radius, radius],
            [w - radius, radius],
            [radius, h - radius],
            [w - radius, h - radius]
          ];
          for (const [cx, cy] of corners) {
            const dx = lx - cx;
            const dy = ly - cy;
            if (dx * dx + dy * dy <= radius * radius) {
              inside = true;
              break;
            }
          }
        }
        
        if (inside) {
          setPixel(Math.round(px), Math.round(py), red, green, blue, alpha);
        }
      }
    }
  }
  
  // Background: indigo rounded rect (#4F46E5)
  fillRoundedRect(2, 2, 28, 28, 6, 79, 70, 229, 255);
  
  // Person head (white circle)
  fillCircle(13, 10, 4, 255, 255, 255, 255);
  
  // Person body (white arc approximation)
  for (let y = Math.floor(16 * scale); y <= Math.ceil(22 * scale); y++) {
    for (let x = Math.floor(6 * scale); x <= Math.ceil(20 * scale); x++) {
      const cx = 13 * scale;
      const cy = 28 * scale; // center of the arc below
      const rx = 7 * scale;
      const ry = 12 * scale;
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        setPixel(Math.round(x), Math.round(y), 255, 255, 255, 255);
      }
    }
  }
  
  // Green circle badge (#10B981)
  fillCircle(23, 22, 7, 16, 185, 129, 255);
  
  // White checkmark on green badge (simplified)
  const checkPoints = [
    [19.5, 22], [22, 24.5], [26, 20.5]
  ];
  // Draw thick check line
  for (let t = 0; t <= 1; t += 0.002) {
    let px, py;
    if (t <= 0.5) {
      const tt = t * 2;
      px = checkPoints[0][0] + (checkPoints[1][0] - checkPoints[0][0]) * tt;
      py = checkPoints[0][1] + (checkPoints[1][1] - checkPoints[0][1]) * tt;
    } else {
      const tt = (t - 0.5) * 2;
      px = checkPoints[1][0] + (checkPoints[2][0] - checkPoints[1][0]) * tt;
      py = checkPoints[1][1] + (checkPoints[2][1] - checkPoints[1][1]) * tt;
    }
    px *= scale; py *= scale;
    const thickness = 1.2 * scale;
    for (let dy = -thickness; dy <= thickness; dy += 0.5) {
      for (let dx = -thickness; dx <= thickness; dx += 0.5) {
        if (dx * dx + dy * dy <= thickness * thickness) {
          setPixel(Math.round(px + dx), Math.round(py + dy), 255, 255, 255, 255);
        }
      }
    }
  }
  
  return data;
}

// Generate icons
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

for (const size of [192, 512]) {
  console.log(`Generating ${size}x${size} icon...`);
  const pixels = drawIcon(size);
  const png = createPNG(size, size, pixels);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), png);
  console.log(`  Saved icons/icon-${size}.png`);
}

console.log('Done!');
