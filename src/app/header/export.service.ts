import { Injectable } from '@angular/core';
import * as FileSaver from 'file-saver';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private importFileName: string = '';

  constructor() {}

  setImportFileName(fileName: string): void {
    this.importFileName = fileName;
  }

  exportToCSV(): void {
    const functionsData = JSON.parse(localStorage.getItem('functionsData') || '[]');

    if (!Array.isArray(functionsData) || functionsData.length === 0) {
      console.error("Aucune donnée valide fournie pour l'exportation :", functionsData);
      return;
    }

    let csvContent = "";

    functionsData.forEach(item => {
      const status = sessionStorage.getItem(item.function);
      if (status !== 'absent') {
        const options = Array.isArray(item.options) ? item.options.join('') : item.options;
        const row = `M;${item.function};${item.access};${options};${item.profileCode};${item.types};${item.sites}`;
        csvContent += row + '\n';
      }
    });

    // Convert line endings from LF to CRLF
    csvContent = this.convertLineEndingsToCRLF(csvContent);

    const exportFileName = this.importFileName ? this.importFileName.replace('.csv', 'modif.csv') : 'export.csv';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    FileSaver.saveAs(blob, exportFileName);
  }

  private convertLineEndingsToCRLF(content: string): string {
    return content.replace(/\n/g, '\r\n');
  }
}
