const fs = require('fs');
const path = require('path');

const fontPath = process.argv[2];
if (!fontPath) {
  console.error('Usage: node convertFont.js <path-to-ttf-file>');
  console.error('Example: node convertFont.js C:\\Downloads\\Amiri-Regular.ttf');
  process.exit(1);
}

try {
  const fontBuffer = fs.readFileSync(fontPath);
  const base64 = fontBuffer.toString('base64');
  const fontName = path.basename(fontPath, '.ttf').replace(/-/g, '');

  const tsContent = `// Auto-generated: ${new Date().toISOString()}
export const ${fontName}Base64 = '${base64}';
`;

  const outputPath = `./src/fonts/${fontName}.ts`;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, tsContent, 'utf8');

  console.log(`✅ Font converted successfully!`);
  console.log(`📁 Output: ${outputPath}`);
  console.log(`📝 Font name: ${fontName}`);
  console.log(`📏 Base64 length: ${base64.length} characters`);
} catch (error) {
  console.error('❌ Error converting font:', error.message);
  process.exit(1);
}
