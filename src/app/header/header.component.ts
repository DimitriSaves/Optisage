import { Component, OnInit } from '@angular/core';
import { UploadService } from './upload.service';
import { HttpClient } from '@angular/common/http';
import { ExportService } from './export.service';
import { MenuService } from '../appsage2/menu.service';
import { StateManagementService } from './state-management.service';
import { FileStateService } from './file-state.service';


@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  isMatched = false;
  fileName: string = '';
  private fileInput!: HTMLInputElement;

  constructor(private uploadService: UploadService, private http: HttpClient, private exportService: ExportService, private menuService: MenuService,
    private stateManagementService: StateManagementService, private fileStateService: FileStateService) { }

  ngOnInit(): void {
    // Récupérer le nom du fichier de localStorage au chargement du composant
    const storedFileName = localStorage.getItem('uploadedFileName');
    if (storedFileName) {
      this.fileName = storedFileName;
    }
  }


  uploadFile(event: Event) {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files.length) {
      const file = element.files[0];
      this.fileName = file.name;
      localStorage.setItem('uploadedFileName', file.name);
      this.uploadFileToServer(file);
    } else {
      console.log('No file selected');
      this.fileName = '';
      localStorage.removeItem('uploadedFileName');
    }
  }




  uploadFileToServer(file: File) {
    const formData = new FormData();
    formData.append('file', file, file.name);

    this.http.post<{ codes: string[], fullData: any[] }>('http://localhost:3001/upload', formData).subscribe({
      next: (response) => {
        console.log(response);
        if (response && Array.isArray(response.codes) && Array.isArray(response.fullData)) {
          this.menuService.setCodes(response.codes);
          this.uploadService.emitCsvDataProcessed(response.fullData);
          this.uploadService.processCsvData(response.fullData); // S'assurer que les données sont passées correctement
        } else {
          console.error('La réponse attendue doit être un objet avec codes et fullData', response);
        }

      },
      error: (error) => {
        console.error('Erreur lors de l\'upload', error);
      }
    });
  }


  public onDeleteClick(): void {
    // Reset the application state and remove file name
    this.stateManagementService.resetState();
    this.fileName = '';
    localStorage.removeItem('uploadedFileName');
  }

  onExportClick(): void {
    const items = JSON.parse(localStorage.getItem('functionsData') || '[]');
    this.exportService.exportToCSV(items, 'modified_data.csv');
  }
  
}



// Dans HeaderComponent
/*  callExportCsv() {
    const items = this.menuService.getMegaMenuItems();
    this.exportService.exportToCSV(items);
  }*/



