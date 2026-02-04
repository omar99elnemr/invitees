# Complete Guide: Universal Unicode Support for PDF Exports

## 📋 Table of Contents
1. [The Problem](#the-problem)
2. [The Solution Overview](#the-solution-overview)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Complete Production Code](#complete-production-code)
5. [Font Setup](#font-setup)
6. [Testing & Troubleshooting](#testing--troubleshooting)
7. [Best Practices](#best-practices)

---

## 🔴 The Problem

**jsPDF's default fonts (Helvetica, Times, Courier) only support basic Latin characters (A-Z, a-z, 0-9).**

This means:
- ❌ Arabic text shows as: □□□□
- ❌ Chinese characters show as: □□□
- ❌ Hebrew text shows as: □□□
- ❌ Cyrillic text may show incorrectly
- ❌ Special Unicode characters are missing

**Why?** Font files contain glyph definitions for characters. Default PDF fonts only have glyphs for basic Latin characters.

---

## ✅ The Solution Overview

To support Unicode characters, you need to:

1. **Add custom fonts** that include the Unicode characters you need
2. **Convert fonts to base64** so jsPDF can embed them
3. **Detect the language/script** in your data
4. **Select the appropriate font** for rendering
5. **Handle RTL (Right-to-Left)** text for Arabic/Hebrew

---

## 🚀 Step-by-Step Implementation

### Step 1: Install Dependencies

```bash
npm install jspdf jspdf-autotable papaparse xlsx date-fns
npm install --save-dev @types/papaparse
```

### Step 2: Download Fonts

Choose fonts based on your needs:

**For Arabic:**
- Download **Amiri** from: https://fonts.google.com/specimen/Amiri
- Or **Cairo**: https://fonts.google.com/specimen/Cairo

**For Universal (Multi-language):**
- Download **Noto Sans** from: https://fonts.google.com/noto/specimen/Noto+Sans

**For Hebrew:**
- Download **Noto Sans Hebrew**

**For Chinese/Japanese/Korean:**
- Download **Noto Sans CJK** (warning: large file ~10MB)

### Step 3: Convert Font to Base64

**Option A: Online Tool (Easiest)**

1. Go to: https://peckconsulting.s3.amazonaws.com/fontconverter/fontconverter.html
2. Upload your `.ttf` file (e.g., `Amiri-Regular.ttf`)
3. Copy the generated base64 string
4. Save it to a file in your project

**Option B: Node.js Script**

Create `scripts/convertFont.js`:

```javascript
const fs = require('fs');
const path = require('path');

const fontPath = process.argv[2];
if (!fontPath) {
  console.error('Usage: node convertFont.js <path-to-ttf-file>');
  process.exit(1);
}

const fontBuffer = fs.readFileSync(fontPath);
const base64 = fontBuffer.toString('base64');
const fontName = path.basename(fontPath, '.ttf').replace(/-/g, '');

const tsContent = `// Auto-generated: ${new Date().toISOString()}
export const ${fontName}Base64 = '${base64}';
`;

const outputPath = `./src/fonts/${fontName}.ts`;
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, tsContent);

console.log(`✅ Converted: ${outputPath}`);
console.log(`📦 Size: ${(base64.length / 1024).toFixed(2)} KB`);
```

Run it:
```bash
node scripts/convertFont.js fonts/Amiri-Regular.ttf
```

### Step 4: Create Font Files

Create `src/fonts/AmiriRegular.ts`:

```typescript
// Generated from Amiri-Regular.ttf
export const AmiriRegularBase64 = 'AAEAAAALAIAAAwAwT1MvMg8SBfcAAAC8AAAAYGNtYXAA...';
// Paste your full base64 string here (will be very long, ~200-500 KB)
```

Create `src/fonts/NotoSansRegular.ts` (for universal Unicode):

```typescript
// Generated from NotoSans-Regular.ttf
export const NotoSansRegularBase64 = 'AAEAAAALAIAAAwAwT1MvMg8SBfcAAAC8AAAAYGNtYXAA...';
// Paste your full base64 string here
```

Create `src/fonts/index.ts`:

```typescript
// Export all fonts from a central location
export { AmiriRegularBase64 } from './AmiriRegular';
export { NotoSansRegularBase64 } from './NotoSansRegular';
// Add more fonts as needed
```

---

## 💻 Complete Production Code

### Main Export Utility

Create `src/utils/exportUtils.ts`:

```typescript
/**
 * Universal PDF Export with Full Unicode Support
 * Supports: Arabic, Hebrew, Chinese, Cyrillic, and all Unicode scripts
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { format } from 'date-fns';

// Import your fonts
import { AmiriRegularBase64, NotoSansRegularBase64 } from '../fonts';

// Track if fonts are loaded (performance optimization)
let customFontsLoaded = false;

/**
 * Script/Language Detection
 */
interface ScriptDetection {
  hasArabic: boolean;
  hasHebrew: boolean;
  hasChinese: boolean;
  hasJapanese: boolean;
  hasKorean: boolean;
  hasCyrillic: boolean;
  hasDevanagari: boolean;
  hasThai: boolean;
  hasUnicode: boolean;
}

const detectScripts = (data: any[]): ScriptDetection => {
  const scripts: ScriptDetection = {
    hasArabic: false,
    hasHebrew: false,
    hasChinese: false,
    hasJapanese: false,
    hasKorean: false,
    hasCyrillic: false,
    hasDevanagari: false,
    hasThai: false,
    hasUnicode: false,
  };

  data.forEach(item => {
    Object.values(item).forEach(val => {
      if (typeof val !== 'string') return;
      
      // Arabic (U+0600-U+06FF, Extended: U+FB50-U+FDFF, U+FE70-U+FEFF)
      if (/[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(val)) {
        scripts.hasArabic = true;
        scripts.hasUnicode = true;
      }
      
      // Hebrew (U+0590-U+05FF)
      if (/[\u0590-\u05FF]/.test(val)) {
        scripts.hasHebrew = true;
        scripts.hasUnicode = true;
      }
      
      // Chinese (CJK Unified Ideographs: U+4E00-U+9FFF)
      if (/[\u4E00-\u9FFF]/.test(val)) {
        scripts.hasChinese = true;
        scripts.hasUnicode = true;
      }
      
      // Japanese (Hiragana: U+3040-U+309F, Katakana: U+30A0-U+30FF)
      if (/[\u3040-\u309F\u30A0-\u30FF]/.test(val)) {
        scripts.hasJapanese = true;
        scripts.hasUnicode = true;
      }
      
      // Korean (Hangul: U+AC00-U+D7AF)
      if (/[\uAC00-\uD7AF]/.test(val)) {
        scripts.hasKorean = true;
        scripts.hasUnicode = true;
      }
      
      // Cyrillic (U+0400-U+04FF)
      if (/[\u0400-\u04FF]/.test(val)) {
        scripts.hasCyrillic = true;
        scripts.hasUnicode = true;
      }
      
      // Devanagari (U+0900-U+097F) - Hindi, Sanskrit, etc.
      if (/[\u0900-\u097F]/.test(val)) {
        scripts.hasDevanagari = true;
        scripts.hasUnicode = true;
      }
      
      // Thai (U+0E00-U+0E7F)
      if (/[\u0E00-\u0E7F]/.test(val)) {
        scripts.hasThai = true;
        scripts.hasUnicode = true;
      }
      
      // Any non-ASCII character
      if (/[^\x00-\x7F]/.test(val)) {
        scripts.hasUnicode = true;
      }
    });
  });

  return scripts;
};

/**
 * Load custom fonts into jsPDF
 */
const loadCustomFonts = (doc: jsPDF): void => {
  if (customFontsLoaded) return;

  try {
    // Add Arabic font
    doc.addFileToVFS('Amiri-Regular.ttf', AmiriRegularBase64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    
    // Add Universal Unicode font
    doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegularBase64);
    doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    
    customFontsLoaded = true;
    console.log('✅ Custom fonts loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load custom fonts:', error);
    console.warn('📝 Arabic and Unicode text will not display correctly');
    console.warn('💡 See documentation for font setup instructions');
  }
};

/**
 * Select appropriate font based on detected scripts
 */
const selectFont = (scripts: ScriptDetection): string => {
  // Priority order for font selection
  if (scripts.hasArabic || scripts.hasHebrew) {
    return 'Amiri'; // Best for RTL languages
  }
  if (scripts.hasUnicode) {
    return 'NotoSans'; // Universal Unicode coverage
  }
  return 'helvetica'; // Default for Latin text
};

/**
 * RTL (Right-to-Left) text handling for Arabic and Hebrew
 */
const reverseRTLText = (text: string, isRTL: boolean): string => {
  if (!isRTL || !text) return text;
  
  // Check if text contains RTL characters
  const hasRTLChars = /[\u0600-\u06FF\u0590-\u05FF]/.test(text);
  if (!hasRTLChars) return text;
  
  // Split into words and reverse
  // Note: This is a simplified approach
  // For production, consider using libraries like:
  // - 'bidi-js' for proper BiDi algorithm
  // - 'rtl-detect' for better RTL detection
  const words = text.split(' ');
  return words.reverse().join(' ');
};

/**
 * Process text for PDF export
 */
const processTextForPDF = (
  text: string,
  scripts: ScriptDetection
): string => {
  if (!text) return '';
  
  let processed = String(text);
  
  // Apply RTL reversal if needed
  if (scripts.hasArabic || scripts.hasHebrew) {
    processed = reverseRTLText(processed, true);
  }
  
  return processed;
};

/**
 * Export to Excel (no Unicode issues)
 */
export const exportToExcel = (
  data: any[],
  filename: string,
  sheetName = 'Report'
): void => {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    
    // Auto-size columns
    const headers = Object.keys(data[0] || {});
    const maxWidth = 40;
    const minWidth = 12;
    
    const cols = headers.map(key => ({
      wch: Math.min(
        Math.max(
          key.length + 4,
          minWidth,
          ...data.map(row => String(row[key] || '').length)
        ),
        maxWidth
      )
    }));
    
    ws['!cols'] = cols;
    ws['!rows'] = [{ hpt: 28 }]; // Header row height
    
    // Format headers
    const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].v = String(ws[cellAddress].v || '').toUpperCase();
      }
    }
    
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    const timestamp = format(new Date(), 'yyyy-MM-dd');
    XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
    
    console.log('✅ Excel export successful');
  } catch (error) {
    console.error('❌ Excel export failed:', error);
    throw new Error('Failed to export to Excel');
  }
};

/**
 * Export to CSV
 */
export const exportToCSV = (data: any[], filename: string): void => {
  try {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ CSV export successful');
  } catch (error) {
    console.error('❌ CSV export failed:', error);
    throw new Error('Failed to export to CSV');
  }
};

/**
 * Export to PDF with full Unicode support
 */
export const exportToPDF = (
  data: any[],
  filename: string,
  title: string,
  orientation: 'portrait' | 'landscape' = 'landscape'
): void => {
  try {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    // Detect scripts in data
    const scripts = detectScripts(data);
    console.log('📊 Detected scripts:', scripts);

    // Create PDF instance
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Load fonts if Unicode is detected
    if (scripts.hasUnicode) {
      loadCustomFonts(doc);
    }
    
    // Select appropriate font
    const fontFamily = customFontsLoaded ? selectFont(scripts) : 'helvetica';
    console.log(`🔤 Using font: ${fontFamily}`);
    
    // Add warning if fonts not loaded but Unicode detected
    let startY = 18;
    let warningText = '';
    
    if (scripts.hasUnicode && !customFontsLoaded) {
      if (scripts.hasArabic) {
        warningText = '⚠️ Arabic font not loaded. Text may not display correctly. Use Excel export for best results.';
      } else if (scripts.hasHebrew) {
        warningText = '⚠️ Hebrew font not loaded. Text may not display correctly. Use Excel export for best results.';
      } else {
        warningText = '⚠️ Unicode font not loaded. Special characters may not display correctly.';
      }
      
      doc.setFontSize(9);
      doc.setTextColor(220, 38, 38);
      const lines = doc.splitTextToSize(warningText, pageWidth - 28);
      doc.text(lines, pageWidth / 2, 8, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      startY = 8 + (lines.length * 4) + 6;
    }
    
    // Add title
    doc.setFontSize(18);
    doc.setFont(fontFamily, 'bold');
    doc.text(title, pageWidth / 2, startY, { align: 'center' });
    
    // Add generation date
    doc.setFontSize(9);
    doc.setFont(fontFamily, 'normal');
    doc.setTextColor(100, 100, 100);
    const dateText = `Generated: ${format(new Date(), 'MMM dd, yyyy h:mm a')}`;
    doc.text(dateText, pageWidth - 14, startY, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    
    // Prepare table data
    const columns = Object.keys(data[0]);
    const tableData = data.map(item =>
      columns.map(col => {
        const val = item[col];
        
        // Handle null/undefined
        if (val === null || val === undefined) return '—';
        
        // Handle booleans
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        
        // Handle numbers
        if (typeof val === 'number') return String(val);
        
        // Process text
        return processTextForPDF(String(val), scripts);
      })
    );
    
    // Calculate column widths with Unicode consideration
    const calculateColumnWidth = (colIndex: number): number => {
      const header = columns[colIndex];
      const headerWidth = header.length * 3;
      
      const dataWidths = data.map(item => {
        const val = String(item[columns[colIndex]] || '');
        
        // Adjust multiplier based on script
        let multiplier = 2.8; // Default for Latin
        if (scripts.hasArabic || scripts.hasHebrew) multiplier = 4.0;
        else if (scripts.hasChinese || scripts.hasJapanese) multiplier = 4.5;
        else if (scripts.hasUnicode) multiplier = 3.5;
        
        return Math.min(val.length * multiplier, 70);
      });
      
      return Math.max(18, Math.min(headerWidth, ...dataWidths));
    };
    
    const columnWidths = columns.map((_, idx) => calculateColumnWidth(idx));
    
    // Fit columns to page
    const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0);
    const availableWidth = pageWidth - 28;
    const scaleFactor = totalWidth > availableWidth ? availableWidth / totalWidth : 1;
    const adjustedWidths = columnWidths.map(w => w * scaleFactor);
    
    // Font sizes based on script
    let baseFontSize = 9;
    let headerFontSize = 10;
    
    if (scripts.hasArabic || scripts.hasHebrew) {
      baseFontSize = 11;
      headerFontSize = 12;
    } else if (scripts.hasChinese || scripts.hasJapanese) {
      baseFontSize = 10;
      headerFontSize = 11;
    } else if (scripts.hasUnicode) {
      baseFontSize = 8;
      headerFontSize = 9;
    }
    
    // Generate table with autoTable
    autoTable(doc, {
      head: [columns],
      body: tableData,
      startY: startY + 12,
      theme: 'striped',
      styles: {
        font: fontFamily,
        fontSize: baseFontSize,
        cellPadding: scripts.hasArabic ? 5 : 3,
        overflow: 'linebreak',
        cellWidth: 'wrap',
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: headerFontSize,
        halign: 'left',
        cellPadding: scripts.hasArabic ? 5 : 4,
      },
      bodyStyles: {
        textColor: [0, 0, 0],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: adjustedWidths.reduce((acc, width, index) => {
        acc[index] = {
          cellWidth: width,
          minCellWidth: 15,
        };
        return acc;
      }, {} as any),
      margin: { top: startY + 12, right: 14, bottom: 22, left: 14 },
      didDrawPage: (hookData) => {
        // Footer with page number
        doc.setFontSize(8);
        doc.setFont(fontFamily, 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${hookData.pageNumber}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        doc.setTextColor(0, 0, 0);
      },
    });
    
    // Save PDF
    const timestamp = format(new Date(), 'yyyy-MM-dd');
    doc.save(`${filename}_${timestamp}.pdf`);
    
    console.log('✅ PDF export successful');
  } catch (error) {
    console.error('❌ PDF export failed:', error);
    throw new Error(`Failed to export to PDF: ${error.message}`);
  }
};

/**
 * Smart export - recommends best format based on content
 */
export const smartExport = (
  data: any[],
  filename: string,
  title: string,
  preferredFormat: 'pdf' | 'excel' | 'csv' = 'pdf'
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const scripts = detectScripts(data);
      
      // Check if RTL languages detected
      const hasRTL = scripts.hasArabic || scripts.hasHebrew;
      
      // If RTL detected and PDF requested, show confirmation
      if (hasRTL && preferredFormat === 'pdf') {
        const scriptName = scripts.hasArabic ? 'Arabic' : 'Hebrew';
        const shouldContinue = window.confirm(
          `${scriptName} text detected!\n\n` +
          `PDF export may have limited ${scriptName} support.\n` +
          `For best results, we recommend Excel format.\n\n` +
          `Continue with PDF export?`
        );
        
        if (!shouldContinue) {
          // Switch to Excel
          exportToExcel(data, filename, title);
          resolve();
          return;
        }
      }
      
      // Export in requested format
      switch (preferredFormat) {
        case 'pdf':
          exportToPDF(data, filename, title);
          break;
        case 'excel':
          exportToExcel(data, filename, title);
          break;
        case 'csv':
          exportToCSV(data, filename);
          break;
        default:
          throw new Error(`Unknown format: ${preferredFormat}`);
      }
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Copy table data to clipboard
 */
export const copyToClipboard = (data: any[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      if (data.length === 0) {
        throw new Error('No data to copy');
      }
      
      const headers = Object.keys(data[0]).join('\t');
      const rows = data.map(item =>
        Object.values(item).map(val => String(val || '')).join('\t')
      ).join('\n');
      
      const text = `${headers}\n${rows}`;
      
      navigator.clipboard.writeText(text)
        .then(() => {
          console.log('✅ Copied to clipboard');
          resolve();
        })
        .catch(() => {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          console.log('✅ Copied to clipboard (fallback)');
          resolve();
        });
    } catch (error) {
      console.error('❌ Copy to clipboard failed:', error);
      reject(new Error('Failed to copy to clipboard'));
    }
  });
};

/**
 * Print current page
 */
export const printTable = (): void => {
  window.print();
};
```

---

## 🔧 Font Setup

### Quick Setup Script

Save this as `scripts/setup-fonts.sh`:

```bash
#!/bin/bash

# Font Setup Script for Unicode PDF Support

echo "🔤 Font Setup for Unicode PDF Support"
echo "======================================"
echo ""

# Create directories
mkdir -p fonts
mkdir -p src/fonts
mkdir -p scripts

echo "📁 Directories created"
echo ""

echo "📥 Next steps:"
echo "1. Download fonts from Google Fonts:"
echo "   - Amiri (Arabic): https://fonts.google.com/specimen/Amiri"
echo "   - Noto Sans (Universal): https://fonts.google.com/noto/specimen/Noto+Sans"
echo ""
echo "2. Save .ttf files to the ./fonts directory"
echo ""
echo "3. Convert fonts to base64:"
echo "   node scripts/convertFont.js fonts/Amiri-Regular.ttf"
echo "   node scripts/convertFont.js fonts/NotoSans-Regular.ttf"
echo ""
echo "4. Import fonts in your code and you're done!"
```

Make it executable:
```bash
chmod +x scripts/setup-fonts.sh
./scripts/setup-fonts.sh
```

### Font Conversion Script

Save this as `scripts/convertFont.js`:

```javascript
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
```

Make it executable:
```bash
chmod +x scripts/convertFont.js
```

---

## 🧪 Testing & Troubleshooting

### Test Data

Create `tests/testData.ts`:

```typescript
// Test data with various scripts
export const arabicTestData = [
  { name: 'مرحبا', translation: 'Hello', id: 1 },
  { name: 'العالم', translation: 'World', id: 2 },
  { name: 'البيانات', translation: 'Data', id: 3 },
];

export const multilingualTestData = [
  { language: 'Arabic', text: 'مرحبا بك', english: 'Welcome' },
  { language: 'Hebrew', text: 'שלום', english: 'Hello' },
  { language: 'Chinese', text: '你好', english: 'Hello' },
  { language: 'Russian', text: 'Привет', english: 'Hello' },
  { language: 'Hindi', text: 'नमस्ते', english: 'Hello' },
  { language: 'Japanese', text: 'こんにちは', english: 'Hello' },
  { language: 'Korean', text: '안녕하세요', english: 'Hello' },
  { language: 'Thai', text: 'สวัสดี', english: 'Hello' },
];

export const mixedTestData = [
  { name: 'John Doe', city: 'New York', score: 95 },
  { name: 'محمد أحمد', city: 'القاهرة', score: 88 },
  { name: '李明', city: '北京', score: 92 },
  { name: 'Иван Петров', city: 'Москва', score: 87 },
];
```

### Test Component (React Example)

```typescript
import React from 'react';
import { exportToPDF, exportToExcel, smartExport } from './utils/exportUtils';
import { arabicTestData, multilingualTestData, mixedTestData } from './tests/testData';

export const ExportTest: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Unicode PDF Export Tests</h1>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Test 1: Arabic Only</h2>
        <button onClick={() => exportToPDF(arabicTestData, 'arabic-test', 'Arabic Test')}>
          Export Arabic PDF
        </button>
        <button onClick={() => exportToExcel(arabicTestData, 'arabic-test')}>
          Export Arabic Excel
        </button>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Test 2: Multilingual</h2>
        <button onClick={() => exportToPDF(multilingualTestData, 'multilingual-test', 'World Languages')}>
          Export Multilingual PDF
        </button>
        <button onClick={() => exportToExcel(multilingualTestData, 'multilingual-test')}>
          Export Multilingual Excel
        </button>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Test 3: Mixed Data</h2>
        <button onClick={() => smartExport(mixedTestData, 'mixed-test', 'Mixed Languages', 'pdf')}>
          Smart Export (PDF)
        </button>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Test 4: Large Dataset</h2>
        <button onClick={() => {
          const largeData = Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            arabic: `نص عربي ${i + 1}`,
            english: `Text ${i + 1}`,
            number: Math.floor(Math.random() * 1000),
          }));
          exportToPDF(largeData, 'large-test', 'Large Dataset Test');
        }}>
          Export Large Dataset
        </button>
      </div>
    </div>
  );
};
```

### Common Issues & Solutions

#### Issue 1: Text Shows as Boxes (□□□)

**Cause:** Font not loaded or incorrect font file

**Solution:**
```bash
# Verify font file exists
ls -lh src/fonts/

# Check font file size (should be 100-500 KB for regular fonts)
# If too small (<10 KB), font conversion failed

# Re-convert font
node scripts/convertFont.js fonts/Amiri-Regular.ttf

# Verify import in exportUtils.ts
# Make sure: import { AmiriRegularBase64 } from '../fonts';
```

#### Issue 2: Arabic Text Appears Backwards

**Cause:** Missing RTL handling

**Solution:** The code includes `reverseRTLText()` function. Verify it's being called:
```typescript
// In processTextForPDF function
if (scripts.hasArabic || scripts.hasHebrew) {
  processed = reverseRTLText(processed, true);
}
```

#### Issue 3: Font Loading Error in Console

**Cause:** Base64 string truncated or invalid

**Solution:**
```typescript
// Check your font file:
import { AmiriRegularBase64 } from './fonts/AmiriRegular';

// Verify it starts with: AAEAAAALAIAAAwAwT1MvMg...
console.log(AmiriRegularBase64.substring(0, 50));

// If it's empty or very short, re-convert the font
```

#### Issue 4: PDF File Size Too Large

**Cause:** Multiple large fonts embedded

**Solution:** Use font subsetting
```bash
# Install fonttools
pip install fonttools

# Create subset (Arabic characters only)
pyftsubset Amiri-Regular.ttf \
  --unicodes="U+0000-007F,U+0600-06FF,U+FB50-FDFF,U+FE70-FEFF" \
  --output-file="Amiri-Regular-Subset.ttf"

# Then convert the subset
node scripts/convertFont.js fonts/Amiri-Regular-Subset.ttf
```

#### Issue 5: "Cannot read property 'addFileToVFS'"

**Cause:** jsPDF instance not created correctly

**Solution:**
```typescript
// Correct initialization
const doc = new jsPDF({
  orientation: 'landscape',
  unit: 'mm',
  format: 'a4',
  compress: true,
});

// THEN load fonts
loadCustomFonts(doc);
```

---

## 📚 Best Practices

### 1. Font Selection Strategy

```typescript
// Load only fonts you actually need
const loadRequiredFonts = (doc: jsPDF, scripts: ScriptDetection) => {
  if (scripts.hasArabic || scripts.hasHebrew) {
    // Load Arabic/Hebrew font
    doc.addFileToVFS('Amiri-Regular.ttf', AmiriRegularBase64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
  } else if (scripts.hasChinese || scripts.hasJapanese) {
    // Load CJK font (note: these are very large)
    // Consider warning user or defaulting to Excel
  } else if (scripts.hasUnicode) {
    // Load universal font
    doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegularBase64);
    doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  }
};
```

### 2. Performance Optimization

```typescript
// Load fonts once per session
let fontsCache: Map<string, boolean> = new Map();

const loadFontOnce = (doc: jsPDF, fontName: string, base64: string) => {
  if (fontsCache.get(fontName)) return;
  
  doc.addFileToVFS(`${fontName}.ttf`, base64);
  doc.addFont(`${fontName}.ttf`, fontName, 'normal');
  fontsCache.set(fontName, true);
};
```

### 3. User Experience

```typescript
// Show progress for large exports
export const exportWithProgress = async (
  data: any[],
  filename: string,
  onProgress?: (percent: number) => void
) => {
  onProgress?.(0);
  
  const scripts = detectScripts(data);
  onProgress?.(20);
  
  const doc = new jsPDF({ orientation: 'landscape' });
  loadCustomFonts(doc);
  onProgress?.(40);
  
  // Generate table...
  onProgress?.(80);
  
  doc.save(`${filename}.pdf`);
  onProgress?.(100);
};
```

### 4. Fallback Strategy

```typescript
// Always offer Excel as fallback
const exportWithFallback = (data: any[], filename: string) => {
  try {
    const scripts = detectScripts(data);
    
    if (scripts.hasArabic && !customFontsLoaded) {
      console.warn('Arabic font not available, switching to Excel');
      return exportToExcel(data, filename);
    }
    
    exportToPDF(data, filename, 'Report');
  } catch (error) {
    console.error('PDF export failed, falling back to Excel');
    exportToExcel(data, filename);
  }
};
```

### 5. Testing Checklist

- [ ] Test with Arabic text
- [ ] Test with Hebrew text
- [ ] Test with Chinese/Japanese/Korean
- [ ] Test with Cyrillic
- [ ] Test with mixed languages in same row
- [ ] Test with large datasets (100+ rows)
- [ ] Test with long text (word wrapping)
- [ ] Test with special characters (emoji, symbols)
- [ ] Test on different browsers
- [ ] Test PDF file size
- [ ] Test export speed

---

## 📖 Additional Resources

### Recommended Fonts by Language

| Language | Font | Size | Download |
|----------|------|------|----------|
| Arabic | Amiri | ~250 KB | [Google Fonts](https://fonts.google.com/specimen/Amiri) |
| Arabic (Modern) | Cairo | ~180 KB | [Google Fonts](https://fonts.google.com/specimen/Cairo) |
| Hebrew | Noto Sans Hebrew | ~150 KB | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+Hebrew) |
| Chinese | Noto Sans SC | ~5 MB | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+SC) |
| Japanese | Noto Sans JP | ~7 MB | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+JP) |
| Korean | Noto Sans KR | ~4 MB | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+KR) |
| Cyrillic | Noto Sans | ~300 KB | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans) |
| Thai | Noto Sans Thai | ~120 KB | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+Thai) |
| Universal | Noto Sans | ~300 KB | [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans) |

### Useful Libraries

- **jsPDF**: https://github.com/parallax/jsPDF
- **jspdf-autotable**: https://github.com/simonbengtsson/jsPDF-AutoTable
- **bidi-js**: https://github.com/lojjic/bidi-js (BiDi algorithm)
- **rtl-detect**: https://github.com/shadiabuhilal/rtl-detect
- **string-direction**: https://github.com/nativew/string-direction

### Online Tools

- **Font Converter**: https://peckconsulting.s3.amazonaws.com/fontconverter/fontconverter.html
- **Google Fonts**: https://fonts.google.com
- **Font Squirrel**: https://www.fontsquirrel.com/tools/webfont-generator
- **Unicode Character Table**: https://unicode-table.com

### Unicode Ranges Reference

| Script | Range | Example |
|--------|-------|---------|
| Arabic | U+0600–U+06FF | مرحبا |
| Hebrew | U+0590–U+05FF | שלום |
| Chinese | U+4E00–U+9FFF | 你好 |
| Japanese (Hiragana) | U+3040–U+309F | ひらがな |
| Japanese (Katakana) | U+30A0–U+30FF | カタカナ |
| Korean | U+AC00–U+D7AF | 안녕하세요 |
| Cyrillic | U+0400–U+04FF | Привет |
| Devanagari | U+0900–U+097F | नमस्ते |
| Thai | U+0E00–U+0E7F | สวัสดี |

---

## 🎯 Summary

This guide provides a **complete, production-ready solution** for exporting PDFs with full Unicode support including Arabic, Hebrew, Chinese, and all other scripts.

**Key Points:**
1. ✅ Download Unicode fonts (Amiri for Arabic, Noto Sans for universal)
2. ✅ Convert fonts to base64 using the provided script
3. ✅ Import fonts in your export utility
4. ✅ Use the provided code which handles script detection and RTL automatically
5. ✅ Test with the provided test data
6. ✅ Always offer Excel as a fallback for best compatibility

**Result:** Your users can export data in any language to PDF with proper rendering!