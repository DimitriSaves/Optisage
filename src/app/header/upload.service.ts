// upload.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { MenuService } from '../appsage2/menu.service';
import { ConfigService } from '../appsage2/config.service'; 

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  // Subject pour notifier les composants intéressés que les données sont prêtes
  private csvDataProcessed = new Subject<any[]>();
 // Modifiez pour accepter un tableau d'objets

  // Observable que les composants peuvent écouter
  csvDataProcessed$ = this.csvDataProcessed.asObservable();

  constructor(private menuService: MenuService, private configService: ConfigService) {}

  // Appeler cette fonction pour émettre les codes CSV traités
  emitCsvDataProcessed(fullData: any[]) {
    this.menuService.setCodes(fullData); // Stocker les codes dans MenuService
    this.csvDataProcessed.next(fullData);  }

   // Assumons que fullData est un tableau d'objets, pas des lignes de texte CSV
   processCsvData(fullData: any[]) {
    const groupedData: { [key: string]: any[] } = {};
  
    fullData.forEach(dataObj => {
      const code = dataObj.function;
      if (!groupedData[code]) {
        groupedData[code] = [];
      }
      groupedData[code].push({
        profileCode: dataObj.profileCode,
        menu: dataObj.menu,
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
  }
  


    
    
}
