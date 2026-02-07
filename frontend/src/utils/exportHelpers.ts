/**
 * Export helper functions for generating reports in various formats
 */
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { format } from 'date-fns';

/**
 * Detect image extension from a data URI or default to png
 */
const getImageExtension = (dataUri: string): 'png' | 'jpeg' | 'gif' => {
  if (dataUri.includes('image/jpeg') || dataUri.includes('image/jpg')) return 'jpeg';
  if (dataUri.includes('image/gif')) return 'gif';
  return 'png';
};

/**
 * Extract pure base64 from a data URI
 */
const extractBase64 = (dataUri: string): string => {
  return dataUri.startsWith('data:') ? dataUri.split(',')[1] : dataUri;
};

/**
 * Export data to Excel format with logo information
 */
export const exportToExcel = async (
  data: any[],
  filename: string,
  sheetName = 'Report',
  logoData: string = '',
  options?: { logoLeft?: string | null; logoRight?: string | null }
) => {
  try {
    // Validate data
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }
    
    const headers = Object.keys(data[0] || {});
    
    // Resolve logos: dynamic settings take priority, then legacy logoData fallback
    const leftLogo = options?.logoLeft !== undefined ? options.logoLeft : (logoData || null);
    const rightLogo = options?.logoRight !== undefined ? options.logoRight : null;
    
    await exportToExcelWithExcelJS(data, filename, sheetName, headers, leftLogo, rightLogo);
  } catch (error) {
    console.error('❌ Excel export failed:', error);
    throw new Error('Failed to export to Excel');
  }
};

/**
 * Export Excel with ExcelJS — proper .xlsx with embedded images, styling, and Unicode support
 */
const exportToExcelWithExcelJS = async (
  data: any[],
  filename: string,
  sheetName: string,
  headers: string[],
  leftLogo: string | null,
  rightLogo: string | null
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
    bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
    left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
    right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
  };

  let currentRow = 1;

  // --- Row 1: Logo row (light background) ---
  worksheet.mergeCells(currentRow, 1, currentRow, headers.length);
  const logoRow = worksheet.getRow(currentRow);
  logoRow.height = 45;
  logoRow.getCell(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFECF0F1' },
  };

  if (leftLogo) {
    try {
      const leftImageId = workbook.addImage({
        base64: extractBase64(leftLogo),
        extension: getImageExtension(leftLogo),
      });
      worksheet.addImage(leftImageId, {
        tl: { col: 0.15, row: currentRow - 1 + 0.1 },
        ext: { width: 130, height: 38 },
      });
    } catch (e) {
      console.warn('⚠️ Failed to embed left logo:', e);
    }
  }

  if (rightLogo) {
    try {
      const rightImageId = workbook.addImage({
        base64: extractBase64(rightLogo),
        extension: getImageExtension(rightLogo),
      });
      worksheet.addImage(rightImageId, {
        tl: { col: Math.max(headers.length - 2, 1) + 0.5, row: currentRow - 1 + 0.1 },
        ext: { width: 130, height: 38 },
      });
    } catch (e) {
      console.warn('⚠️ Failed to embed right logo:', e);
    }
  }
  currentRow++;

  // --- Row 2: Title row (dark background) ---
  worksheet.mergeCells(currentRow, 1, currentRow, headers.length);
  const titleRow = worksheet.getRow(currentRow);
  titleRow.height = 30;
  const titleCell = titleRow.getCell(1);
  titleCell.value = sheetName.toUpperCase();
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2C3E50' },
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  currentRow++;

  // --- Row 3: Spacer ---
  worksheet.getRow(currentRow).height = 5;
  currentRow++;

  // --- Row 4: Column headers (blue) ---
  const headerRow = worksheet.getRow(currentRow);
  headerRow.height = 25;
  headers.forEach((header, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = header.toUpperCase().replace(/_/g, ' ');
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Calibri' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2980B9' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });
  currentRow++;

  // --- Data rows ---
  data.forEach((item, idx) => {
    const row = worksheet.getRow(currentRow);
    headers.forEach((header, i) => {
      const cell = row.getCell(i + 1);
      cell.value = item[header] ?? '';
      cell.alignment = { vertical: 'middle' };
      cell.border = thinBorder;
      cell.font = { size: 10, name: 'Calibri' };
      if (idx % 2 === 0) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8F9FA' },
        };
      }
    });
    currentRow++;
  });

  // --- Auto-fit column widths ---
  headers.forEach((header, i) => {
    let maxLen = header.length;
    data.forEach(row => {
      const val = String(row[header] || '');
      if (val.length > maxLen) maxLen = val.length;
    });
    worksheet.getColumn(i + 1).width = Math.min(Math.max(maxLen + 2, 12), 40);
  });

  // --- Generate and download ---
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const timestamp = format(new Date(), 'yyyy-MM-dd');
  link.download = `${filename}_${timestamp}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log('✅ Excel export successful with logo(s)');
};

/**
 * Export data to CSV format
 */
export const exportToCSV = (data: any[], filename: string) => {
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
  } catch (error) {
    console.error('Export to CSV failed:', error);
    throw new Error('Failed to export to CSV');
  }
};

/**
 * Export data to PDF format with Unicode support
 * This now uses the comprehensive Unicode-aware export utility
 * @param data - Array of objects with clean, display-ready keys
 * @param filename - Output filename (without extension)
 * @param title - Report title displayed at the top
 * @param orientation - Page orientation
 */
export const exportToPDF = (
  data: any[],
  filename: string,
  title: string,
  orientation: 'portrait' | 'landscape' = 'landscape',
  options?: { logoLeft?: string | null; logoRight?: string | null }
) => {
  // Import and use the Unicode-aware export function
  import('./exportUtils').then(({ exportToPDF: unicodeExportToPDF }) => {
    unicodeExportToPDF(data, filename, title, orientation, options);
  });
};

/**
 * Copy table data to clipboard
 */
export const copyToClipboard = (data: any[]) => {
  try {
    if (data.length === 0) {
      throw new Error('No data to copy');
    }
    
    const headers = Object.keys(data[0]).join('\t');
    const rows = data.map(item =>
      Object.values(item).map(val => String(val || '')).join('\t')
    ).join('\n');
    
    const text = `${headers}\n${rows}`;
    
    navigator.clipboard.writeText(text).then(() => {
      // Success feedback handled by caller
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    throw new Error('Failed to copy to clipboard');
  }
};

/**
 * Print current page
 */
export const printTable = () => {
  window.print();
};
