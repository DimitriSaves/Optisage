import { Injectable } from '@angular/core';
import * as FileSaver from 'file-saver';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  constructor() {}

  exportToCSV(items: any[], fileName: string): void {
    let csvContent = "";

    const uniqueItems = new Map();

    items.forEach(item => {
      if (Array.isArray(item)) {
        item.forEach((config: any) => {
          const row = `M;${config.profileCode};${config.sites};${config.function};${config.access};${config.options}`;
          uniqueItems.set(row, config);
        });
      } else {
        const row = `M;${item.profileCode};${item.sites};${item.function};${item.access};${item.options}`;
        uniqueItems.set(row, item);
      }
    });

    uniqueItems.forEach((config, row) => {
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    FileSaver.saveAs(blob, fileName);
  }
}
