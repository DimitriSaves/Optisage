import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { MenuService } from '../appsage2/menu.service';
import { ConfigService } from '../appsage2/config.service'; 
import { ExportService } from '../header/export.service'; // Ajout de l'ExportService

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private csvDataProcessed = new Subject<any[]>();
  csvDataProcessed$ = this.csvDataProcessed.asObservable();

  constructor(
    private menuService: MenuService,
    private configService: ConfigService,
    private exportService: ExportService // Ajout de l'ExportService
  ) {}

  emitCsvDataProcessed(fullData: any[]) {
    this.menuService.setCodes(fullData);
    this.csvDataProcessed.next(fullData);  
  }

  processCsvData(fullData: any[], fileName: string): void { // Ajout du paramètre fileName
    const groupedData: { [key: string]: any[] } = {};

    fullData.forEach(dataObj => {
      const code = dataObj.function;
      if (!groupedData[code]) {
        groupedData[code] = [];
      }
      groupedData[code].push({
        profileCode: dataObj.profileCode,
        types: dataObj.types,
        sites: dataObj.sites,
        function: code,
        access: dataObj.access,
        options: dataObj.options
      });
    });

    for (const code in groupedData) {
      if (groupedData.hasOwnProperty(code)) {
        this.configService.storeFunctionData(code, groupedData[code]);
      }
    }
    this.csvDataProcessed.next(fullData);
    this.menuService.notifyMenuUpdate();

    // Définir le nom du fichier importé dans ExportService
    this.exportService.setImportFileName(fileName);
  }
}
