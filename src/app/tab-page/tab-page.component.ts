import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import * as Papa from 'papaparse';
import { FileService } from '../file-service.service';
import { DatatableComponent } from '@swimlane/ngx-datatable';
import * as FileSaver from 'file-saver';
import { ElementRef } from '@angular/core';
import { tableNames } from './codint';

interface MyData {
  FNC_0: string;
  ACS_0: string;
  OPT_0: string;
  PRFCOD_0: string;
  FCYGRUCOD_0: string;
  FCYGRU_0: string;
  deleted?: boolean; // Champ pour indiquer si la ligne est supprimée

}

interface MyDataRow {
  CODINT_0: string;
  FONCTION: string;
  MENU: string;
  NUM: string;
}

@Component({
  selector: 'app-tab-page',
  templateUrl: './tab-page.component.html',
  styleUrls: ['./tab-page.component.scss']
})



export class TabPageComponent implements OnInit {
  displayedColumns1 = ['FNC_0', 'ACS_0', 'OPT_0', 'PRFCOD_0', 'FCYGRUCOD_0', 'FCYGRU_0', 'delete'];
  displayedColumns2 = ['MENU', 'CODINT_0', 'FONCTION', 'NUM'];
  filterValue!: string;
  fileInput: ElementRef;
  modifiedData: any[] = [];
  savedStates: any[] = [];
  dataSource = new MatTableDataSource<MyData>();
  dataSourceDroit = new MatTableDataSource();
  table: any;
  private importedFileName: string | undefined;


  applyFilter() {
    // utilisez la méthode filter de l'objet MatTableDataSource pour filtrer les données
    this.dataSource.filter = this.filterValue.trim().toLowerCase();
  }





  //dataSource: MatTableDataSource<any> | undefined;

  constructor(private router: Router, private fileService: FileService, private el: ElementRef) {

    this.fileInput = el;

  }


  uploadFile(event) {
    let file = event.target.files[0];
    // stocker le nom du fichier dans la variable
    this.importedFileName = file.name; // stocker le nom de fichier dans une variable
    Papa.parse<{ FNC_0: string, ACS_0: string, OPT_0: string, PRFCOD_0: any, FCYGRUCOD_0: any, FCYGRU_0: any }>(file, {
      delimiter: ";",
      download: true,
      header: true,
      transformHeader: (header) => {
        // mapping des noms de colonnes
        switch (header) {
          case 'FNC_0':
            return 'FNC_0';
          case 'ACS_0':
            return 'ACS_0';
          case 'OPT_0':
            return 'OPT_0';
          case 'PRFCOD_0':
            return 'PRFCOD_0';
          case 'FCYGRUCOD':
            return 'FCYGRUCOD_0';
          case 'FCYGRU':
            return 'FCYGRU_0';
          default:
            return header;
        }
      },
      complete: (results) => {
        const modifiedData: { FNC_0: string, ACS_0: string, OPT_0: string, PRFCOD_0: any, FCYGRUCOD_0: any, FCYGRU_0: any }[] = [];

        tableNames.forEach(name => {
          const matchingRow = results.data.find(row => row.FNC_0 === name);
          if (matchingRow) {
            modifiedData.push({
              FNC_0: matchingRow.FNC_0,
              ACS_0: matchingRow.ACS_0,
              OPT_0: matchingRow.OPT_0,
              PRFCOD_0: matchingRow.PRFCOD_0,
              FCYGRUCOD_0: matchingRow.FCYGRUCOD_0,
              FCYGRU_0: matchingRow.FCYGRU_0
            });
          } else {
            modifiedData.push({
              FNC_0: '',
              ACS_0: '',
              OPT_0: '',
              PRFCOD_0: '',
              FCYGRUCOD_0: '',
              FCYGRU_0: ''
            });
          }
        });

        this.dataSource = new MatTableDataSource(modifiedData);

      }
    });
  }
  getColorClass(row: MyData): string {
    const matchingRow = this.dataSourceDroit.data.find((droitRow: any) => droitRow.CODINT_0 === row.FNC_0);
    if (matchingRow && 'NUM' in matchingRow) {
      const droitDataRow = matchingRow as MyDataRow;
      switch (droitDataRow.NUM) {
        case '1':
          return 'ligne-noir';
        case '2':
          return 'ligne-grisFonce';
        case '3':
          return 'ligne-grisclair';
        case '4':
          return 'ligne-grisfaible';
        default:
          return 'ligne-blanche';
      }
    } else {
      // Si pas de correspondance, la première ligne est 'ligne-noir'
      const index = this.dataSource.filteredData.indexOf(row);
      if (index === 0) {
        return 'ligne-noir';
      } else {
        return 'ligne-blanche';
      }
    }
  }


  exportFile() {
    // créer une copie de la liste de données
    let dataCopy = this.dataSource.data.slice();

    // filtrer les lignes supprimées et nettoyer les données
    let filteredData = dataCopy
      .filter((row) => !row['deleted'])
      .map((row, index) => {
        let hasData = Object.values(row).some((value) => value !== '' && value !== null);
        let transformedRow: {
          [key: string]: string;
        } & MyData = {
          M: index === 0 ? '' : hasData ? 'M' : '',
          FNC_0: row.FNC_0 || '',
          ACS_0: row.ACS_0 || '',
          OPT_0: row.OPT_0 || '',
          PRFCOD_0: row.PRFCOD_0 || '',
          FCYGRUCOD_0: row.FCYGRUCOD_0 || '',
          FCYGRU_0: row.FCYGRU_0 || '',
        };
        return transformedRow;
      });

    // Supprimer les lignes vides qui ont toutes les cellules vides
    filteredData = filteredData.filter((row) => {
      return Object.values(row).some((value) => value !== '');
    });

    // créer le fichier CSV et le télécharger
    let csv = Papa.unparse(filteredData);
    csv = csv.replace(/"[\s]*"/g, '');
    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    FileSaver.saveAs(blob, this.importedFileName); // utiliser le nom de fichier importé
  }





  ngOnInit() {

    Papa.parse('assets/fichiercsv/tabDroit3.csv', {
      delimiter: ";",
      download: true,
      header: true,
      complete: (results) => {
        this.dataSourceDroit = new MatTableDataSource(results.data);
      }
    });


  }
  onCellEdit(event, element, field) {
    // sauvegarder l'état précédent
    this.saveState();

    const newValue = event.target.textContent;
    element[field] = newValue;
  }
  saveState() {
    // sauvegarder l'état précédent dans le tableau de sauvegarde
    this.savedStates.push(JSON.parse(JSON.stringify(this.dataSource.data)));
  }





  deleteRow(element: any): void {
    // sauvegarder l'état précédent
    this.saveState();

    const index = this.dataSource.data.indexOf(element);
    if (index >= 0) {
      const emptyElement = {} as MyData;
      for (const prop in element) {
        if (element.hasOwnProperty(prop)) {
          emptyElement[prop] = '';
        }
      }
      this.dataSource.data[index] = emptyElement;
      this.dataSource.data[index]['deleted'] = true;

      // Ajouter une classe CSS pour la ligne supprimée
      const row = this.table?.nativeElement?.querySelector(`[data-index="${index}"]`);
      if (row) {
        row.classList.add('deleted-row');
      }

      // Mettre à jour la souscription aux changements pour que la modification soit prise en compte
      this.dataSource._updateChangeSubscription();
    }
  }


  undo2(): void {
    // Trouver la dernière ligne supprimée et la réinsérer dans la liste de données
    const deletedIndex = this.dataSource.data.findIndex((element) => element.deleted);
    if (deletedIndex >= 0) {
      const deletedElement = this.dataSource.data[deletedIndex];
      this.dataSource.data.splice(deletedIndex, 1);
      deletedElement.deleted = false;
      this.dataSource.data.push(deletedElement);
      this.dataSource._updateChangeSubscription();
    }
  }

  undo() {
    if (this.savedStates.length > 0) {
      // restaurer l'état précédent
      this.dataSource.data = this.savedStates.pop();
      this.dataSource._updateChangeSubscription();
    }
  }

  addRow(element: any): void {
    const index = this.dataSource.data.indexOf(element);
    if (index >= 0) {
      const emptyElement: MyData = { isNew: true } as unknown as MyData;
      for (const prop in element) {
        if (element.hasOwnProperty(prop)) {
          emptyElement[prop] = '';
        }
      }
      this.dataSource.data.splice(index + 1, 0, emptyElement);
      this.dataSource._updateChangeSubscription();

      // Find matching row in dataSourceDroit
      const matchingRow = this.dataSourceDroit.data.find(row => (row as MyDataRow).CODINT_0 === element.FNC_0) as MyDataRow;
      if (matchingRow) {
        const emptyRow: MyDataRow = { CODINT_0: '', FONCTION: '', MENU: '', NUM: '' };
        this.dataSourceDroit.data.splice(this.dataSourceDroit.data.indexOf(matchingRow) + 1, 0, emptyRow);
        this.dataSourceDroit._updateChangeSubscription();
      }
    }
  }

  removeRow(element: any): void {
    const index = this.dataSource.data.indexOf(element);
    if (index >= 0) {
      this.dataSource.data.splice(index, 1);
      this.dataSource._updateChangeSubscription();

      // Find matching row in dataSourceDroit
      const matchingRow = this.dataSourceDroit.data.find(row => (row as MyDataRow).CODINT_0 === element.FNC_0) as MyDataRow;
      if (matchingRow) {
        this.dataSourceDroit.data.splice(this.dataSourceDroit.data.indexOf(matchingRow), 1);
        this.dataSourceDroit._updateChangeSubscription();
      }
    }
  }



}
