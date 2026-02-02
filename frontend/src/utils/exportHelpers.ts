/**
 * Export helper functions for generating reports in various formats
 */
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { format } from 'date-fns';

/**
 * Export data to Excel format with professional styling
 */
export const exportToExcel = (data: any[], filename: string, sheetName = 'Report') => {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    
    // Get headers
    const headers = Object.keys(data[0] || {});
    
    // Auto-size columns with minimum width for headers
    const maxWidth = 40;
    const minWidth = 12;
    const cols = headers.map(key => ({
      wch: Math.min(
        Math.max(
          key.length + 4, // Extra padding for headers
          minWidth,
          ...data.map(row => String(row[key] || '').length)
        ),
        maxWidth
      )
    }));
    ws['!cols'] = cols;
    
    // Set row heights - taller header row
    ws['!rows'] = [{ hpt: 28 }]; // Header row height
    
    // Style the header row (A1, B1, C1, etc.)
    const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      
      // Add cell styling (note: xlsx doesn't support full styling without xlsx-style)
      // But we can ensure the data is clean
      ws[cellAddress].v = String(ws[cellAddress].v || '').toUpperCase();
    }
    
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
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
 * Export data to PDF format with professional formatting
 * @param data - Array of objects with clean, display-ready keys
 * @param filename - Output filename (without extension)
 * @param title - Report title displayed at the top
 * @param orientation - Page orientation
 */
export const exportToPDF = (
  data: any[],
  filename: string,
  title: string,
  orientation: 'portrait' | 'landscape' = 'landscape'
) => {
  try {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    const doc = new jsPDF(orientation);
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add title - centered
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, 18, { align: 'center' });
    
    // Add generation date - right aligned
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy h:mm a')}`, pageWidth - 14, 18, { align: 'right' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Get column headers from data keys (already formatted)
    const columns = Object.keys(data[0]);
    
    // Prepare table data
    const tableData = data.map(item =>
      columns.map(col => {
        const val = item[col];
        if (val === null || val === undefined) return '—';
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        return String(val);
      })
    );
    
    // Generate table with professional styling
    autoTable(doc, {
      head: [columns],
      body: tableData,
      startY: 28,
      theme: 'striped',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'left',
        cellPadding: 4,
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: [220, 220, 220],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      styles: {
        overflow: 'linebreak',
        cellWidth: 'wrap',
        minCellHeight: 8,
      },
      columnStyles: columns.reduce((acc, col, index) => {
        // Give more width to certain columns
        if (col.toLowerCase().includes('name') || col.toLowerCase().includes('email')) {
          acc[index] = { cellWidth: 'auto', minCellWidth: 30 };
        } else if (col.toLowerCase().includes('phone')) {
          acc[index] = { cellWidth: 28 };
        } else if (col.toLowerCase().includes('status') || col.toLowerCase().includes('attending')) {
          acc[index] = { cellWidth: 22, halign: 'center' };
        }
        return acc;
      }, {} as any),
      margin: { top: 28, right: 14, bottom: 20, left: 14 },
      didDrawPage: (data) => {
        // Add page numbers
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      },
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
