#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔤 Font to Base64 Converter');
console.log('===========================\n');

const fontPath = process.argv[2];

if (!fontPath) {
  console.error('❌ Error: No font file specified');
  console.log('\nUsage:');
  console.log('  node convertFont.js <path-to-ttf-file>');
  console.log('\nExample:');
  console.log('  node convertFont.js fonts/Amiri-Regular.ttf');
  process.exit(1);
}

if (!fs.existsSync(fontPath)) {
  console.error(`❌ Error: File not found: ${fontPath}`);
  process.exit(1);
}

try {
  console.log(`📖 Reading: ${fontPath}`);
  const fontBuffer = fs.readFileSync(fontPath);
  const base64 = fontBuffer.toString('base64');
  
  const fontName = path.basename(fontPath, '.ttf').replace(/[-\s]/g, '');
  const outputName = `${fontName}Base64`;
  
  const tsContent = `/**
 * Auto-generated font file
 * Source: ${path.basename(fontPath)}
 * Generated: ${new Date().toISOString()}
 * Size: ${(base64.length / 1024).toFixed(2)} KB
 */

export const ${outputName} = '${base64}';
`;

  const outputDir = './src/fonts';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, `${fontName}.ts`);
  fs.writeFileSync(outputPath, tsContent);
  
  console.log(`✅ Success!`);
  console.log(`📁 Output: ${outputPath}`);
  console.log(`📦 Variable: ${outputName}`);
  console.log(`📊 Size: ${(base64.length / 1024).toFixed(2)} KB`);
  console.log(`\n💡 Import in your code:`);
  console.log(`   import { ${outputName} } from './fonts/${fontName}';`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
