import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import * as Papa from 'papaparse';
import { FileService } from '../file-service.service';
import * as FileSaver from 'file-saver';
import { ElementRef, Renderer2, AfterViewInit, ViewChild } from '@angular/core';
import { tableNames } from './codint';
import axios from 'axios';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ChangeDetectorRef } from '@angular/core';



interface MyData {//tabFichier
  FNC_0: string;
  ACS_0: string;
  OPT_0: string;
  PRFCOD_0: string;
  FCYGRUCOD_0: string;
  FCYGRU_0: string;
  deleted?: boolean; // Champ pour indiquer si la ligne est supprimée
  editing?: boolean; // Champ pour indiquer si la ligne est en mode d'édition

}

interface MyDataRow { //tabDroit
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
  dataSourceDroit = new MatTableDataSource<MyDataRow>();
  table: any;
  private importedFileName: string | undefined;
  files: any[] = [];
  private countMap: Map<string, number>;
  filterValues: { [key: string]: string } = {};
  filteredDataSourceDroit!: MatTableDataSource<MyDataRow>;
  originalDroitData: MyDataRow[] = [];
  // Définition des noms de colonnes dans l'ordre approprié
  private columnNames = ['FNC_0', 'ACS_0', 'OPT_0', 'PRFCOD_0', 'FCYGRUCOD_0', 'FCYGRU_0'];
  filterValuesDroit: { [key: string]: string } = {};
  emptyRowIndices: number[] = [];

  dataSourceAllData: MyData[] = [];

  //dataSource: MatTableDataSource<any> | undefined;

  constructor(private router: Router,
    private fileService: FileService,
    private el: ElementRef,
    private _snackBar: MatSnackBar,
    private changeDetector: ChangeDetectorRef  // Injectez ChangeDetectorRef
  ) {

    this.fileInput = el;
    this.countMap = new Map<string, number>();

  }




  async uploadFile(event) {
    let file = event.target.files[0];
    this.importedFileName = file.name;

    // Définition des noms de colonnes dans l'ordre approprié
    const columnNames = ['FNC_0', 'ACS_0', 'OPT_0', 'PRFCOD_0', 'FCYGRUCOD_0', 'FCYGRU_0'];

    Papa.parse(file, {
      delimiter: ";",
      download: true,
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as string[][];  // déclaration du type de données
        const modifiedData: MyData[] = [];
        const emptyRows: MyData[] = [];
        this.countMap = this.countOccurrences(this.dataSource.data);
        this.dataSourceDroit.data = this.addEmptyRowsToTabDroit(this.dataSourceDroit.data);
        tableNames.forEach(name => {
          const matchingRows = data.filter(row => row[0] === name); // utilisez 'data' ici
          if (matchingRows.length > 0) {
            matchingRows.forEach(matchingRow => {
              modifiedData.push({
                FNC_0: matchingRow[0],
                ACS_0: matchingRow[1] === '1' ? 'Non' : 'Oui', // conversion ici
                OPT_0: matchingRow[2],
                PRFCOD_0: matchingRow[3],
                FCYGRUCOD_0: this.getFCYGRUCOD_0Value(matchingRow[4]),  // Utilisez getFCYGRUCOD_0Value pour la conversion
                FCYGRU_0: matchingRow[5],
                editing: false  // Ajoutez cette ligne

              });
            });

            const emptyRowCount = matchingRows.length - 1;
            for (let i = 0; i < emptyRowCount; i++) {
              emptyRows.push({
                FNC_0: '',
                ACS_0: '',
                OPT_0: '',
                PRFCOD_0: '',
                FCYGRUCOD_0: '',
                FCYGRU_0: ''
              });
            }
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
        localStorage.setItem('uploadedTableData', JSON.stringify(this.dataSource.data)); // mise à jour du localStorage pour dataSource

        this.countMap = this.countOccurrences(this.dataSource.data);
        Papa.parse('assets/fichiercsv/tabDroit3.csv', {
          delimiter: ";",
          download: true,
          header: true,
          complete: (resultsDroit) => {
            let dataDroit = resultsDroit.data as MyDataRow[];
            this.countMap = this.countOccurrences(this.dataSource.data);
            dataDroit = this.addEmptyRowsToTabDroit(dataDroit);
            this.dataSourceDroit = new MatTableDataSource(dataDroit);
            localStorage.setItem('tabDroitData', JSON.stringify(this.dataSourceDroit.data)); // mise à jour du localStorage pour dataSourceDroit

            localStorage.setItem('tabDroitData', JSON.stringify(dataDroit));

            // Après la création de MatTableDataSource, indiquez à Angular de vérifier les modifications
            this.changeDetector.detectChanges();
          }
        });

        // Vérifier si les données sont déjà dans le localStorage
        const existingData = localStorage.getItem('uploadedTableData');

        // Si les données ne sont pas dans le localStorage, envoyez-les au backend et enregistrez-les dans le localStorage
        if (!existingData) {
          // Ajoutez ces lignes pour enregistrer les données dans le localStorage
          localStorage.setItem('uploadedTableData', JSON.stringify(this.dataSource.data));
          // Envoi du fichier au backend
          const formData = new FormData();
          formData.append('file', file);

          axios.post('http://localhost:3001/upload', formData).then(response => {
            console.log(response.data);

            // Envoi des données traitées et du nom de fichier au backend
            const payload = {
              data: modifiedData,
              filename: this.importedFileName,
            };

            axios.post('http://localhost:3001/uploadFile', payload) // Utilisez la route '/uploadFile'
              .then(response => {
                console.log(response.data);
                // Afficher le message après le succès du téléchargement
                this._snackBar.open('Fichier téléchargé avec succès', 'Fermer', {
                  duration: 8000,
                  panelClass: ['custom-snackbar']
                });

              })
              .catch(error => {
                console.error(error);
              });

          }).catch(error => {
            console.error(error);
          });
          // Enregistrez les données dans le localStorage
          localStorage.setItem('uploadedTableData', JSON.stringify(modifiedData));
        }
      }
    });
  }

  ngOnInit() {
    // Pour dataSourceDroit
    const tabDroitData = localStorage.getItem('tabDroitData');
    if (tabDroitData) {
      this.originalDroitData = JSON.parse(tabDroitData);
      this.dataSourceDroit = new MatTableDataSource<MyDataRow>(this.originalDroitData);
      this.countMap = this.countOccurrences(this.originalDroitData);
    } else {
      Papa.parse('assets/fichiercsv/tabDroit3.csv', {
        // ...
        complete: (results) => {
          const data = results.data as MyDataRow[];
          this.dataSourceDroit = new MatTableDataSource<MyDataRow>(data);
          localStorage.setItem('tabDroitData', JSON.stringify(data)); // Ajoutez cette ligne
          this.countMap = this.countOccurrences(data);
          this.updateFilterValues();
        }
      });
    }

    // Pour dataSource
    const uploadedTableData = localStorage.getItem('uploadedTableData');
    if (uploadedTableData) {
      this.dataSourceAllData = JSON.parse(uploadedTableData);
      this.dataSource = new MatTableDataSource<MyData>(this.dataSourceAllData);
      this.countMap = this.countOccurrences(this.dataSourceAllData);
    } // Pas de 'else' pour cette section car vous n'avez pas de source par défaut pour dataSource

    this.updateFilterValues();
  }



  applyFilter() {
    this.dataSource.filter = this.filterValue.trim().toLowerCase();
    this.updateDataSourceDroit();
  }




  updateDataSource() {
    const allFiltersEmpty = Object.values(this.filterValuesDroit).every(filterValue => filterValue.trim() === '');

    if (allFiltersEmpty) {
      // Si tous les filtres sont vides, réinitialisez les données
      this.dataSource.data = this.dataSourceAllData;
    } else {
      const filteredFNC_0s = this.originalDroitData.filter(data =>
        Object.keys(this.filterValuesDroit).every(column =>
          data[column]?.trim().toLowerCase().includes(this.filterValuesDroit[column])
        )
      ).map(data => data.CODINT_0);

      // Filtrez dataSource en fonction de filteredFNC_0s
      this.dataSource.data = this.dataSourceAllData.filter(data => filteredFNC_0s.includes(data.FNC_0));
    }
  }

  updateDataSourceDroit() {
    const filteredFNC_0s = this.dataSource.filteredData.map(data => data.FNC_0);

    // Pour chaque FNC_0 dans filteredFNC_0s, trouvez la correspondance dans originalDroitData 
    // et ajoutez la ligne et les lignes vides appropriées à filteredData
    let filteredData: MyDataRow[] = [];

    for (let fnc of filteredFNC_0s) {
      // Obtenez la ligne correspondante de originalDroitData
      const matchingRow = this.originalDroitData.find(data => data.CODINT_0 === fnc);
      if (matchingRow) {
        filteredData.push(matchingRow);
      }

      // Ajoutez les lignes vides associées si elles existent dans emptyRowCountMap
      const emptyRowCount = this.emptyRowCountMap[fnc] || 0;
      for (let i = 0; i < emptyRowCount; i++) {
        filteredData.push({ CODINT_0: '', FONCTION: '', MENU: '', NUM: '' });
      }
    }

    this.dataSourceDroit.data = filteredData;
  }







  updateFilter(column: string, event: Event) {
    const element = event.target as HTMLInputElement;
    this.filterValues[column] = element.value.trim().toLowerCase();

    // Mettre à jour le filtre pour dataSource
    this.dataSource.filter = JSON.stringify(this.filterValues);

    // Utilisez updateDataSourceDroit pour mettre à jour dataSourceDroit en fonction des données filtrées de dataSource
    this.updateDataSourceDroit();

    // (Optionnel) Si vous souhaitez sauvegarder l'information sur les indices de lignes vides
    localStorage.setItem('emptyRowIndices', JSON.stringify(this.emptyRowIndices));
  }



  updateFilterDroit(column: string, event: Event) {
    const element = event.target as HTMLInputElement;
    this.filterValuesDroit[column] = element.value.trim().toLowerCase();

    // Mise à jour du filtre pour dataSourceDroit et dataSource
    this.dataSourceDroit.filter = JSON.stringify(this.filterValuesDroit);
    this.dataSource.filter = JSON.stringify(this.filterValuesDroit);

    // Filtrer les données pour dataSource en fonction des occurrences
    const countMap = this.countOccurrences(this.dataSource.data);
    this.updateDataSource();
    localStorage.setItem('emptyRowIndices', JSON.stringify(this.emptyRowIndices));

  }

  rebuildEmptyRowCountMap() {
    this.emptyRowCountMap = {};
    this.dataSourceDroit.data.forEach(row => {
      if (row.CODINT_0) {
        if (this.emptyRowCountMap[row.CODINT_0]) {
          this.emptyRowCountMap[row.CODINT_0]++;
        } else {
          this.emptyRowCountMap[row.CODINT_0] = 1;
        }
      }
    });
  }



  repopulateEmptyRows() {
    // Parcourir le emptyRowCountMap pour ajouter les lignes vides
    for (const key in this.emptyRowCountMap) {
      const rowCount = this.emptyRowCountMap[key];
      for (let i = 0; i < rowCount; i++) {
        this.dataSourceDroit.data.push({ CODINT_0: '', FONCTION: '', MENU: '', NUM: '' });
      }
    }

    // Cette ligne s'assure que les modifications apportées à dataSourceDroit.data sont reflétées dans l'affichage
    this.dataSourceDroit.data = [...this.dataSourceDroit.data];
  }


  loadTableData() {
    const data = JSON.parse(localStorage.getItem('uploadedTableData') || '[]');
    if (data && Array.isArray(data)) {
      this.dataSource.data = data;
      this.repopulateEmptyRows();  // repopuler les lignes vides après avoir chargé les données
    }
  }







  updateFilterValues() {
    this.dataSource.filterPredicate = (data: MyData, filter: string) => {
      const filterValues = JSON.parse(filter);
      for (const column in filterValues) {
        if (data[column]?.trim().toLowerCase().indexOf(filterValues[column]) === -1) {
          return false;
        }
      }
      return true;
    };
    this.dataSourceDroit.filterPredicate = (data: MyDataRow, filter: string) => {
      // Si la ligne est vide (tous les champs sont vides), toujours renvoyer true
      if (Object.values(data).every(value => value === '')) {
        return true;
      }
      const filterValues = JSON.parse(filter);
      for (const column in filterValues) {
        if (data[column]?.trim().toLowerCase().indexOf(filterValues[column]) === -1) {
          return false;
        }
      }
      return true;
    };
    localStorage.setItem('emptyRowIndices', JSON.stringify(this.emptyRowIndices));

  }



  clearFilter() {
    this.filterValues = {};
    this.dataSource.filter = "";
    // mise à jour de dataSourceDroit pour réinitialiser les données filtrées
    const countMap = this.countOccurrencesDroit(this.dataSourceDroit.data);
    this.updateDataSourceDroit();
    localStorage.setItem('emptyRowIndices', JSON.stringify(this.emptyRowIndices));

  }




  countOccurrences(data: MyData[] | MyDataRow[]): Map<string, number> {
    const map = new Map<string, number>();

    data.forEach(row => {
      let valueToCount: string = '';

      if ('FNC_0' in row) {
        valueToCount = row.FNC_0;
      } else if ('CODINT_0' in row) {
        valueToCount = row.CODINT_0;
      }

      if (valueToCount) {
        const count = map.get(valueToCount);
        if (count !== undefined) {
          map.set(valueToCount, count + 1);
        } else {
          map.set(valueToCount, 1);
        }
      }
    });

    return map;
  }




  countOccurrencesDroit(data: MyDataRow[]): Map<string, number> {
    const map = new Map<string, number>();

    data.forEach(row => {
      // Vérifiez que row n'est pas undefined avant d'essayer d'y accéder
      if (row && row.CODINT_0) {
        const count = map.get(row.CODINT_0);
        if (count !== undefined) {
          map.set(row.CODINT_0, count + 1);
        } else {
          map.set(row.CODINT_0, 1);
        }
      }
    });

    return map;
  }

  emptyRowCountMap: { [key: string]: number } = {};

  addEmptyRowsToTabDroit(data: MyDataRow[]): MyDataRow[] {
    const newData: MyDataRow[] = [];

    data.forEach(row => {
      newData.push(row);

      const count = this.countMap.get(row.CODINT_0);

      if (count !== undefined) {
        for (let i = 0; i < (count - 1); i++) {
          newData.push({ CODINT_0: '', FONCTION: '', MENU: '', NUM: '' });

          // Incrémentez le compteur pour cette valeur de CODINT_0
          if (this.emptyRowCountMap[row.CODINT_0]) {
            this.emptyRowCountMap[row.CODINT_0]++;
          } else {
            this.emptyRowCountMap[row.CODINT_0] = 1;
          }

          // Ajoutez l'index de la ligne vide à une liste dédiée
          this.emptyRowIndices.push(newData.length - 1);
        }
      }
    });

    return newData;
  }



  saveTableData() {
    // inclut toutes les données
    localStorage.setItem('emptyRowIndices', JSON.stringify(this.emptyRowIndices));
  }


  saveTableState() {
    localStorage.setItem('tableState', JSON.stringify(this.files));
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
  currentlyEditingElement: MyData | null = null;


  exportFile() {
    // créer une copie de la liste de données
    let dataCopy = this.dataSource.data.slice();

    // filtrer les lignes supprimées et nettoyer les données
    let filteredData = dataCopy
      .filter((row) => {
        // Ignorer la ligne si elle est supprimée
        if (row['deleted']) {
          return false;
        }

        // Ignorer la ligne si toutes les valeurs sont vides (à l'exception de ACS_0 pouvant être '2')
        let isEmpty = true;
        for (let key in row) {
          if ((key !== 'ACS_0' || row[key] !== '2') && row[key] !== '') {
            isEmpty = false;
            break;
          }
        }

        return !isEmpty;
      })
      .map((row) => {
        let hasData = Object.entries(row).some(([key, value]) => key !== 'ACS_0' && value !== '' && value !== null);

        console.log('Original value:', row.FCYGRUCOD_0);

        let FCYGRUCOD_0_code = '';
        if (row.FCYGRUCOD_0 === 'Regroup') FCYGRUCOD_0_code = '1';
        else if (row.FCYGRUCOD_0 === 'Site') FCYGRUCOD_0_code = '2';
        else if (row.FCYGRUCOD_0 === '-') FCYGRUCOD_0_code = '0';
        else FCYGRUCOD_0_code = row.FCYGRUCOD_0; // Utilisez la valeur originale si elle n'est pas 'Regroup', 'Site', ou '-'

        console.log('Transformed value:', FCYGRUCOD_0_code);


        let transformedRow: {
          [key: string]: string;
        } & MyData = {
          M: hasData ? 'M' : '',
          FNC_0: row.FNC_0 || '',
          ACS_0: row.ACS_0 === 'Non' ? '1' : row.ACS_0 === 'Oui' ? '2' : '',
          OPT_0: row.OPT_0 || '',
          PRFCOD_0: row.PRFCOD_0 || '',
          FCYGRUCOD_0: FCYGRUCOD_0_code || '', // Utilisez la valeur convertie
          FCYGRU_0: row.FCYGRU_0 || '',
        };
        return transformedRow;
      });

    // créer le fichier CSV et le télécharger
    let csv = Papa.unparse(filteredData, { delimiter: ';' }).replace(/"/g, "");
    csv = csv.replace(/"[\s]*"/g, '');

    // Enlevez la première ligne (noms des colonnes)
    let csvArray = csv.split('\n');
    csvArray.shift();  // supprime la première ligne
    csv = csvArray.join('\n');

    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    FileSaver.saveAs(blob, this.importedFileName);

    // Supprimer le fichier de la base de données
    this.deleteFileFromDatabase(this.importedFileName);
    localStorage.setItem('emptyRowIndices', JSON.stringify(this.emptyRowIndices));

  }



  onCellEdit(event, element, field) {
    let newValue;

    // Si le champ est ACS_0 ou FCYGRUCOD_0, obtenir la valeur de l'option sélectionnée
    if (field === 'ACS_0' || field === 'FCYGRUCOD_0') {
      newValue = event.target.value;
    } else {
      // sinon obtenir le contenu textuel comme avant
      newValue = event.target.textContent;
    }

    // Vérifiez si la nouvelle valeur est différente de l'ancienne avant de la sauvegarder
    if (newValue !== element[field]) {
      element[field] = newValue;

      axios
        .post('http://localhost:3001/updateFile', {
          field,
          newValue,
        })
        .then((response) => {
          console.log(response.data);
        })
        .catch((error) => {
          console.log(error);
        });
    }

    this.saveTableData();
  }



  getFCYGRUCOD_0Value(code: string): string {
    switch (code) {
      case '0':
        return '-';
      case '1':
        return 'Regroup';
      case '2':
        return 'Site';
      default:
        return code; // si le code n'est pas '0', '1', ou '2', retourner la valeur initiale
    }
  }



  deleteFileFromDatabase(filename) {
    axios
      .post('http://localhost:3001/deleteFile', { filename })
      .then((response) => {
        console.log('File deleted from database:', response.data);
        // Mettre à jour les fichiers locaux et les données affichées si nécessaire
        this.getFiles();
      })
      .catch((error) => {
        console.log('Error deleting file from database:', error);
      });
  }


  clearImportedData() {
    console.log("La méthode clearImportedData a été appelée.");

    // Vider le tableau dataSource
    this.dataSource.data = [];

    // Supprimer les données du localStorage
    localStorage.removeItem('uploadedTableData');

    // Vider le tableau dataSourceDroit
    this.dataSourceDroit.data = [];

    // Supprimer les données modifiées de tabDroit du localStorage
    localStorage.removeItem('tabDroitData');

    // Recharger les données originales de tabDroit à partir du fichier CSV
    Papa.parse('assets/fichiercsv/tabDroit3.csv', {
      delimiter: ";",
      download: true,
      header: true,
      complete: (results) => {
        const data = results.data as MyDataRow[];
        this.dataSourceDroit = new MatTableDataSource(data);
      }
    });
  }






  getFiles() {
    const tableState = localStorage.getItem('tableState');
    if (tableState) {
      this.files = JSON.parse(tableState);
    } else {
      axios
        .get('http://localhost:3001/getFiles')
        .then((response) => {
          console.log(response.data);
          this.files = response.data;
          this.saveTableData();
        })
        .catch((error) => {
          console.log(error);
        });
    }
  }






  deleteRow(element: any): void {
    // sauvegarder l'état précédent
    this.saveTableData();

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

    // Supprimer l'élément de la base de données
    axios
      .post('http://localhost:3001/deleteFile', {
        id: element.id, // Assurez-vous que l'élément a un identifiant unique
      })
      .then((response) => {
        console.log(response.data);
      })
      .catch((error) => {
        console.log(error);
      });
    this.saveTableData();

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
    // sauvegarder l'état précédent
    this.saveTableData();
    const index = this.dataSource.data.indexOf(element);
    if (index >= 0) {
      const emptyElement: MyData = { isNew: true, ACS_0: 'Non', FCYGRUCOD_0: '-' } as unknown as MyData;
      for (const prop in element) {
        if (element.hasOwnProperty(prop) && prop !== 'ACS_0' && prop !== 'FCYGRUCOD_0') {  // Exclude ACS_0 and FCYGRUCOD_0 from this loop
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
    //sauvegarder les données après l'ajout d'une nouvelle ligne
    this.saveTableData();
  }


  removeRow(element: MyData): void {
    // sauvegarder l'état précédent
    this.saveTableData();

    const index = this.dataSource.data.indexOf(element);
    if (index >= 0) {
      this.dataSource.data.splice(index, 1);
      this.dataSource._updateChangeSubscription();

      // Trouver la ligne correspondante dans dataSourceDroit et la supprimer
      const matchingRow = this.dataSourceDroit.data.find((row: MyDataRow) => row.CODINT_0 === element.FNC_0);
      if (matchingRow) {
        const matchingRowIndex = this.dataSourceDroit.data.indexOf(matchingRow);
        this.dataSourceDroit.data.splice(matchingRowIndex, 1);
        this.dataSourceDroit._updateChangeSubscription();
      }
    }
    //sauvegarder les données après la suppression d'une ligne
    this.saveTableData();
  }



  ngAfterViewInit(): void {
    const table1Container = document.getElementById("table1-container") as HTMLElement;
    const table2Container = document.getElementById("table2-container") as HTMLElement;

    if (table1Container && table2Container) {
      table1Container.addEventListener("scroll", () => {
        table2Container.scrollTop = table1Container.scrollTop;
      });

      table2Container.addEventListener("scroll", () => {
        table1Container.scrollTop = table2Container.scrollTop;
      });
    }

    // Ajouter cette partie pour vérifier si `this.table` et `this.table.dataSource` sont définis
    if (this.table && this.table.dataSource) {
      this.table.dataSource.connect().subscribe(() => {
        this.saveTableData();
      });
    }
  }


  // Ajoutez cette variable pour stocker temporairement les données de la ligne copiée
  copiedRow: any;

  // Méthode pour copier les données de la ligne sélectionnée, sauf la propriété FNC_0
  copyRow(rowData: any) {
    // sauvegarder l'état précédent
    this.saveTableData();
    this.copiedRow = Object.assign({}, rowData);
    delete this.copiedRow.FNC_0; // Supprime la propriété FNC_0 de l'objet copié
  }

  // Méthode pour coller les données stockées dans la variable dans la ligne sélectionnée
  pasteRow(rowData: any) {
    // sauvegarder l'état précédent
    this.saveTableData();
    if (this.copiedRow) {
      const index = this.dataSource.data.indexOf(rowData);
      this.dataSource.data[index] = Object.assign({}, rowData, this.copiedRow);
      this.dataSource.data = [...this.dataSource.data]; // Force la mise à jour de la vue
    }
  }


}