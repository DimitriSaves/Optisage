import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import * as Papa from 'papaparse';
import { FileService } from '../file-service.service';
import * as FileSaver from 'file-saver';
import { ElementRef, Renderer2, AfterViewInit, ViewChild } from '@angular/core';
import { tableNames } from './codint';
import axios from 'axios';
import { MatSnackBar } from '@angular/material/snack-bar';


interface MyData {//tabFichier
  FNC_0: string;
  ACS_0: string;
  OPT_0: string;
  PRFCOD_0: string;
  FCYGRUCOD_0: string;
  FCYGRU_0: string;
  deleted?: boolean; // Champ pour indiquer si la ligne est supprimée

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
  styleUrls: ['./tab-page.component.css']
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


  dataSourceAllData: MyData[] = [];

  ngOnInit() {
    // Charger les données du fichier CSV pour dataSourceDroit seulement si elles ne sont pas dans le localStorage
    const tabDroitData = localStorage.getItem('tabDroitData');
    if (tabDroitData) {
      this.originalDroitData = JSON.parse(tabDroitData);
      this.dataSourceDroit = new MatTableDataSource<MyDataRow>(this.originalDroitData);
    } else {
      Papa.parse('assets/fichiercsv/tabDroit3.csv', {
        delimiter: ";",
        download: true,
        header: true,
        complete: (results) => {
          const data = results.data as MyDataRow[];
          this.dataSourceDroit = new MatTableDataSource<MyDataRow>(data);
        }
      });
    }

    // Récupérer les données du localStorage pour dataSource
    const uploadedTableData = localStorage.getItem('uploadedTableData');
    if (uploadedTableData) {
      this.dataSourceAllData = JSON.parse(uploadedTableData);
      this.dataSource = new MatTableDataSource<MyData>(this.dataSourceAllData);
    }
    this.updateFilterValues();
  }

  // à l'intérieur de la fonction applyFilter
  applyFilter() {
    this.dataSource.filter = this.filterValue.trim().toLowerCase();
    this.updateDataSourceDroit();
  }


  updateFilter(column: string, event: Event) {
    const element = event.target as HTMLInputElement;
    this.filterValues[column] = element.value.trim().toLowerCase();
    this.dataSource.filter = JSON.stringify(this.filterValues);
    this.updateDataSourceDroit();
  }

  updateDataSourceDroit() {
    const allFiltersEmpty = Object.values(this.filterValues).every(filterValue => filterValue.trim() === '');

    if (allFiltersEmpty) {
      // Si tous les filtres sont vides, réinitialisez les données
      this.dataSourceDroit.data = this.originalDroitData;
      this.dataSource.data = this.dataSourceAllData;
    } else {
      const filteredData = this.dataSourceAllData.filter(data =>
        Object.keys(this.filterValues).every(column =>
          data[column].trim().toLowerCase().includes(this.filterValues[column])
        )
      );

      const filteredFNC_0s = filteredData.map(data => data.FNC_0);

      // Utilisez originalDroitData au lieu de dataSourceDroit.data
      const matchingDroitRows = this.originalDroitData.filter(data => filteredFNC_0s.includes(data.CODINT_0));

      // Créez une nouvelle liste qui contiendra les lignes filtrées et les lignes vides nécessaires
      let newDataDroit: MyDataRow[] = [];

      matchingDroitRows.forEach(row => {
        // Ajoutez la ligne correspondante de dataSourceDroit
        newDataDroit.push(row);

        // Comptez combien de fois la valeur de CODINT_0 apparaît dans les données filtrées
        const count = filteredData.reduce((sum, data) => data.FNC_0 === row.CODINT_0 ? sum + 1 : sum, 0);

        // Ajoutez le nombre nécessaire de lignes vides
        for (let i = 1; i < count; i++) {
          newDataDroit.push({ CODINT_0: '', FONCTION: '', MENU: '', NUM: '' });
        }
      });

      // Mettez à jour dataSourceDroit avec les nouvelles données
      this.dataSourceDroit.data = newDataDroit;
    }
  }

  updateFilterValues() {
    this.dataSource.filterPredicate = (data: MyData, filter: string) => {
      const filterValues = JSON.parse(filter);
      for (const column in filterValues) {
        if (data[column].trim().toLowerCase().indexOf(filterValues[column]) === -1) {
          return false;
        }
      }
      return true;
    };
  }

  // fonction pour réinitialiser le filtre
  clearFilter() {
    this.filterValues = {};
    this.dataSource.filter = "";
    this.updateDataSourceDroit();  // mise à jour de dataSourceDroit pour réinitialiser les données filtrées
  }


  //dataSource: MatTableDataSource<any> | undefined;

  constructor(private router: Router, private fileService: FileService, private el: ElementRef, private _snackBar: MatSnackBar) {

    this.fileInput = el;
    this.countMap = new Map<string, number>();

  }

  countOccurrences(data: MyData[]): Map<string, number> {
    const map = new Map<string, number>();

    data.forEach(row => {
      if (row.FNC_0) {
        const count = map.get(row.FNC_0);
        if (count !== undefined) {
          map.set(row.FNC_0, count + 1);
        } else {
          map.set(row.FNC_0, 1);
        }
      }
    });

    return map;
  }


  addEmptyRowsToTabDroit(data: MyDataRow[]): MyDataRow[] {
    const newData: MyDataRow[] = [];

    data.forEach(row => {
      newData.push(row);

      const count = this.countMap.get(row.CODINT_0);

      if (count !== undefined) {
        for (let i = 0; i < (count - 1); i++) {
          newData.push({ CODINT_0: '', FONCTION: '', MENU: '', NUM: '' });
        }
      }
    });

    return newData;
  }



  saveTableData() {
    localStorage.setItem('uploadedTableData', JSON.stringify(this.dataSource.data));
  }


  saveTableState() {
    localStorage.setItem('tableState', JSON.stringify(this.files));
  }





  uploadFile(event) {
    let file = event.target.files[0];
    this.importedFileName = file.name;

    Papa.parse<{ FNC_0: string, ACS_0: string, OPT_0: string, PRFCOD_0: any, FCYGRUCOD_0: any, FCYGRU_0: any }>(file, {
      delimiter: ";",
      download: true,
      header: true,
      transformHeader: (header) => {
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
        const emptyRows: { FNC_0: string, ACS_0: string, OPT_0: string, PRFCOD_0: any, FCYGRUCOD_0: any, FCYGRU_0: any }[] = [];
        this.countMap = this.countOccurrences(this.dataSource.data); // Compute countMap here
        this.dataSourceDroit.data = this.addEmptyRowsToTabDroit(this.dataSourceDroit.data); // Use it here
        tableNames.forEach(name => {
          const matchingRows = results.data.filter(row => row.FNC_0 === name);
          if (matchingRows.length > 0) {
            matchingRows.forEach(matchingRow => {
              modifiedData.push({
                FNC_0: matchingRow.FNC_0,
                ACS_0: matchingRow.ACS_0,
                OPT_0: matchingRow.OPT_0,
                PRFCOD_0: matchingRow.PRFCOD_0,
                FCYGRUCOD_0: matchingRow.FCYGRUCOD_0,
                FCYGRU_0: matchingRow.FCYGRU_0
              });
            });

            const emptyRowCount = matchingRows.length - 1; // Calculer le nombre de lignes vides à ajouter
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
        // Compute the count map
        this.countMap = this.countOccurrences(this.dataSource.data);
        // Charger les données du fichier CSV pour dataSourceDroit
        Papa.parse('assets/fichiercsv/tabDroit3.csv', {
          delimiter: ";",
          download: true,
          header: true,
          complete: (resultsDroit) => {
            let dataDroit = resultsDroit.data as MyDataRow[];
            // Compute the count map
            this.countMap = this.countOccurrences(this.dataSource.data);
            // Add empty rows to dataDroit
            dataDroit = this.addEmptyRowsToTabDroit(dataDroit);
            // Update the dataSourceDroit
            this.dataSourceDroit = new MatTableDataSource(dataDroit);

            //  sauvegarder les données de tabDroit dans le localStorage
            localStorage.setItem('tabDroitData', JSON.stringify(dataDroit));
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
                  duration: 3000,
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
    let csv = Papa.unparse(filteredData, { delimiter: ';' }); // Utiliser le point-virgule comme délimiteur
    csv = csv.replace(/"[\s]*"/g, '');
    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    FileSaver.saveAs(blob, this.importedFileName); // utiliser le nom de fichier importé
    // Supprimer le fichier de la base de données
    this.deleteFileFromDatabase(this.importedFileName);
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



  onCellEdit(event, element, field) {
    // sauvegarder l'état précédent
    this.saveTableData();
    const newValue = event.target.textContent;
    element[field] = newValue;

    // Mettre à jour la base de données
    axios
      .post('http://localhost:3001/updateFile', {
        id: element.id, // Assurez-vous que l'élément a un identifiant unique
        field,
        newValue,
      })
      .then((response) => {
        console.log(response.data);
      })
      .catch((error) => {
        console.log(error);
      });
    this.saveTableData();
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




