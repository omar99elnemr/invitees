/**
 * Export helper functions for generating reports in various formats
 */
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { format } from 'date-fns';

/**
 * Export data to Excel format with logo information
 */
export const exportToExcel = (data: any[], filename: string, sheetName = 'Report', logoData: string = '') => {
  try {
    // Validate data
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }
    
    const headers = Object.keys(data[0] || {});
    
    // If logo data is available, use HTML approach with actual image
    if (logoData) {
      exportToExcelWithImage(data, filename, sheetName, logoData, headers);
    } else {
      // Fallback to standard XLSX without image
      exportToExcelStandard(data, filename, sheetName, headers);
    }
  } catch (error) {
    console.error('❌ Excel export failed:', error);
    throw new Error('Failed to export to Excel');
  }
};

/**
 * Export Excel with actual logo image using HTML table approach
 */
const exportToExcelWithImage = (data: any[], filename: string, sheetName: string, logoData: string, headers: string[]) => {
  // Extract pure base64 data if it has data: prefix
  const base64Data = logoData.startsWith('data:') ? logoData.split(',')[1] : logoData;
  
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <meta name=ProgId content=Excel.Sheet>
      <meta name=Generator content="Microsoft Excel 15">
      <!--[if gte mso 9]><xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${sheetName}</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml><![endif]-->
      <style>
        table { border-collapse: collapse; width: 100%; mso-display-gridlines: yes; }
        th, td { border: 1px solid #ddd; padding: 8px; mso-number-format: \@; }
        .header-bg { background-color: #2980B9; color: white; font-weight: bold; text-align: center; }
        .title-bg { background-color: #2C3E50; color: white; font-weight: bold; text-align: center; }
        .logo-bg { 
          background-color: #ECF0F1; 
          background-image: url('data:image/png;base64,${base64Data}');
          background-repeat: no-repeat;
          background-position: 15px center;
          background-size: 100px 35px;
        }
        .even-row { background-color: #F8F9FA; }
        .logo-text { font-size: 18px; font-weight: bold; color: #2980B9; vertical-align: middle; font-family: 'Calibri', 'Arial', sans-serif; letter-spacing: 1px; }
        .title-text { font-size: 14px; font-weight: bold; vertical-align: middle; font-family: 'Calibri', 'Arial', sans-serif; }
      </style>
    </head>
    <body>
      <table>
        <tr>
          <td colspan="${headers.length}" class="logo-bg" style="height:50px;vertical-align:middle;padding:10px;padding-left:130px;">
            <span class="logo-text">Hyatt</span>
          </td>
        </tr>
        <tr>
          <td colspan="${headers.length}" class="title-bg" style="height:35px;vertical-align:middle;padding:10px;">
            <span class="title-text">${sheetName.toUpperCase()}</span>
          </td>
        </tr>
        <tr>
          <td colspan="${headers.length}" style="height:5px;"></td>
        </tr>
        <tr>
          ${headers.map(h => `<th class="header-bg">${h.toUpperCase().replace(/_/g, ' ')}</th>`).join('')}
        </tr>
  `;
  
  // Add data rows
  data.forEach((item, index) => {
    const rowClass = index % 2 === 0 ? 'even-row' : '';
    html += `<tr>`;
    headers.forEach(header => {
      const value = item[header] ?? '';
      html += `<td class="${rowClass}" style="vertical-align:middle;">${value}</td>`;
    });
    html += `</tr>`;
  });
  
  html += `
      </table>
    </body>
    </html>
  `;
  
  // Create blob and download as .xls (Excel can open HTML tables)
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const timestamp = format(new Date(), 'yyyy-MM-dd');
  link.download = `${filename}_${timestamp}.xls`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  console.log('✅ Excel export successful with actual logo image');
};

/**
 * Standard Excel export without image (fallback)
 */
const exportToExcelStandard = (data: any[], filename: string, sheetName: string, headers: string[]) => {
  const wsData = [
    ['🏢 INVITATION SYSTEM'], // Company name
    [sheetName.toUpperCase()], // Report title
    [], // Empty spacer
    headers.map(h => h.toUpperCase().replace(/_/g, ' ')), // Column headers
    ...data.map(item => headers.map(h => item[h] ?? '')) // Data rows
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  
  // Set column widths and styling...
  ws['!cols'] = headers.map(header => {
    let maxLen = header.length;
    data.forEach(row => {
      const val = String(row[header] || '');
      if (val.length > maxLen) maxLen = val.length;
    });
    return { wch: Math.min(Math.max(maxLen + 2, 12), 40) };
  });
  
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  const timestamp = format(new Date(), 'yyyy-MM-dd');
  XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
  
  console.log('✅ Excel export successful (standard without image)');
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
