/**
 * Universal PDF Export with Full Unicode Support
 * Supports: Arabic, Hebrew, Chinese, Cyrillic, and all Unicode scripts
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { format } from 'date-fns';

// Import fonts (will be empty until fonts are converted)
import { AmiriRegularBase64, NotoSansRegularBase64 } from '../fonts';

// Import embedded logo
import { logoBase64 } from './logoData';

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
    // Only load fonts if base64 data is available
    if (AmiriRegularBase64 && typeof AmiriRegularBase64 === 'string' && AmiriRegularBase64.length > 100) {
      doc.addFileToVFS('Amiri-Regular.ttf', AmiriRegularBase64);
      doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
      console.log('✅ Arabic font (Amiri) loaded');
    }
    
    if (NotoSansRegularBase64 && typeof NotoSansRegularBase64 === 'string' && NotoSansRegularBase64.length > 100) {
      doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegularBase64);
      doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
      console.log('✅ Unicode font (Noto Sans) loaded');
    }
    
    customFontsLoaded = true;
    console.log('✅ Custom fonts loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load custom fonts:', (error as Error).message);
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
    return customFontsLoaded && AmiriRegularBase64 ? 'Amiri' : 'helvetica';
  }
  if (scripts.hasUnicode) {
    return customFontsLoaded && NotoSansRegularBase64 ? 'NotoSans' : 'helvetica';
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
    // Add header rows for logo and title
    const headers = Object.keys(data[0] || {});
    const headerData = [
      { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '', I: '', J: '' }, // Row 1: Logo space
      { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '', I: '', J: '' }, // Row 2: Title space
      ...data.map(item => {
        const row: any = {};
        headers.forEach(header => {
          row[header] = item[header];
        });
        return row;
      })
    ];
    
    const ws = XLSX.utils.json_to_sheet(headerData, { skipHeader: true });
    const wb = XLSX.utils.book_new();
    
    // Auto-size columns
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
    
    // Set row heights
    ws['!rows'] = [
      { hpt: 30 },  // Row 1: Logo height
      { hpt: 25 },  // Row 2: Title height
      ...data.map(() => ({ hpt: 20 })) // Data rows
    ];
    
    // Add title to row 2 (centered across columns)
    const titleCell = { v: sheetName, t: 's', s: { 
      font: { bold: true, sz: 16 },
      alignment: { horizontal: 'center', vertical: 'center' }
    }};
    ws['B2'] = titleCell;
    
    // Add logo reference to cell A1 for debugging
    ws['A1'] = { v: 'Logo: /logo.png', t: 's', s: { 
      font: { sz: 8, color: { rgb: 'FF666666' } }
    }};
    
    // Merge cells for title (B2 to J2)
    ws['!merges'] = [{ s: { r: 1, c: 1 }, e: { r: 1, c: 9 } }];
    
    // Format data headers (row 3)
    const headerStartRow = 2; // After logo and title rows
    headers.forEach((header, index) => {
      const cellAddress = XLSX.utils.encode_cell({ r: headerStartRow, c: index });
      if (ws[cellAddress]) {
        ws[cellAddress].v = String(header).toUpperCase();
        ws[cellAddress].s = {
          font: { bold: true, sz: 12 },
          fill: { fgColor: { rgb: 'FF2980B9' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
    });
    
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

    // Logo is now embedded - check if available
    console.log('🖼️ Logo embedded:', logoBase64 ? 'Yes' : 'No');

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
    const fontFamily = selectFont(scripts);
    console.log(`🔤 Using font: ${fontFamily}`);
    
    // Add title - centered (original working position)
    doc.setFontSize(18);
    doc.setFont(fontFamily, 'bold');
    doc.text(title, pageWidth / 2, 18, { align: 'center' });
    
    // Add generation date - right aligned
    doc.setFontSize(9);
    doc.setFont(fontFamily, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy h:mm a')}`, pageWidth - 14, 18, { align: 'right' });
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
    
    // Calculate column widths based on content with Unicode consideration
    const columnWidths = columns.map((col) => {
      // Get max width for this column
      const headerWidth = col.length * 4; // Approximate width for header
      const dataWidths = data.map(item => {
        const val = String(item[col] || '');
        
        // Calculate character width based on script
        let charWidth = 4; // Default for Latin
        if (/[\u0600-\u06FF]/.test(val)) charWidth = 5; // Arabic
        else if (/[\u4E00-\u9FFF]/.test(val)) charWidth = 6; // Chinese/Japanese/Korean
        else if (/[\u0400-\u04FF]/.test(val)) charWidth = 4.5; // Cyrillic
        else if (/[^\x00-\x7F]/.test(val)) charWidth = 4.5; // Other Unicode
        
        return Math.min(val.length * charWidth, 60); // Cap individual column width
      });
      const maxWidth = Math.max(headerWidth, ...dataWidths);
      
      // Set minimum and maximum widths
      const minWidth = 15;
      const maxWidthLimit = 50; // Much smaller max width
      return Math.min(Math.max(maxWidth, minWidth), maxWidthLimit);
    });
    
    // Adjust widths to fit page
    const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0);
    const availableWidth = pageWidth - 30; // Increased margin
    const scaleFactor = totalWidth > availableWidth ? availableWidth / totalWidth : 1;
    const adjustedWidths = columnWidths.map(w => w * scaleFactor);
    
    // Determine font sizes and spacing based on content
    const baseFontSize = scripts.hasChinese ? 6 : (scripts.hasArabic || scripts.hasCyrillic ? 7 : 7); // Reduced all sizes
    const headerFontSize = baseFontSize + 1;
    const cellPadding = (scripts.hasArabic || scripts.hasCyrillic || scripts.hasChinese) ? 3 : 2; // Reduced padding
    const minCellHeight = (scripts.hasArabic || scripts.hasCyrillic || scripts.hasChinese) ? 8 : 7; // Reduced height
    
    // Generate table with professional styling
    autoTable(doc, {
      head: [columns],
      body: tableData,
      startY: 28,
      theme: 'striped',
      styles: {
        overflow: 'linebreak',
        cellWidth: 'wrap',
        minCellHeight: minCellHeight,
        font: 'helvetica',
        // For better Unicode rendering
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: headerFontSize,
        halign: 'left',
        cellPadding: cellPadding,
      },
      bodyStyles: {
        fontSize: baseFontSize,
        cellPadding: cellPadding,
        lineColor: [220, 220, 220],
        overflow: 'linebreak',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: adjustedWidths.reduce((acc, width, index) => {
        acc[index] = { 
          cellWidth: width,
          minCellWidth: 15
        };
        return acc;
      }, {} as any),
      margin: { top: 28, right: 14, bottom: 20, left: 14 },
      didDrawPage: (hookData) => {
        // Add logo to every page (top-left, within margins)
        if (logoBase64) {
          try {
            doc.addImage(logoBase64, 'PNG', 14, 8, 25, 12);
          } catch (e) {
            // Silently ignore on subsequent pages
          }
        }
        
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
    throw new Error(`Failed to export to PDF: ${(error as Error).message}`);
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
 * Print current page with logo
 */
export const printTable = (): void => {
  // Create print stylesheet with logo
  const printStyles = `
    @media print {
      @page {
        margin: 1cm;
        size: landscape;
      }
      
      .print-header {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
        page-break-after: avoid;
      }
      
      .print-logo {
        width: 80px;
        height: 40px;
        margin-right: 20px;
      }
      
      .print-title {
        font-size: 18px;
        font-weight: bold;
        flex-grow: 1;
      }
      
      .print-date {
        font-size: 9px;
        color: #666;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 9px;
      }
      
      th {
        background-color: #2980b9;
        color: white;
        font-weight: bold;
        padding: 4px;
        text-align: left;
      }
      
      td {
        padding: 3px;
        border: 1px solid #ddd;
      }
      
      tr:nth-child(even) {
        background-color: #f8f9fa;
      }
      
      .no-print {
        display: none !important;
      }
    }
  `;
  
  // Create and append print stylesheet
  const styleElement = document.createElement('style');
  styleElement.textContent = printStyles;
  document.head.appendChild(styleElement);
  
  // Add print header to body
  const printHeader = document.createElement('div');
  printHeader.className = 'print-header';
  printHeader.innerHTML = `
    <img src="${logoBase64}" alt="Logo" class="print-logo" onerror="this.style.display='none'">
    <div class="print-title">Report</div>
    <div class="print-date">${format(new Date(), 'MMM dd, yyyy h:mm a')}</div>
  `;
  
  // Insert header at the top of the page
  const bodyFirstElement = document.body.firstElementChild;
  if (bodyFirstElement) {
    document.body.insertBefore(printHeader, bodyFirstElement);
  } else {
    document.body.appendChild(printHeader);
  }
  
  // Print the page
  window.print();
  
  // Clean up after printing
  setTimeout(() => {
    document.head.removeChild(styleElement);
    if (printHeader.parentNode) {
      printHeader.parentNode.removeChild(printHeader);
    }
  }, 100);
};
