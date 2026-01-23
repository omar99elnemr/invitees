/**
 * Export helper functions for generating reports in various formats
 */
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { format } from 'date-fns';

/**
 * Export data to Excel format
 */
export const exportToExcel = (data: any[], filename: string, sheetName = 'Report') => {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Auto-size columns
    const maxWidth = 50;
    const cols = Object.keys(data[0] || {}).map(key => ({
      wch: Math.min(
        Math.max(
          key.length,
          ...data.map(row => String(row[key] || '').length)
        ),
        maxWidth
      )
    }));
    ws['!cols'] = cols;
    
    const timestamp = format(new Date(), 'yyyy-MM-dd');
    XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
  } catch (error) {
    console.error('Export to Excel failed:', error);
    throw new Error('Failed to export to Excel');
  }
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
 * Export data to PDF format
 */
export const exportToPDF = (
  data: any[],
  columns: string[],
  filename: string,
  title: string,
  orientation: 'portrait' | 'landscape' = 'landscape'
) => {
  try {
    const doc = new jsPDF(orientation);
    
    // Add title
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    
    // Add generation date
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 28);
    
    // Prepare table data
    const tableData = data.map(item =>
      columns.map(col => item[col] !== undefined ? String(item[col]) : '')
    );
    
    // Generate table
    autoTable(doc, {
      head: [columns],
      body: tableData,
      startY: 35,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: columns.reduce((acc, _, index) => {
        acc[index] = { cellWidth: 'auto' };
        return acc;
      }, {} as any),
    });
    
    // Save PDF
    doc.save(`${filename}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  } catch (error) {
    console.error('Export to PDF failed:', error);
    throw new Error('Failed to export to PDF');
  }
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
