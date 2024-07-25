import { Component, OnDestroy, OnInit } from '@angular/core';
import { MegaMenuItem, MenuItem, SelectItem } from 'primeng/api';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { UploadService } from '../header/upload.service'; // Assurez-vous que le chemin est correct
import { MenuService } from './menu.service';
import { StateManagementService } from '../header/state-management.service';
import { Subscription } from 'rxjs';
import { ConfigService } from './config.service';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { FileStateService } from '../header/file-state.service';
import { MultiSelectModule } from 'primeng/multiselect';
import { ChangeDetectorRef } from '@angular/core';
import { ExportService } from '../header/export.service'; // Importer ExportService


interface ExtendedMenuItem extends MenuItem {
  code?: string;
  items?: ExtendedMenuItem[];  // Utiliser ExtendedMenuItem récursivement pour les sous-items
}

interface ExtendedMegaMenuItem extends MegaMenuItem {
  code?: string;
  items?: ExtendedMenuItem[][];  // Assurez-vous que cette structure correspond à ce que PrimeNG attend
}


@Component({
  selector: 'app-app-sage2',
  templateUrl: './app-sage2.component.html',
  styleUrls: ['./app-sage2.component.scss'],
})

export class AppSage2Component implements OnInit, OnDestroy {
  horizontal: boolean = true; // Ajoutez cette ligne pour définir la propriété
  mainMenuItems!: MenuItem[];       // Pour Menubar
  // megaMenuItems!: MegaMenuItem[];   // Pour MegaMenu
  showUtilitairesSubMenu: boolean = false;
  showGestionTaxesSubMenu: boolean = false;
  showDeclarationEchangeBienTaxesSubMenu: boolean = false;
  showAutresDeclarationsSubMenu: boolean = false;
  showAuditSubMenu: boolean = false;
  menuItemsLoaded = false; // Indicateur pour le chargement des items du menu
  megaMenuItems: { [key: string]: MegaMenuItem[] } = {};
  currentMainMenu: string | null = null;
  // Au lieu de null, initialisez avec un tableau vide
  displayedMegaMenuItems: MegaMenuItem[] = [];
  private resetSubscription: Subscription = new Subscription();
  dialogRef!: DynamicDialogRef;
  displayDialog: boolean = false;
  selectedItemData: any;
  categories: any[] = [];
  functions: any[] = [];
  sousFunctions: any[] = [];
  originalItemData = { function: '', status: '', profileCode: '', access: '', sites: '', types: '', options: '' };
  isFileImported: boolean = false;
  selectedItemLabel: string = '';
  showError: boolean = false;
  private subscriptions = new Subscription();

  constructor(  private changeDetectorRef: ChangeDetectorRef ,private uploadService: UploadService, private menuService: MenuService, private stateManagementService: StateManagementService, private configService: ConfigService,
    private dialogService: DialogService, private fileStateService: FileStateService,private exportService: ExportService) {}


  isArray(value: any): boolean {
    return Array.isArray(value);
  }
  
 

 

  ngOnInit() {
    this.resetSubscription = this.stateManagementService.resetState$.subscribe(() => {
      this.updateDisplayedMegaMenuItems();
    });
  
    this.fileStateService.currentFileName.subscribe((fileName) => {
      this.isFileImported = !!fileName;
      this.updateDisplayedMegaMenuItems();

      // Définir le nom du fichier d'import dans le ExportService
      if (fileName) {
        this.exportService.setImportFileName(fileName);
      }
    });
  
    this.subscriptions.add(this.fileStateService.currentFileName.subscribe(fileName => {
      this.isFileImported = !!fileName;
    }));
  
    this.restoreFunctionData();
    this.initializeAllMenus();
  
    const menus = ['Développement', 'Paramétrage', 'Données de base', 'Relation client', 'Affaires', 'Achats', 'Ventes', 'Stocks', 'Production', 'Contrôle de gestion', 'Comptabilité', 'Comptabilité tiers', 'Déclarations', 'Immobilisations', 'Terminaux portables', 'Exploitation', 'Impressions', 'Traductions', 'Pages en lecture seule', 'EDI', '4CAD Gestion de la qualité', '4CAD Gestion des moyens', '4CAD Gestion des habilitations', '4CAD Devis technique', '4CAD Suivi atelier'];
  
    this.mainMenuItems = menus.map(menu => ({
      label: menu,
      command: (event) => {
        this.selectMainMenu(menu);
      }
    }));
  
    this.uploadService.csvDataProcessed$.subscribe(fullData => {
      if (!Array.isArray(fullData)) {
        console.error('Les données importées ne sont pas un tableau:', fullData);
        return;
      }
  
      const functionCodes = fullData.map(data => data.function);
      this.compareCodesWithMenus(functionCodes);
  
      // Stocker les données importées dans le localStorage
      fullData.forEach(data => {
        if (!data.id) {
          data.id = this.generateUniqueId();
        }
        
        const existingData = this.configService.getFunctionData(data.function) || [];
        existingData.push(data);
        this.configService.storeFunctionData(data.function, existingData);
      });
    });
  
    this.menuService.menuUpdate$.subscribe(() => {
      this.initializeAllMenus();
    });
  
  }
  
  onExportClick() {
    this.exportService.exportToCSV();
  }
  


  generateUniqueId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  saveChanges() {
    if (this.selectedItemData && this.selectedItemData.length > 0) {
      const functionCode = this.selectedItemData[0].function;
  
      // Récupérer les données existantes
      let existingData = this.configService.getFunctionData(functionCode) || [];
      if (!Array.isArray(existingData)) {
        existingData = [existingData];
      }
  
      // Filtrer les configurations par défaut non modifiées
      existingData = existingData.filter(config => !(config.isNew && this.isConfigEmpty(config)));
  
      // Mettre à jour les configurations existantes avec les nouvelles données
      this.selectedItemData.forEach((newConfig: any) => {
        if (Object.keys(newConfig).length === 0) {
          return; // Ignorer les configurations vides
        }
  
        const index = existingData.findIndex((config: any) =>
          config.profileCode === newConfig.profileCode &&
          config.sites === newConfig.sites &&
          config.function === newConfig.function
        );
  
        if (index === -1) {
          existingData.push(newConfig); // Ajouter la nouvelle configuration sans écraser
        } else {
          existingData[index] = { ...existingData[index], ...newConfig };
        }
      });
  
      // Sauvegarder les données mises à jour
      this.configService.storeFunctionData(functionCode, existingData);
  
      // Mettre à jour le localStorage globalement
      let functionsData = JSON.parse(localStorage.getItem('functionsData') || '[]');
      functionsData = functionsData.filter((item: any) => item.function !== functionCode);
      functionsData.push(...existingData);
  
      localStorage.setItem('functionsData', JSON.stringify(functionsData));
      this.displayDialog = false;
    } else {
      console.error("Erreur: Données non disponibles pour l'enregistrement.");
    }
  }
  
  isConfigEmpty(config: any): boolean {
    return !config.profileCode && !config.access && !config.sites && !config.types && !config.options;
  }
  
  
  
  




  restoreFunctionData() {
    const storedData = JSON.parse(localStorage.getItem('functionsData') || '[]');
    storedData.forEach((item: any) => {
      this.configService.storeFunctionData(item.function, item);
    });
  }


  compareCodesWithMenus(codesFromCSV: string[], autoOpenDetails: boolean = false): void {
    const checkItems = (items: ExtendedMenuItem[] | undefined) => {
      if (!items) return;

      items.forEach(item => {
        const isPresent = codesFromCSV.includes(item.code || '');
        const status = isPresent ? 'present' : 'absent';
        item['class'] = isPresent ? 'green-text' : 'red-text';
        sessionStorage.setItem(item.code || '', status);

        // Modifier ici pour contrôler l'ouverture automatique
        if (isPresent && item['type'] === 'fonction' && item.code && autoOpenDetails) {
          this.openFunctionDetails(item.code, item.label || "Label par défaut");
        }

        if (item.items) {
          checkItems(item.items);
        }
      });
    };

    // Appliquer aux menus principaux
    Object.values(this.megaMenuItems).forEach(menuItems => {
      menuItems.forEach(megaMenuItem => {
        const extendedMegaMenu = megaMenuItem as ExtendedMegaMenuItem;
        extendedMegaMenu.items?.forEach(itemRow => {
          checkItems(itemRow as ExtendedMenuItem[]);
        });
      });
    });

    // Appliquer aux menus ajoutés spécifiquement
    [
      this.utilitairesSubMenuItems,
      this.gestionTaxesSubMenuItems,
      this.declarationEchangeBienTaxesSubMenuItems,
      this.AutresDeclarations,
      this.Audit
    ].forEach(menuGroup => {
      menuGroup.forEach(menuItem => {
        if (menuItem.items) {
          checkItems(menuItem.items);
        }
      });
    });

    this.updateDisplayedMegaMenuItems(); // Mise à jour de l'affichage après toutes les modifications
}


  
  
openFunctionDetails(code: string, label: string): void {
  if (!code) {
    console.error('Aucun code fourni pour la fonction, impossible d\'ouvrir les détails.');
    return;
  }

  // Récupération de l'état de la fonction.
  const status = sessionStorage.getItem(code);
  if (status === 'absent') {
    console.error(`La fonction ${code} est marquée comme supprimée, impossible d'ouvrir le dialogue.`);
    return;
  }

  // Récupération et validation des données de configuration.
  let data = this.configService.getFunctionData(code);

  // Si les données sont vides, initialisez avec des champs vides
  if (!data || data.length === 0) {
    console.log(`Aucune donnée de configuration trouvée pour ${code}, ouverture d'un popup vide.`);
    this.selectedItemData = [{
      function: code,
      profileCode: '',
      access: '',
      sites: '',
      types: '',
      options: ''
    }];
  } else {
    // Assurez-vous que les données sont bien formées pour l'affichage.
    if (!Array.isArray(data)) {
      data = [data]; // Transformez les données en array si nécessaire.
    }

    // Préparation des données pour le dialogue sans doublons
    this.selectedItemData = [...new Map(data.map(item => [item.profileCode + item.sites, item])).values()];
  }

  this.originalItemData = JSON.parse(JSON.stringify(this.selectedItemData));
  this.selectedItemLabel = label;
  this.displayDialog = true;
}

shouldDisableOptions(): boolean {
  return this.selectedItemData && this.selectedItemData[0] && this.selectedItemData[0].access === '1';
}




  cancelChanges() {
    if (this.originalItemData && Array.isArray(this.originalItemData) && this.originalItemData.length) {
      this.selectedItemData = JSON.parse(JSON.stringify(this.originalItemData));
      this.displayDialog = false;
    } else {
      console.error('Données originales invalides ou inexistantes');
      this.displayDialog = false;
    }
  }


  getMenuKeys(): string[] {
    return Object.keys(this.megaMenuItems);
  }

 




  closeDialog() {
    this.displayDialog = false;
  }



  removeConfiguration(index: number) {
    if (this.selectedItemData.length > 1) {
      this.selectedItemData.splice(index, 1);
    } else {
      console.error("At least one configuration must remain.");
    }
  }


  toggleRed(event: Event, code: string): void {
    event.stopPropagation();
    const currentState = localStorage.getItem(code) || 'absent';
    const newState = currentState === 'absent' ? 'present' : 'absent';
    localStorage.setItem(code, newState);
    // Mettre à jour l'affichage
    const button = event.target as HTMLElement;
    button.classList.toggle('red-text', newState === 'absent');
    button.classList.toggle('green-text', newState === 'present');
    this.updateDisplayedMegaMenuItems();
  }


  toggleStatus(event: MouseEvent, code: string | undefined): void {
    if (!code) return;
  
    event.stopPropagation();
  
    const currentState = sessionStorage.getItem(code) || 'unknown';
    let newState;
  
    switch (currentState) {
      case 'present':
        newState = 'absent';
        break;
      case 'absent':
        newState = 'present';
        break;
      default:
        newState = 'present';
        break;
    }
  
    sessionStorage.setItem(code, newState);
  
    // Si la fonction devient "présente" (bouton vert), assurez-vous qu'elle peut être modifiée
    if (newState === 'present') {
      let existingData = this.configService.getFunctionData(code);
      if (!existingData || existingData.length === 0) {
        existingData = [{
          function: code,
          profileCode: '',
          access: '',
          sites: '',
          types: '',
          options: '',
          isNew: true // Marquer comme nouvelle configuration
        }];
        this.configService.storeFunctionData(code, existingData);
      }
    }
  
    this.updateDisplayedMegaMenuItems();
  }
  
  toggleFunctionState(code: string): void {
    const currentStatus = sessionStorage.getItem(code) || 'unknown';
    const newState = currentStatus === 'present' ? 'absent' : 'present';
    sessionStorage.setItem(code, newState);

    // Update UI or other elements as necessary
    this.updateDisplayedMegaMenuItems();

    // Optionally update stored data in ConfigService if needed
    let functionData = this.configService.getFunctionData(code);
    if (functionData) {
      functionData.forEach((config: any) => {
        config.status = newState; // Assuming there's a status field
      });
      this.configService.storeFunctionData(code, functionData);
    }
  }





  addConfiguration(): void {
    const initialConfig = this.selectedItemData[0]; // Obtenez la première configuration comme configuration initiale
    const newConfig = {
      access: '2',
      options: '',
      isNew: true, // Marquer comme nouvelle configuration
      optionsAvailable: this.determineOptions({ function: initialConfig.function }), // Déterminer les options basées sur la fonction
      profileCode: initialConfig.profileCode, // Copier le code profil de la configuration initiale
      types: initialConfig.types, // Copier le type de la configuration initiale
      function: initialConfig.function, // Copier la fonction de la configuration initiale
      sites: initialConfig.sites || '', // Copier les sites ou mettre une chaîne vide
      disableOptions: initialConfig.access === '1' // Désactiver les options si l'accès de la config initiale est '1'
    };
  
    this.selectedItemData.push(newConfig);
  }
  

  onAccessChange(config: any, index: number): void {
    if (!config.isNew) return; // Ignorer les modifications pour les configurations non ajoutées

    if (config.access === '1') {
      config.options = []; // Aucune option possible pour accès de type '1'
    } else if (config.access === '2') {
      config.options = ['CMS']; // CMS ajouté par défaut pour accès de type '2'
    }

    config.optionsAvailable = this.determineOptions(config);
  }






  onDeleteClick() {
    this.fileStateService.deleteFileName(); // Ceci va actualiser le BehaviorSubject
  }



  isPresent(code: string | undefined): string {
    return sessionStorage.getItem(code!) || 'unknown';
  }

  clearStatus(): void {
    sessionStorage.clear();
  }

  ngOnDestroy(): void {
    this.resetSubscription.unsubscribe();
    this.subscriptions.unsubscribe();

  }

  updateDisplayedMegaMenuItems(): void {
    if (this.currentMainMenu && this.megaMenuItems[this.currentMainMenu]) {
      this.displayedMegaMenuItems = this.megaMenuItems[this.currentMainMenu].map((item: ExtendedMegaMenuItem) => {
        if (item.code) {
          const code = item.code;
          const status = sessionStorage.getItem(code) || 'unknown';
          return {
            ...item,
            class: status === 'present' ? 'green-text' : status === 'absent' ? 'red-text' : 'gray-text'
          };
        } else {
          return {
            ...item,
            class: 'gray-text'
          };
        }
      });
    } else {
      this.displayedMegaMenuItems = [];
    }
  }


  selectMainMenu(menu: string) {
    this.currentMainMenu = menu;
    let newItems = this.buildMenuItemsForMenu(menu);
    this.megaMenuItems[menu] = newItems;
    this.updateDisplayedMegaMenuItems();
  }

  // Method to initialize and assign commands to all menu items recursively
  initializeMenuItems(items: MenuItem[]) {
    items.forEach(item => {
      // Check if item has a code and set its state
      if (item['code']) {
        const functionData = this.configService.getFunctionData(item['code']);
        if (functionData) {
          item.command = () => this.openFunctionDetails(item['code'], item.label || 'No Label');
          // Additional setup or state management based on functionData can be done here
        }
      }

      // Recursively apply to sub-items
      if (item.items) {
        this.initializeMenuItems(item.items as MenuItem[]);
      }
    });
  }


  determineOptions(config?: any): any[] {
    const optionsMap: { [key: string]: any[] } = {
      'FONADI': [
        { label: 'M', value: 'M' },
        { label: 'P', value: 'P' }
      ],
      'BANAFFA': [
        { label: 'U', value: 'U' }
      ],
      'BANAFFM': [
        { label: 'U', value: 'U' }
      ],
      'BATCHEXP': [
        { label: 'T', value: 'T' }
      ],
      'BATCHIMP': [
        { label: 'T', value: 'T' }
      ],
      'BPCVAL': [
        { label: 'U', value: 'U' }
      ],
      'BPSVAL': [
        { label: 'U', value: 'U' }
      ],
      'CONSPIA': [
        { label: 'P', value: 'P' },
        { label: 'S', value: 'S' },
        { label: 'C', value: 'C' },
        { label: 'T', value: 'T' },
        { label: 'F', value: 'F' }
      ],
      'CONSPIC': [
        { label: 'P', value: 'P' },
        { label: 'S', value: 'S' },
        { label: 'C', value: 'C' },
        { label: 'T', value: 'T' },
        { label: 'F', value: 'F' }
      ],
      'CONSPIH': [
        { label: 'P', value: 'P' },
        { label: 'S', value: 'S' },
        { label: 'C', value: 'C' },
        { label: 'T', value: 'T' },
        { label: 'F', value: 'F' }
      ],
      'CONSPIV': [
        { label: 'P', value: 'P' },
        { label: 'S', value: 'S' },
        { label: 'C', value: 'C' },
        { label: 'T', value: 'T' },
        { label: 'F', value: 'F' }
      ],
      'CPTACTSIM': [
        { label: 'U', value: 'U' }
      ],
      'CPTANUSIM': [
        { label: 'U', value: 'U' }
      ],
      'CPTDESSIM': [
        { label: 'U', value: 'U' }
      ],
      'CPTVALSIM': [
        { label: 'U', value: 'U' }
      ],
      'FUNDBENCH': [
        { label: 'A', value: 'A' },
        { label: 'M', value: 'M' },
        { label: 'J', value: 'J' },
        { label: 'P', value: 'P' }
      ],
      'FUNDBENCHA': [
        { label: 'A', value: 'A' },
        { label: 'M', value: 'M' },
        { label: 'J', value: 'J' },
        { label: 'P', value: 'P' }
      ],
      'FUNGBENCH': [
        { label: 'A', value: 'A' },
        { label: 'M', value: 'M' },
        { label: 'J', value: 'J' }
      ],
      'FUNGBENCHA': [
        { label: 'A', value: 'A' },
        { label: 'M', value: 'M' },
        { label: 'J', value: 'J' }
      ],
      'GENAVIDOM': [
        { label: 'U', value: 'U' }
      ],
      'GENBORREM': [
        { label: 'U', value: 'U' }
      ],
      'GESBBY': [
        { label: 'K', value: 'K' }
      ],
      'GESBICI': [
        { label: 'V', value: 'V' },
        { label: 'E', value: 'E' }
      ],
      'GESBISI': [
        { label: 'V', value: 'V' },
        { label: 'E', value: 'E' }
      ],
      'GESBPC': [
        { label: 'T', value: 'T' },
        { label: 'W', value: 'W' }
      ],
      'GESBPP': [
        { label: 'W', value: 'W' }
      ],
      'GESBPR': [
        { label: 'W', value: 'W' }
      ],
      'GESBPS': [
        { label: 'T', value: 'T' },
        { label: 'W', value: 'W' }
      ],
      'GESCAZ': [
        { label: 'T', value: 'T' }
      ],
      'GESDBY': [
        { label: 'K', value: 'K' }
      ],
      'GESFAS': [
        { label: 'A', value: 'A' },
        { label: 'G', value: 'G' },
        { label: 'R', value: 'R' },
        { label: 'T', value: 'T' },
        { label: 'U', value: 'U' },
        { label: 'V', value: 'V' },
        { label: 'W', value: 'W' },
        { label: 'Z', value: 'Z' },
        { label: 'O', value: 'O' },
        { label: 'P', value: 'P' }
      ],
      'GESFRM': [
        { label: 'V', value: 'V' },
        { label: 'F', value: 'F' },
        { label: 'T', value: 'T' }
      ],
      'GESGAS': [
        { label: 'T', value: 'T' }
      ],
      'GESITM': [
        { label: 'T', value: 'T' },
        { label: 'c', value: 'c' }
      ],
      'GESITN': [
        { label: 'K', value: 'K' }
      ],
      'GESLOT': [
        { label: 'T', value: 'T' }
      ],
      'GESMFG': [
        { label: 'A', value: 'A' },
        { label: 'J', value: 'J' }
      ],
      'GESMTK': [
        { label: 'K', value: 'K' }
      ],
      'GESPAB': [
        { label: 'V', value: 'V' },
        { label: 'F', value: 'F' },
        { label: 'T', value: 'T' }
      ],
      'GESPAY': [
        { label: 'A', value: 'A' },
        { label: 'V', value: 'V' },
        { label: 'T', value: 'T' },
        { label: 'L', value: 'L' },
        { label: 'O', value: 'O' }
      ],
      'GESPHY': [
        { label: 'G', value: 'G' }
      ],
      'GESPIH': [
        { label: 'V', value: 'V' },
        { label: 'E', value: 'E' },
        { label: 'U', value: 'U' },
        { label: 'I', value: 'I' }
      ],
      'GESPNH': [
        { label: 'V', value: 'V' },
        { label: 'K', value: 'K' }
      ],
      'GESPOD': [
        { label: 'T', value: 'T' }
      ],
      'GESPOH': [
        { label: 'T', value: 'T' },
        { label: 'L', value: 'L' },
        { label: 'I', value: 'I' }
      ],
      'GESPRH': [
        { label: 'L', value: 'L' },
        { label: 'G', value: 'G' }
      ],
      'GESPRH2': [
        { label: 'L', value: 'L' },
        { label: 'G', value: 'G' }
      ],
      'GESPSH': [
        { label: 'T', value: 'T' },
        { label: 'G', value: 'G' }
      ],
      'GESPTH': [
        { label: 'T', value: 'T' },
        { label: 'K', value: 'K' },
        { label: 'L', value: 'L' }
      ],
      'GESPTH2': [
        { label: 'T', value: 'T' },
        { label: 'K', value: 'K' },
        { label: 'L', value: 'L' }
      ],
      'GESSCO': [
        { label: 'A', value: 'A' },
        { label: 'O', value: 'O' }
      ],
      'GESSDH': [
        { label: 'V', value: 'V' },
        { label: 'P', value: 'P' },
        { label: 'F', value: 'F' },
        { label: 'K', value: 'K' },
        { label: 'G', value: 'G' },
        { label: 'I', value: 'I' }
      ],
      'GESSDH2': [
        { label: 'V', value: 'V' },
        { label: 'P', value: 'P' },
        { label: 'F', value: 'F' },
        { label: 'K', value: 'K' },
        { label: 'G', value: 'G' }
      ],
      'GESSFI': [
        { label: 'W', value: 'W' }
      ],
      'GESSFI1': [
        { label: 'W', value: 'W' }
      ],
      'GESSIH': [
        { label: 'V', value: 'V' },
        { label: 'E', value: 'E' },
        { label: 'R', value: 'R' },
        { label: 'K', value: 'K' },
        { label: 'I', value: 'I' }
      ],
      'GESSIS': [
        { label: 'D', value: 'D' }
      ],
      'GESSMO': [
        { label: 'K', value: 'K' }
      ],
      'GESSMR': [
        { label: 'K', value: 'K' }
      ],
      'GESSNL': [
        { label: 'V', value: 'V' }
      ],
      'GESSOH': [
        { label: 'P', value: 'P' },
        { label: 'L', value: 'L' },
        { label: 'F', value: 'F' },
        { label: 'A', value: 'A' },
        { label: 'D', value: 'D' },
        { label: 'R', value: 'R' },
        { label: 'I', value: 'I' }
      ], 'GESSOQ': [
        { label: 'A', value: 'A' }
      ],
      'GESSQH': [
        { label: 'P', value: 'P' },
        { label: 'O', value: 'O' }
      ],
      'GESSRE': [
        { label: 'G', value: 'G' },
        { label: 'H', value: 'H' },
        { label: 'K', value: 'K' },
        { label: 'F', value: 'F' }
      ],
      'GESSRH': [
        { label: 'K', value: 'K' }
      ],
      'GESSRL': [
        { label: 'K', value: 'K' }
      ],
      'GESSRS': [
        { label: 'K', value: 'K' }
      ],
      'GESSTQ': [
        { label: 'Q', value: 'Q' }
      ],
      'GEXPOBJ': [
        { label: 'T', value: 'T' }
      ],
      'GIMPOBJ': [
        { label: 'T', value: 'T' }
      ],
      'MODECHE': [
        { label: 'E', value: 'E' },
        { label: 'B', value: 'B' },
        { label: 'T', value: 'T' }
      ],
      'MODECHE2': [
        { label: 'E', value: 'E' },
        { label: 'B', value: 'B' },
        { label: 'T', value: 'T' }
      ],
      'PAYMEP': [
        { label: 'G', value: 'G' },
        { label: 'U', value: 'U' }
      ],
      'REMBAN': [
        { label: 'G', value: 'G' },
        { label: 'U', value: 'U' }
      ],
      'REMCPT': [
        { label: 'G', value: 'G' },
        { label: 'U', value: 'U' }
      ],
      'SAIWRKPLN': [
        { label: 'G', value: 'G' },
        { label: 'A', value: 'A' },
        { label: 'U', value: 'U' }
      ],
      'VALBIS': [
        { label: 'U', value: 'U' }
      ]
    };

    return config && optionsMap[config.function] ? [{ label: 'CMS', value: 'CMS' }, ...optionsMap[config.function]] : [{ label: 'CMS', value: 'CMS' }];
  }



  initializeAllMenus() {
    // Préparer les données pour chaque menu sans interaction utilisateur
    const menus = ['Développement', 'Paramétrage', 'Données de base', 'Relation client', 'Affaires', 'Achats', 'Ventes', 'Stocks', 'Production', 'Contrôle de gestion', 'Comptabilité', 'Comptabilité tiers', 'Déclarations', 'Immobilisations', 'Terminaux portables', 'Exploitation', 'Impressions', 'Traductions', 'Pages en lecture seule', 'EDI', '4CAD Gestion de la qualité', '4CAD Gestion des moyens', '4CAD Gestion des habilitations', '4CAD Devis technique', '4CAD Suivi atelier'];
    menus.forEach(menu => {
      this.selectMainMenu(menu); // Chargement des détails pour chaque menu
    });
  }

  buildMenuItemsForMenu(menu: string): MegaMenuItem[] {
    this.showUtilitairesSubMenu = menu === 'Développement';
    this.showGestionTaxesSubMenu = menu === 'Déclarations';
    this.showDeclarationEchangeBienTaxesSubMenu = menu === 'Déclarations';
    this.showAutresDeclarationsSubMenu = menu === 'Déclarations';
    this.showAuditSubMenu = menu === 'Déclarations';

    let menuItems: MegaMenuItem[] = [];

    switch (menu) {
      case 'Développement':
        return [{
          label: 'Dictionnaire données',
          items: [
            [
              {
                label: 'Tables', type: 'categorie', code: 'GTAB',
                items: [
                  { label: 'Tables', type: 'fonction', code: 'GESATB' }, { label: 'Types de données', type: 'fonction', code: 'GESATY' }, { label: 'Menus locaux - Messages', type: 'fonction', code: 'TXT' },
                  { label: 'Éléments de dimensionnement', type: 'fonction', code: 'GESADM' }, { label: 'Formules de dimensionnement', type: 'fonction', code: 'GESAFO' }
                ]
              },
              {
                label: 'Classes', type: 'categorie', code: 'GSTR',
                items: [
                  { label: 'Classes', type: 'fonction', code: 'GESACLA' }, { label: 'Représentations', type: 'fonction', code: 'GESASW' }, { label: 'Migration objet', type: 'fonction', code: 'AMIGSYR' },
                  { label: 'Validation classes systèmes', type: 'fonction', code: 'AGENCLATECH' }, { label: 'Synchronisation des liens', type: 'fonction', code: 'AGENASWLNK' }
                ]
              },
              {
                label: 'Documentation', type: 'categorie', code: 'GDOC',
                items: [
                  { label: 'Documentation', type: 'fonction', code: 'GESADF' },
                  { label: 'Liens de documentation', type: 'fonction', code: 'GESADF' },
                  { label: 'Documentation sur champs', type: 'fonction', code: 'GESADZ' },
                  { label: 'Mots-clés d\'aide', type: 'fonction', code: 'GESAMC' }
                ]
              },
            ],
            [
              {
                label: 'Tables diverses', type: 'categorie', code: 'GTAD',
                items: [
                  { label: 'Définition', type: 'fonction', code: 'GESADV' }, { label: 'Données', type: 'fonction', code: 'GESADI' }
                ]
              },
              {
                label: 'Ouverture au paramétrage', type: 'categorie', code: 'GDOP',
                items: [
                  { label: 'Codes activité', type: 'fonction', code: 'GESACV' },
                  { label: 'Définition paramètres', type: 'fonction', code: 'GESADP' },
                  { label: 'Constantes', type: 'fonction', code: 'GESACST' },
                  { label: 'Contexte', type: 'fonction', code: 'GESACTX' },
                  { label: 'Variables globales', type: 'fonction', code: 'GESAGB' },
                  { label: 'Variables de type compteur', type: 'fonction', code: 'GESACM' },
                  { label: 'Content type', type: 'fonction', code: 'GESATYP' },
                  { label: 'Contexte assistant de formules', type: 'fonction', code: 'GESAVR' },
                  { label: 'Historisation / Épuration', type: 'fonction', code: 'GESAHI' },
                  { label: 'Modèles de données', type: 'fonction', code: 'GESAWM' }
                ]
              },
            ],
            [
              {
                items: [
                  { label: 'Vues', type: 'fonction', code: 'GESAVW' },
                ]
              },
              {
                label: 'Codification', type: 'categorie', code: 'GCOD',
                items: [
                  { label: 'Rubriques', type: 'fonction', code: 'GESACO' },
                  { label: 'Abréviations', type: 'fonction', code: 'GESAAB' }, { label: 'Mémos', type: 'fonction', code: 'GESAMM' }
                ]
              }
            ]
          ]
        },
        {
          label: 'Dictionnaire scripts',
          items: [
            [
              {
                label: 'Ecrans', type: 'categorie', code: 'GTRE',
                items: [
                  { label: 'Ecrans', type: 'fonction', code: 'GESAMK' },
                  { label: 'Composants écran', type: 'fonction', code: 'GESAUR' },
                  { label: 'Composants graphiques', type: 'fonction', code: 'GESASB' },
                ]
              },
              {
                items: [
                  { label: 'Consultations', type: 'fonction', code: 'GESACN' },
                ]
              },
              {
                label: 'Scripts', type: 'categorie', code: 'GTRR',
                items: [
                  { label: 'Editeur scripts', type: 'fonction', code: 'ADOTRT' },
                  { label: 'Dictionnaire scripts', type: 'fonction', code: 'GESADC' },
                  { label: 'Sous-programmes', type: 'fonction', code: 'GESASU' },
                  { label: 'Points d\'entrée', type: 'fonction', code: 'GESAPE' },
                  { label: 'Services web', type: 'fonction', code: 'GESAWE' },
                ]
              },
              {
                items: [
                  { label: 'Transactions de mise à jour', type: 'fonction', code: 'GESAMI' },
                ]
              },
            ],
            [
              {
                items: [
                  { label: 'Fenêtres', type: 'fonction', code: 'GESAWI' },
                ]
              },
              {
                label: 'Actions', type: 'categorie', code: 'GTRA',
                items: [
                  { label: 'Actions', type: 'fonction', code: 'GESACT' }, { label: 'Paramètres actions', type: 'fonction', code: 'GESAAR' },
                ]
              },
              {
                items: [
                  { label: 'Etats', type: 'fonction', code: 'GESARP' },
                  { label: 'Types de transactions', type: 'fonction', code: 'GESATN' },
                ]
              },
            ],
            [
              {
                items: [
                  { label: 'Objets', type: 'fonction', code: 'GESAOB' },
                  { label: 'Fonctions', type: 'fonction', code: 'GESAFC' },
                  { label: 'Etats ZPL', type: 'fonction', code: 'GESARZ' },
                  { label: 'Navigation', type: 'fonction', code: 'GESANG' },
                ]
              },
            ]
          ]
        },

        {
          label: 'Portail Interactifs',
          items: [
            [
              {
                items: [
                  { label: 'Familles gadgets', type: 'fonction', code: 'GESATP' },
                  { label: 'Paramètres portail', type: 'fonction', code: 'GESAPP' },
                  { label: 'Création archive flash', type: 'fonction', code: 'ARCHFLASH' },
                ]
              },
            ]
          ]
        },
        {
          label: 'Safe X3 WAS',
          items: [
            [
              {
                label: 'Sites Web', type: 'categorie', code: 'AYTS',
                items: [
                  { label: 'Sélection site courant', type: 'fonction', code: 'AYTCHGFCYW' },
                  { label: 'Sites Web', type: 'fonction', code: 'GESAYS' },
                  { label: 'Profils site Web', type: 'fonction', code: 'GESAYD' }
                ]
              },
              {
                label: 'Paramétrage', type: 'categorie', code: 'AYTP',
                items: [
                  { label: 'Message Web', type: 'fonction', code: 'GESAYM' },
                  { label: 'Liste de valeurs', type: 'fonction', code: 'GESAYC' }
                ]
              },
              {
                label: 'Tests', type: 'categorie', code: 'AYTT',
                items: [
                  { label: 'Test site Web', type: 'fonction', code: 'GESAYT' }
                ]
              }
            ],
            [
              {
                label: 'Tokens', type: 'categorie', code: 'AYTK',
                items: [
                  { label: 'Pages Web', type: 'fonction', code: 'GESAYG' }, { label: 'Champs', type: 'fonction', code: 'GESAYF' },
                  { label: 'Blocs', type: 'fonction', code: 'GESAYB' }, { label: 'Blocs conditionnés', type: 'fonction', code: 'GESAYW' },
                  { label: 'Liens dynamiques', type: 'fonction', code: 'GESAYL' }
                ]
              },
              {
                label: 'Fonctions', type: 'categorie', code: 'AYTF',
                items: [
                  { label: 'Formulaire', type: 'fonction', code: 'GESAYZ' }, { label: 'Document Html', type: 'fonction', code: 'GESAYY' }
                ]
              }
            ],
            [
              {
                label: 'Lien SAFE X3', type: 'categorie', code: 'AYTL',
                items: [
                  { label: 'Interface', type: 'fonction', code: 'GESAYI' }, { label: 'Entité', type: 'fonction', code: 'GESAYE' },
                  { label: 'Action Web', type: 'fonction', code: 'GESAYA' }
                ]
              },
              {
                label: 'Utilitaires', type: 'categorie', code: 'AYT1',
                items: [
                  { label: 'Cas d\'emploi', type: 'fonction', code: 'CONSAYU' },
                  { label: 'Validation site Web', type: 'fonction', code: 'AYTFCYGEN' },
                  { label: 'Duplication de site web', type: 'fonction', code: 'AYTFCYCOP' },
                  { label: 'Copie service web', type: 'fonction', code: 'AYTWSRGES' },
                  { label: 'Suppression site Web', type: 'fonction', code: 'AYTFCYDEL' },
                  { label: 'Gestion design/archive', type: 'fonction', code: 'AYTFCYTAR' },
                  { label: 'Paramétrage avancé', type: 'fonction', code: 'GESAYU' },
                  { label: 'Génération liste de valeurs', type: 'fonction', code: 'PRHBATCH' },
                  { label: 'Visualisation site web', type: 'fonction', code: 'VISUAYS' }
                ]
              }
            ]
          ]
        },
        {
          label: 'Tests unitaires',
          items: [
            [
              {
                items: [
                  { label: 'Sauvegarde données stables', type: 'fonction', code: 'ATSTSAV' },
                  { label: 'Récupération données stables', type: 'fonction', code: 'ATSTREC' },
                ]
              },
            ]
          ]
        },
        {
          label: 'Développement',
          items: [
            [
              {
                items: [
                  { label: 'Synchronisation des textes', type: 'fonction', code: 'ATXTSRVSYNC' },
                ]
              },
            ]
          ]
        },];
      case 'Paramétrage':
        return [{
          label: 'Utilisateurs',
          items: [[
            {
              items: [
                { label: 'Utilisateurs', type: 'fonction', code: 'GESAUS' },
                { label: 'Profil fonction', type: 'fonction', code: 'GESAFT' },
                { label: 'Habilitation fonctionnelle', type: 'fonction', code: 'GESAFP' },
                { label: 'Profil menu', type: 'fonction', code: 'GESAPN' },
                { label: 'Profil Safe X3 WAS', type: 'fonction', code: 'GESAYH' },
                { label: 'Profil métier', type: 'fonction', code: 'GESAME' },
                { label: 'Codes d\'accès', type: 'fonction', code: 'GESACS' },
                { label: 'Restrictions d\'accès', type: 'fonction', code: 'GESARL' },
                { label: 'Annuaire', type: 'fonction', code: 'GESANU' },
              ]
            },
          ]]
        },
        {
          label: 'Destinations',
          items: [[
            {
              items: [
                { label: 'Destinations', type: 'fonction', code: 'GESAIM' },
                { label: 'Destinations par utilisateur', type: 'fonction', code: 'GESAIA' },
                { label: 'Règles d \'archivage', type: 'fonction', code: 'GESARC' },
                { label: 'Paramètres d\'archivage', type: 'fonction', code: 'GESARE' },
                { label: 'Code impression', type: 'fonction', code: 'GESARX' },
                { label: 'Valeur par défaut', type: 'fonction', code: 'GESARV' },
              ]
            },
          ]]
        },
        {
          label: 'Workflow',
          items: [[
            {
              items: [
                { label: 'Règles d\'affectation utilisateur', type: 'fonction', code: 'GESAWR' },
                { label: 'Affectation utilisateur', type: 'fonction', code: 'GESAWV' },
                { label: 'Utilisateurs délégués', type: 'fonction', code: 'GESAWU' },
                { label: 'Règles Workflow', type: 'fonction', code: 'GESAWA' },
                { label: 'Paramétrage plan de travail', type: 'fonction', code: 'GESAWW' },
                { label: 'Workflow manuel', type: 'fonction', code: 'SAIWRKMAN' },
                { label: 'Notifications', type: 'fonction', code: 'GESAWX' },
              ]
            },
          ]]
        },
        {
          label: 'Structure générale',
          items: [[
            {
              items: [
                { label: 'Modèles comptables', type: 'fonction', code: 'GESGCM' },
                { label: 'Référentiels', type: 'fonction', code: 'GESLED' },
                { label: 'Plan comptable', type: 'fonction', code: 'GESCOA' },
                { label: 'Axes', type: 'fonction', code: 'GESDIE' },
                { label: 'Axes par défaut', type: 'fonction', code: 'GESCDI' },
                { label: 'Sociétés', type: 'fonction', code: 'GESCPY' },
                { label: 'Sites', type: 'fonction', code: 'GESFCY' },
                { label: 'Groupes de sites/sociétés', type: 'fonction', code: 'GESAGF' },
                { label: 'Intersociétés', type: 'fonction', code: 'FUNBCH' },
              ]
            },
          ]]
        },
        {
          label: 'Paramètres généraux',
          items: [
            [
              {
                items: [
                  { label: 'Dossiers', type: 'fonction', code: 'GESADS' },
                  { label: 'Tables de contrôles', type: 'fonction', code: 'GESACL' },
                ]
              },
              {
                label: 'Tables diverses', type: 'categorie', code: 'MEPGD',
                items: [
                  { label: 'Données', type: 'fonction', code: 'GESADI2' },
                  { label: 'Personnalisation', type: 'fonction', code: 'ADILNG' },
                ]
              },
              {
                items: [
                  { label: 'Propriétés objets sous-menu fichier', type: 'fonction', code: 'GESAOP' },
                  { label: 'Formules', type: 'fonction', code: 'GESTFO' },
                ]
              },
            ],
            [
              {
                items: [
                  { label: ' Valeurs paramètres', type: 'fonction', code: 'ADPVAL' },
                ]
              },
              {
                label: 'Compteurs', type: 'categorie', code: 'MEPGC',
                items: [
                  { label: 'Structures', type: 'fonction', code: 'GESANM' },
                  { label: 'Affectation', type: 'fonction', code: 'GESTCA' },
                ]
              },
              {
                items: [
                  { label: 'Menus locaux', type: 'fonction', code: 'COMBOS' },
                ]
              },
              {
                label: 'Personnalisation', type: 'categorie', code: 'MPERS',
              },
              {
                label: 'Ecrans', type: 'categorie', code: 'MPERE',
                items: [
                  { label: 'Affectation codes d\'accès', type: 'fonction', code: 'CODACC' },
                  { label: 'Affectation contrôles', type: 'fonction', code: 'CODCTL' },
                  { label: 'Styles conditionnels', type: 'fonction', code: 'GESASL' },
                  { label: 'Affectation style conditionnel', type: 'fonction', code: 'APRSMSK' },
                  { label: 'Styles personnalisés', type: 'fonction', code: 'GESAYP' },
                ]
              },
              {
                items: [
                  { label: 'Objets', type: 'fonction', code: 'GESAOC' },
                  { label: 'Vocabulaire', type: 'fonction', code: 'AVOCAB' },
                ]
              },
            ],
            [
              {
                items: [
                  { label: 'Jeux de valeurs', type: 'fonction', code: 'GESADG' },
                ]
              },
              {
                label: 'Types facture', type: 'categorie', code: 'MEPGT',
                items: [
                  { label: 'Fournisseur', type: 'fonction', code: 'GESTPV' },
                  { label: 'Client', type: 'fonction', code: 'GESTSV' },

                ]
              },
              {
                items: [
                  { label: 'Styles de présentation', type: 'fonction', code: 'GESASY' },
                  { label: 'Ecrans de consultation', type: 'fonction', code: 'GESGTC' },
                ]
              },
            ]
          ]
        },
        {
          label: 'Exploitation',
          items: [
            [
              {
                label: 'Statistiques', type: 'categorie', code: 'MSTAT',
                items: [
                  { label: 'Dèclencheurs statistiques', type: 'fonction', code: 'GESPS1' },
                  { label: 'Paramètres statistiques', type: 'fonction', code: 'GESPS2' },
                ]
              },
              {
                label: 'Impressions', type: 'categorie', code: 'MDIMP',
                items: [
                  { label: 'Requêteur', type: 'fonction', code: 'GESALH' },
                  { label: 'Requêteur SQL', type: 'fonction', code: 'GESALQ' },
                  { label: 'Requêteur graphique', type: 'fonction', code: 'GESALT' }
                ]
              },
              {
                items: [
                  { label: 'Connexion à Sage sales tax', type: 'fonction', code: 'LTPAR' },
                ]
              },
            ],
            [
              {
                label: 'Imports/Exports', type: 'categorie', code: 'MEXP',
                items: [
                  { label: 'Modèles imports/Exports', type: 'fonction', code: 'GESAOE' },
                  { label: 'Paramètres imports/Exports', type: 'fonction', code: 'GIMPEXPPAR' },
                  { label: 'Transcodage Imports/Exports', type: 'fonction', code: 'GESAOR' },
                  { label: 'Enchaînements', type: 'fonction', code: 'GESAEN' },
                  { label: 'Paramétrage tableau/import', type: 'fonction', code: 'GESAEV' }
                ]
              },
              {
                label: 'Données', type: 'categorie', code: 'MDON',
                items: [
                  { label: 'Paramètres épurations', type: 'fonction', code: 'APARHIS' },
                  { label: 'Optimisations base de données', type: 'fonction', code: 'GESANX' },
                ]
              },
            ],
            [
              {
                label: 'Serveur batch', type: 'categorie', code: 'MBACT',
                items: [
                  { label: 'Paramètres serveur batch', type: 'fonction', code: 'ABATPAR' },
                  { label: 'Calendrier serveur batch', type: 'fonction', code: 'GESABC' },
                  { label: 'Contraintes horaires', type: 'fonction', code: 'GESABH' }
                ]
              },

              {
                label: 'Sage Exchange', type: 'categorie', code: 'MSEPP',
                items: [
                  { label: 'Passerelles paiement', type: 'fonction', code: 'SEPAR' },
                  { label: 'Paramètres passerelle paiement', type: 'fonction', code: 'GESSER' },
                  { label: 'Transaction carte crédit', type: 'fonction', code: 'CONSSET' }
                ]
              }
            ],
          ]
        },
        {
          label: 'Relation client',
          items: [
            [
              {
                label: 'Ciblage avancé', type: 'categorie', code: 'MPMKA',
                items: [
                  { label: 'Cibles', type: 'fonction', code: 'GESTGL' },
                  { label: 'Supports de selection', type: 'fonction', code: 'GESSSP' },
                  { label: 'Supports de présentation', type: 'fonction', code: 'GESTGP' },
                  { label: 'Critères de ciblage', type: 'fonction', code: 'GESFID' },
                  { label: 'Exécutions groupées', type: 'fonction', code: 'FUNMGG4' },
                  { label: 'Ciblages', type: 'fonction', code: 'FUNMGG' },
                ]
              },
              {
                label: 'Marketing', type: 'categorie', code: 'MPMKG',
                items: [
                  { label: 'Publipostages XML', type: 'fonction', code: 'GESMXL' },
                ]
              },
            ],
            [
              {
                label: 'Action commercial', type: 'categorie', code: 'MPACA',
                items: [
                  { label: 'Schémas hebdomadaires', type: 'fonction', code: 'GESTWDCRM' },
                  { label: 'Schémas horaires', type: 'fonction', code: 'GESDIHCRM' },
                ]
              },
              {
                label: 'Transactions de saisie', type: 'categorie', code: 'MPTRS',
                items: [
                  { label: 'Agenda action commerciale', type: 'fonction', code: 'GESCBA' },
                  { label: 'Agenda support client', type: 'fonction', code: 'GESCMD' },
                  { label: 'Demandes de service', type: 'fonction', code: 'GESCMS' },
                  { label: 'Interventions', type: 'fonction', code: 'GESCMI' }, { label: 'Parc Client', type: 'fonction', code: 'GESCMA' }
                ]
              },
            ],
            [
              {
                label: 'Support client', type: 'categorie', code: 'MPHDK',
                items: [
                  { label: 'Unités de temps', type: 'fonction', code: 'FUNUOT1' },
                  { label: 'Escalades', type: 'fonction', code: 'GESPEC' },
                ]
              },
              {
                label: 'Synchronisation Outlook', type: 'categorie', code: 'MPSYN',
                items: [
                  { label: 'Paramètres de synchronisation', type: 'fonction', code: 'GESSYP' },
                  { label: 'Données synchronisation', type: 'fonction', code: 'FUNSYD' },
                  { label: 'Gestion des anomalies', type: 'fonction', code: 'FUNSYL' },
                  { label: 'Forçage synchronisation', type: 'fonction', code: 'FUNSYD6' },
                ]
              },
            ],
          ]
        },
        {
          label: 'Achats',
          items: [
            [
              {
                label: 'Types de documents', type: 'categorie', code: 'PAPTY',
                items: [
                  { label: 'Types de retours', type: 'fonction', code: 'GESTPN' },
                  { label: 'Types de facture', type: 'fonction', code: 'GESTPV2' },
                ]
              },
              {
                items: [
                  { label: 'Traduction textes', type: 'fonction', code: 'FUNTRAAXP' },
                  { label: 'Règles rapprochement', type: 'fonction', code: 'GESMAT' },
                ]
              },
            ],
            [
              {
                items: [
                  { label: 'Eléments de facturation', type: 'fonction', code: 'GESPFI1' },
                  { label: 'Paramètres agrégation comptable', type: 'fonction', code: 'GESSWA' },
                ]
              },
            ],
            [
              {
                label: 'Tarifs', type: 'categorie', code: 'PAPUT',
                items: [
                  { label: 'Structures', type: 'fonction', code: 'GESPRS' },
                  { label: 'Paramétrage', type: 'fonction', code: 'GESPPC' },
                  { label: 'Motifs', type: 'fonction', code: 'GESPPR' }, { label: 'Activation', type: 'fonction', code: 'FUNPPCACT' },
                ]
              },
              {
                label: 'Transaction de saisie', type: 'categorie', code: 'TRPUR',
                items: [
                  { label: 'Planning global', type: 'fonction', code: 'GESMGLA' },
                  { label: 'Plan de travail', type: 'fonction', code: 'GESMDLA' },
                  { label: 'Plan de regroupement', type: 'fonction', code: 'GESMRLA' },
                  { label: 'Appels d\'offres', type: 'fonction', code: 'GESPTA' },
                  { label: 'Demandes d\'achat', type: 'fonction', code: 'GESPTD' },
                  { label: 'Ordres de sous-traitance', type: 'fonction', code: 'GESPTE' },
                  { label: 'Commandes', type: 'fonction', code: 'GESPTC' },
                  { label: 'Commandes ouvertes', type: 'fonction', code: 'GESPTT' },
                  { label: 'Réceptions', type: 'fonction', code: 'GESPTR' },
                  { label: 'Retours', type: 'fonction', code: 'GESPTN' },
                  { label: 'Factures/avoirs', type: 'fonction', code: 'GESPTF' },
                ]
              },
            ]

          ]
        },
        {
          label: 'Ventes',
          items: [
            [
              {
                label: 'Types de documents', type: 'categorie', code: 'PASTY',
                items: [
                  { label: 'Types de devis', type: 'fonction', code: 'GESTSQ' },
                  { label: 'Types de commandes', type: 'fonction', code: 'GESTSO' },
                  { label: 'Types de livraisons', type: 'fonction', code: 'GESTSD' },
                  { label: 'Types de retours', type: 'fonction', code: 'FUNSYD6' },
                  { label: 'Types de factures', type: 'fonction', code: 'GESTSV2' },
                ]
              },
              {
                items: [
                  { label: 'Traduction textes', type: 'fonction', code: 'FUNTRAAXS' },
                ]
              },
            ],
            [
              {
                items: [
                  { label: 'Eléments de facturation', type: 'fonction', code: 'GESSFI1' },
                ]
              },
              {
                label: 'Transaction de saisie', type: 'categorie', code: 'TRSAL',
                items: [
                  { label: 'Devis', type: 'fonction', code: 'GESSLQ' },
                  { label: 'Commandes', type: 'fonction', code: 'GESSLC' },
                  { label: 'Commandes ouvertes', type: 'fonction', code: 'GESSLO' },
                  { label: 'Livraisons', type: 'fonction', code: 'GESSLD' },
                  { label: 'Factures', type: 'fonction', code: 'GESSLI' },
                  { label: 'Avoirs', type: 'fonction', code: 'GESSLA' },
                  { label: 'Retours client', type: 'fonction', code: 'GESSLR' },
                  { label: 'Retours prêt', type: 'fonction', code: 'GESSLL' },
                  { label: 'Retours matières sous-traitance', type: 'fonction', code: 'GESSLS' },
                ]
              },
            ],
            [
              {
                label: 'Tarifs', type: 'categorie', code: 'PASAT',
                items: [
                  { label: 'Structures', type: 'fonction', code: 'GESPRSS' },
                  { label: 'Paramétrage', type: 'fonction', code: 'GESSPC' },
                  { label: 'Motifs', type: 'fonction', code: 'GESSPR' },
                  { label: 'Activation', type: 'fonction', code: 'FUNSPCACT' },
                ]
              },
            ]
          ]
        },
        {
          label: 'Stocks',
          items: [
            [
              {
                items: [
                  { label: 'Paramètres stocks', type: 'fonction', code: 'GESSTE' },
                  { label: 'Règles de gestion de stock', type: 'fonction', code: 'FUNSTORUL' },
                  { label: 'Méthodes de valorisation', type: 'fonction', code: 'GESTCM' },
                ]
              },
              {
                label: 'Transactions de saisie', type: 'categorie', code: 'TRSTO',
                items: [
                  { label: 'Entrées diverses', type: 'fonction', code: 'GESSRT' },
                  { label: 'Sorties diverses', type: 'fonction', code: 'GESSOT' },
                  { label: 'Réceptions', type: 'fonction', code: 'GESPTR2' },
                  { label: 'Plans de préparation d\'expéditions', type: 'fonction', code: 'GESPRE' },
                  { label: 'Bons de préparation', type: 'fonction', code: 'GESPRT' },
                  { label: 'Livraisons', type: 'fonction', code: 'GESSLD2' },
                  { label: 'Colisage', type: 'fonction', code: 'GESSPK' },
                  { label: 'Changements stock', type: 'fonction', code: 'GESSCT' },
                  { label: 'Plans de rangement', type: 'fonction', code: 'GESSRG' },
                  { label: 'Plans de réapprovisionnement', type: 'fonction', code: 'GESSRO' },
                  { label: 'Assemblage/Désassemblage', type: 'fonction', code: 'GESPBY' },
                  { label: 'Contrôle qualité', type: 'fonction', code: 'GESSQT' },
                  { label: 'Modification de lot', type: 'fonction', code: 'GESSLT' },
                  { label: 'Inventaires', type: 'fonction', code: 'GESSNP' },
                  { label: 'Validation transactions stock', type: 'fonction', code: 'FUNSTKTRS' },
                ]
              },
            ],
            [
              {
                items: [
                  { label: 'Calculs besoins', type: 'fonction', code: 'GESPCB' },
                  { label: 'Paramétrage code préparation', type: 'fonction', code: 'GESPPA' },
                  { label: 'Paramètres interface comptable', type: 'fonction', code: 'GESPAS' },
                  { label: 'Compteurs versions', type: 'fonction', code: 'GESICV' },
                ]
              },
            ],
            [
              {
                items: [
                  { label: 'Règles d\allocations / sorties', type: 'fonction', code: 'GESTRU' },
                  { label: 'Règles d\'affectation', type: 'fonction', code: 'GESPTO' },
                  { label: 'Types changement de stock', type: 'fonction', code: 'GESTSG' },
                ]
              },
            ],

          ]
        },
        {
          label: 'Production',
          items: [
            [
              {
                items: [
                  { label: 'Jalonnement', type: 'fonction', code: 'GESPJA' },
                  { label: 'Périodes d\'indisponibilité', type: 'fonction', code: 'GESTUVM' },
                  { label: 'Décomposition codes-barres', type: 'fonction', code: 'GESX4BAD' },
                ]
              },
            ],
            [
              {
                items: [
                  { label: 'Schémas hebdomadaires', type: 'fonction', code: 'GESTWD' },
                  { label: 'Paramètres agrégation comptable', type: 'fonction', code: 'GESPWA' },
                ]
              },
            ],
            [
              {
                items: [
                  { label: 'Schémas horaires', type: 'fonction', code: 'GESDIH' },
                ]
              },
              {
                label: 'Transactions de saisie', type: 'categorie', code: 'TRMFG',
                items: [
                  { label: 'Ordres de fabrication', type: 'fonction', code: 'GESMFL' },
                  { label: 'Suivi fabrication', type: 'fonction', code: 'GESMTL' },
                  { label: 'Planning global', type: 'fonction', code: 'GESMGL' },
                  { label: 'Plan de travail', type: 'fonction', code: 'GESMDL' },
                  { label: 'Regroupement', type: 'fonction', code: 'GESMRL' },
                  { label: 'Plan de suivi des temps', type: 'fonction', code: 'GESMOL' },
                  { label: 'Plan de suivi des matières', type: 'fonction', code: 'GESMML' },
                  { label: 'Plan de production', type: 'fonction', code: 'GESMIL' },
                  { label: 'Plans de réintégration', type: 'fonction', code: 'GESMRE' },
                  { label: 'Plan des fiches techniques', type: 'fonction', code: 'GESMCL' },
                  { label: 'Pilotage des plans de suivi', type: 'fonction', code: 'GESMPL' },
                  { label: 'Ordres de retouche', type: 'fonction', code: 'GESXX1JPMFL' },
                ]
              },
            ],
          ]
        },
        {
          label: 'Configurateur',
          items: [
            [
              {
                items: [
                  { label: 'Symboles configurateur', type: 'fonction', code: 'GESCQU' },
                ]
              },
              {
                label: 'Abaques', type: 'categorie', code: 'MCFGA',
                items: [
                  { label: 'Simples', type: 'fonction', code: 'GESCAB' },
                  { label: 'À deux entrées', type: 'fonction', code: 'GESCAD' },
                ]
              },
              {
                items: [
                  { label: 'Procédures', type: 'fonction', code: 'GESCFM' },
                  { label: 'Cas d\'emplois configurateur', type: 'fonction', code: 'VISUCFG' },
                ]
              },
            ],
            [{
              items: [
                { label: 'Table des réponses', type: 'fonction', code: 'CFGTCT' },
                { label: 'Sélections configurateur', type: 'fonction', code: 'GESCFG' },
                { label: 'Valeurs par défaut', type: 'fonction', code: 'FUNDEF' },
                { label: 'Utilitaires configurateur', type: 'fonction', code: 'FUNCFGUTI' },
              ]
            },
            ], [
              {
                items: [
                  { label: 'Formes et modèles', type: 'fonction', code: 'GESCSH' },
                  { label: 'Options / variantes', type: 'fonction', code: 'GESCOV' },
                  { label: 'Scénarios configurateur', type: 'fonction', code: 'GESCFG' },
                ]
              },
            ]
          ]
        },
        {
          label: 'Comptabilité',
          items: [
            [
              {
                items: [
                  { label: 'Classes de comptes', type: 'fonction', code: 'GESCLS' },
                ]
              },
              {
                label: 'Formulaires comptables', type: 'categorie', code: 'PACPG',
                items: [
                  { label: 'Ecritures calculées', type: 'fonction', code: 'GESCLC' },
                  { label: 'Déversements', type: 'fonction', code: 'GESPDM' },
                  { label: 'Abonnements', type: 'fonction', code: 'GESGAF' },
                  { label: 'Répartitions a posteriori', type: 'fonction', code: 'GESDAD' },
                  { label: 'Extraction compte contrepartie', type: 'fonction', code: 'GESCSF' },
                  { label: 'Tableaux de bord', type: 'fonction', code: 'GESTXS' },
                ]
              },
            ], [
              {
                items: [
                  { label: 'Types de pièces', type: 'fonction', code: 'GESGTE' },
                ]
              },
              {
                label: 'Budgets', type: 'categorie', code: 'PACPA',
                items: [
                  { label: 'Répartitions temporelles', type: 'fonction', code: 'GESDTP' },
                  { label: 'Budgets', type: 'fonction', code: 'GESBUP' },
                  { label: 'Versions de budgets', type: 'fonction', code: 'GESBUV' },
                  { label: 'Transactions saisie budgets', type: 'fonction', code: 'GESTBU' },
                ]
              },
            ], [
              {
                items: [
                  { label: 'Transactions saisie pièces', type: 'fonction', code: 'GSEGDE' },
                ]
              },
              {
                label: 'Interface comptabilité', type: 'categorie', code: 'PAINT',
                items: [
                  { label: 'Paramètres des variables', type: 'fonction', code: 'GESGVA' },
                  { label: 'Variables pièces automatiques', type: 'fonction', code: 'GESGVG' },
                  { label: 'Lignes des codes comptables', type: 'fonction', code: 'GESCCL' },
                  { label: 'Transactions saisie code compta', type: 'fonction', code: 'GESGCO' },
                  { label: 'Codes comptables', type: 'fonction', code: 'GESCAC' },
                  { label: 'Sections par défaut', type: 'fonction', code: 'GESCDE' },
                  { label: 'Formules par législation', type: 'fonction', code: 'GESTFOLEG' },
                  { label: 'Pièces automatiques', type: 'fonction', code: 'GESGAU' },
                  { label: 'Groupes pièces automatiques', type: 'fonction', code: 'GESGRA' },
                  { label: 'Comparaison pièces automatiques', type: 'fonction', code: 'CMPGAU' },
                  { label: 'Tâches comptables', type: 'fonction', code: 'GESBTC' },
                  { label: 'Resynchronisation Législation', type: 'fonction', code: 'UTILEG' },
                ]
              },
            ]
          ]
        },
        {
          label: 'Comptabilité tiers',
          items: [
            [
              {
                items: [
                  { label: 'Destinations comptables', type: 'fonction', code: 'GESCDA' },
                  { label: 'Paramétrage saisie factures tiers', type: 'fonction', code: 'GESIDP' },
                ]
              },
              {
                label: 'Notes de frais', type: 'categorie', code: 'PEXS',
                items: [
                  { label: 'Codes frais', type: 'fonction', code: 'GESTES' },
                  { label: 'Indemnités kilométriques', type: 'fonction', code: 'GESEXM' },
                ]
              },
              {
                items: [
                  { label: 'Types prévisions de trésorerie', type: 'fonction', code: 'GESCFT' },
                ]
              },
            ],
            [
              {
                items: [
                  { label: 'Code édition', type: 'fonction', code: 'GESTED' },
                ]
              },
              {
                label: 'Ecrans', type: 'categorie', code: 'PECR',
                items: [
                  { label: 'Gestion échéances', type: 'fonction', code: 'GESGDS' },
                  { label: 'Situation tiers', type: 'fonction', code: 'GESGBS' },
                  { label: 'Balance âgée à date', type: 'fonction', code: 'GESGBSH' },
                  { label: 'Campagnes de relances', type: 'fonction', code: 'GESGFP' },
                ]
              },
              {
                label: 'Relances', type: 'categorie', code: 'PREL',
                items: [
                  { label: 'Groupes de relances', type: 'fonction', code: 'GESFGP' },
                  { label: 'Textes de relance', type: 'fonction', code: 'GESFPT' },
                ]
              },
            ],
            [
              {
                items: [
                  { label: 'Transactions saisie règlements', type: 'fonction', code: 'GESTPY' },
                ]
              },
              {
                label: 'Paramètres virements commerciaux', type: 'categorie', code: 'PAEDI',
                items: [
                  { label: 'Segments', type: 'fonction', code: 'GESEDS' },
                  { label: 'Paramétrage messages', type: 'fonction', code: 'GESEDP' },
                  { label: 'Formules', type: 'fonction', code: 'GESEDM' },
                ]
              },
              {
                label: 'Fichiers', type: 'categorie', code: 'PFIC',
                items: [
                  { label: 'Fichiers bancaires', type: 'fonction', code: 'GESTFB' },
                  { label: 'Trésorerie', type: 'fonction', code: 'GESTFC' },
                ]
              },
            ]
          ]
        },
        {
          label: 'Immobilisations',
          items: [
            [
              {
                items: [
                  { label: 'Contextes d\'amortissements', type: 'fonction', code: 'GESCNX' },
                  { label: 'Associations - définitions', type: 'fonction', code: 'GESRDE' },
                  { label: 'Modes d\'amortissement', type: 'fonction', code: 'GESDPM' },
                  { label: 'Regroupement des dépenses', type: 'fonction', code: 'GESLGT' },
                  { label: 'Transactions objets métiers', type: 'fonction', code: 'GESTSH' },
                  { label: 'Lien dépenses-biens comptables', type: 'fonction', code: 'GESLDA' },
                  { label: 'Alimentation zones libres', type: 'fonction', code: 'GESTZL' },
                  { label: 'Propriétés des zones libres', type: 'fonction', code: 'GESFRF' },
                  { label: 'Types d\'écritures comptables', type: 'fonction', code: 'GESTPE' },
                ]
              },
            ]
          ]
        },
        {
          label: 'Portail interactifs',
          items: [
            [
              {
                items: [
                  { label: 'Composants interactifs', type: 'fonction', code: 'GESAIT' },
                  { label: 'Vignettes', type: 'fonction', code: 'GESAVP' },
                  { label: 'Vues du portail', type: 'fonction', code: 'GESAPV' },
                  { label: 'Processus', type: 'fonction', code: 'GESAPR' },
                  { label: 'Menu processus', type: 'fonction', code: 'GESAPO' },
                ]
              },
            ]
          ]
        },
        {
          label: 'Paramétrage',
          items: [
            [
              {
                items: [
                  { label: 'Traduction textes', type: 'fonction', code: 'FUNTRAAXX' },
                ]
              },
            ]
          ]
        },
        {
          label: 'Gestion des livrables',
          items: [
            [
              {
                items: [
                  { label: 'Livrables', type: 'fonction', code: 'GESADLV' },
                  { label: 'Kits de paramétrage', type: 'fonction', code: 'GESADLK' },
                ]
              },
            ]
          ]
        },
        {
          label: 'E-commerce',
          items: [
            [

              {
                items: [
                  { label: 'Site de vente en ligne', type: 'fonction', code: 'ECMLINK' },
                ]
              },
            ]
          ]
        }];
      case 'Données de base':
        return [
          {
            label: 'Données de base',
            items: [
              [
                {
                  items: [
                    { label: 'Tables diverses', type: 'fonction', code: 'FONADI' },
                  ]
                },
              ],
            ]
          },
          {
            label: 'Tables communes',
            items: [
              [
                {
                  items: [
                    { label: 'Pays', type: 'fonction', code: 'GESTCY' },
                  ]
                },
                {
                  items: [
                    { label: 'Liens subdivisions', type: 'fonction', code: 'GESALB' },
                  ]
                },
                {
                  items: [
                    { label: 'Langues', type: 'fonction', code: 'GESTLA' },
                  ]
                },
                {
                  items: [
                    { label: 'Banques (guichets)', type: 'fonction', code: 'GESABN' },
                  ]
                },
                {
                  items: [
                    { label: 'Classe de fret', type: 'fonction', code: 'GESFRT' },
                  ]
                },
              ], [
                {
                  items: [
                    { label: 'Codes postaux', type: 'fonction', code: 'GESPOS' },
                  ]
                },
                {
                  items: [
                    { label: 'Devises', type: 'fonction', code: 'GESTCU' },
                  ]
                },
                {
                  items: [
                    { label: 'Unités', type: 'fonction', code: 'GESTUN' },
                  ]
                },
                {
                  items: [
                    { label: 'Interlocuteurs', type: 'fonction', code: 'GESAIN' },
                  ]
                },
                {
                  items: [
                    { label: 'Code fret de marchandises', type: 'fonction', code: 'GESFCC' },
                  ]
                },
              ], [
                {
                  items: [
                    { label: 'Subdivisions géographiques', type: 'fonction', code: 'GESATU' },
                  ]
                },
                {
                  items: [
                    { label: 'Cours devises', type: 'fonction', code: 'COURDEV' },
                  ]
                },
                {
                  items: [
                    { label: 'Conversions d\'unités', type: 'fonction', code: 'GESTCO' },
                  ]
                },
                {
                  items: [
                    { label: 'Catégorie note', type: 'fonction', code: 'GESNTG' },
                  ]
                },
                {
                  label: 'Taxes', type: 'categorie', code: 'MTAXE',
                  items: [
                    { label: 'Régime de taxe du tiers', type: 'fonction', code: 'GESTVB' },
                    { label: 'Niveau de taxe', type: 'fonction', code: 'GESTVI' },
                    { label: 'Détermination taxes', type: 'fonction', code: 'GESTVC' },
                    { label: 'Taux de taxe', type: 'fonction', code: 'GESTVT' },
                  ]
                }
              ]
            ]
          },
          {
            label: 'Tables articles',
            items: [
              [
                {
                  items: [
                    { label: 'Familles stat. article', type: 'fonction', code: 'DIVTSI' },
                  ]
                },
                {
                  items: [
                    { label: 'Politiques de réapprovisionnement', type: 'fonction', code: 'GESTRP' },
                  ]
                },
                {
                  items: [
                    { label: 'Dépôts', type: 'fonction', code: 'GESWRH' },
                  ]
                },
                {
                  items: [
                    { label: 'Emballages', type: 'fonction', code: 'GESTPA' },
                  ]
                },
              ], [
                {
                  items: [
                    { label: 'Lignes de produits', type: 'fonction', code: 'GESTLP' },
                  ]
                },
                {
                  items: [
                    { label: 'Statuts stock', type: 'fonction', code: 'GESTST' },
                  ]
                },
                {
                  items: [
                    { label: 'Types emplacements', type: 'fonction', code: 'GESTLO' },
                  ]
                },
                {
                  label: 'Fiches qualité', type: 'categorie', code: 'MMQLY',
                  items: [
                    { label: 'Fiches techniques', type: 'fonction', code: 'GESQLC' },
                    { label: 'Gammes de contrôles', type: 'fonction', code: 'GESXX1JCSGC' },
                    { label: 'Questions', type: 'fonction', code: 'GESQST' },
                    { label: 'Réponses', type: 'fonction', code: 'ECMGESTCTLINK' },
                  ]
                },
              ], [
                {
                  items: [
                    { label: 'Attributs lignes de produits', type: 'fonction', code: 'FUNTLPATT' },
                  ]
                },
                {
                  items: [
                    { label: 'Saisonnalités', type: 'fonction', code: 'GESSES' },
                  ]
                },
                {
                  items: [
                    { label: 'Emplacements', type: 'fonction', code: 'GESLOC' },
                  ]
                },
                {
                  items: [
                    { label: 'Coeff. stock sécurité', type: 'fonction', code: 'GESTSA' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Tables production',
            items: [
              [
                {
                  items: [
                    { label: 'Messages', type: 'fonction', code: 'GESTMS' },
                  ]
                },
                {
                  items: [
                    { label: 'Rebuts', type: 'fonction', code: 'GESTSR' },
                  ]
                },
                {
                  items: [
                    { label: 'Gestion des habilitations', type: 'fonction', code: 'XX1JHGESHAB' },
                  ]
                }
              ]
            ]
          },
          {
            label: 'Tables logistiques',
            items: [
              [
                {
                  label: 'Motifs', type: 'categorie', code: 'MOTIF',
                  items: [
                    { label: 'Retours', type: 'fonction', code: 'DIVRET' },
                    { label: 'Avoirs', type: 'fonction', code: 'DIVAVO' },
                    { label: 'Solde', type: 'fonction', code: 'DIVCCL' },
                  ]
                },
                {
                  items: [
                    { label: 'Codes préparation', type: 'fonction', code: 'GESPCO' },
                  ]
                },
                {
                  items: [
                    { label: 'Frais d\'approche - site', type: 'fonction', code: 'GESSTCITF' },
                  ]
                },
              ],
              [
                {
                  items: [
                    { label: 'Incoterms', type: 'fonction', code: 'GESICT' },
                  ]
                },
                {
                  items: [
                    { label: 'Charges', type: 'fonction', code: 'GESFCS' },
                  ]
                },
              ],
              [
                {
                  items: [
                    { label: 'Modes livraison', type: 'fonction', code: 'GESTMD' },
                  ]
                },
                {
                  items: [
                    { label: 'Structures de coûts', type: 'fonction', code: 'GESSTC' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Tables tiers',
            items: [
              [
                {
                  items: [
                    { label: 'Familles stat client', type: 'fonction', code: 'DIVTSC' },
                  ]
                },
                {
                  items: [
                    { label: 'Modes de règlement', type: 'fonction', code: 'GESTAM' },
                  ]
                },
                {
                  items: [
                    { label: 'Mandats de prélèvement', type: 'fonction', code: 'GESMDT' },
                  ]
                },
                {
                  items: [
                    { label: 'Modèles d\'édition', type: 'fonction', code: 'GESTPM' },
                  ]
                },
              ], [
                {
                  items: [
                    { label: 'Familles stat fournisseur', type: 'fonction', code: 'DIVTSS' },
                  ]
                },
                {
                  items: [
                    { label: 'Escomptes/Agios', type: 'fonction', code: 'GESTDA' },
                  ]
                },
                {
                  items: [
                    { label: 'Validation mandats', type: 'fonction', code: 'VALMDT' },
                  ]
                },
                {
                  items: [
                    { label: 'Règles d\'arrondi', type: 'fonction', code: 'GESTRN' },
                  ]
                },
              ], [
                {
                  items: [
                    { label: 'Périodes d\'indisponibilité', type: 'fonction', code: 'GESTUV' },
                  ]
                },
                {
                  items: [
                    { label: 'Conditions paiement', type: 'fonction', code: 'GESTPT' },
                  ]
                },
                {
                  items: [
                    { label: 'Clôture mandat', type: 'fonction', code: 'MDTCLS' },
                  ]
                },
                {
                  items: [
                    { label: 'Conditions de facturation', type: 'fonction', code: 'GESINVCND' },
                  ]
                }
              ]
            ]
          },
          {
            label: 'Tables comptables',
            items: [
              [
                {
                  label: 'Générale', type: 'categorie', code: 'MDCGE',
                  items: [
                    { label: 'Comptes', type: 'fonction', code: 'GESGAC' },
                    { label: 'Pyramides de comptes', type: 'fonction', code: 'GESGYM' },
                    { label: 'Groupes de comptes', type: 'fonction', code: 'GESGRY' },
                    { label: 'Journaux comptables', type: 'fonction', code: 'GESJOU' },
                    { label: 'Schémas de comptes', type: 'fonction', code: 'GESGDA' },
                    { label: 'Groupes de collectif', type: 'fonction', code: 'GESGSC' },
                    { label: 'Mappage comptes inter-sociétés', type: 'fonction', code: 'GESTCI' },
                  ]
                },
                {
                  items: [
                    { label: 'Périodes', type: 'fonction', code: 'GESINVCND' },
                  ]
                }
              ], [
                {
                  label: 'Analytique', type: 'categorie', code: 'MDCAN',
                  items: [
                    { label: 'Sections', type: 'fonction', code: 'GESCCE' },
                    { label: 'Pyramides de sections', type: 'fonction', code: 'GESCYM' },
                    { label: 'Groupes de sections', type: 'fonction', code: 'GESCRY' },
                    { label: 'Répartitions a priori', type: 'fonction', code: 'GESDSP' },
                    { label: 'Groupes de répartitions', type: 'fonction', code: 'GESGSP' },
                    { label: 'Codes interdiction', type: 'fonction', code: 'GESCAZ' },
                    { label: 'Unités d\'oeuvre', type: 'fonction', code: 'CCEUOM' },
                  ]
                },
              ], [
                {
                  items: [
                    { label: 'Exercices', type: 'fonction', code: 'GESFIY' },
                  ]
                }
              ]
            ]
          },
          {
            label: 'Tables comptabilité tiers',
            items: [
              [
                {
                  items: [
                    { label: 'Comptes en banque', type: 'fonction', code: 'GESBAN' },
                  ]
                },
                {
                  items: [
                    { label: 'Caisses', type: 'fonction', code: 'GESCAI' },
                  ]
                },
                {
                  items: [
                    { label: 'Pools bancaires', type: 'fonction', code: 'GESPOO' },
                  ]
                },
                {
                  items: [
                    { label: 'Groupes de devises', type: 'fonction', code: 'GESGCU' },
                  ]
                },
                {
                  items: [
                    { label: 'Groupe bancaire', type: 'fonction', code: 'GESBGR' },
                  ]
                },
                {
                  items: [
                    { label: 'Chèques', type: 'fonction', code: 'GESCHB' },
                  ]
                }
              ]]
          },
          {
            label: 'Tables immobilisations',
            items: [
              [
                {
                  items: [
                    { label: 'Familles immobilisation', type: 'fonction', code: 'GESFAM' },
                  ]
                },
                {
                  items: [
                    { label: 'Associations - valeurs', type: 'fonction', code: 'GESRVA' },
                  ]
                },
                {
                  items: [
                    { label: 'Secteurs d\'activité', type: 'fonction', code: 'GESSEA' },
                  ]
                },
                {
                  items: [
                    { label: 'Définition des flux comptables', type: 'fonction', code: 'GESFLU' },
                  ]
                },
                {
                  items: [
                    { label: 'Coeff. et indices réévaluation', type: 'fonction', code: 'GESCOE' },
                  ]
                },
                {
                  items: [
                    { label: 'Eclatement - Clés ventilation', type: 'fonction', code: 'GESBRD' },
                  ]
                },
              ]]
          },
          {
            label: 'Tiers',
            items: [
              [
                {
                  items: [
                    { label: 'Tiers', type: 'fonction', code: 'GESBPR' },
                  ]
                },
                {
                  items: [
                    { label: 'Clients', type: 'fonction', code: 'GESBPC' },
                  ]
                },
                {
                  items: [
                    { label: 'Représentants', type: 'fonction', code: 'GESREP' },
                  ]
                },
                {
                  items: [
                    { label: 'Factors', type: 'fonction', code: 'GESFCT' },
                  ]
                },
                {
                  label: 'Utilitaires', type: 'categorie', code: 'MDBPU',
                  items: [
                    { label: 'Contrôle tiers inter-site', type: 'fonction', code: 'FUNCTLBPR' },
                    { label: 'Validation adresse', type: 'fonction', code: 'FUNADRVAL' },
                    { label: 'Revalidation ID TVA intracom', type: 'fonction', code: 'EVCBAT' },
                  ]
                },
              ],
              [
                {
                  items: [
                    { label: 'Prospects', type: 'fonction', code: 'GESBPP' },
                  ]
                },
                {
                  items: [
                    { label: 'Catégories fournisseurs', type: 'fonction', code: 'GESBSG' },
                  ]
                },
                {
                  items: [
                    { label: 'Leads', type: 'fonction', code: 'GESLDS' },
                  ]
                },
                {
                  items: [
                    { label: 'Prestataires d\'honoraires', type: 'fonction', code: 'GESPRV' },
                  ]
                },
              ],
              [
                {
                  items: [
                    { label: 'Catégories clients', type: 'fonction', code: 'GESBCG' },
                  ]
                },
                {
                  items: [
                    { label: 'Fournisseurs', type: 'fonction', code: 'GESBPS' },
                  ]
                },
                {
                  items: [
                    { label: 'Transporteurs', type: 'fonction', code: 'GESBPT' },
                  ]
                },
                {
                  items: [
                    { label: 'Recherche Client', type: 'fonction', code: 'FUNCUSSEA' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Articles',
            items: [
              [
                {
                  items: [
                    { label: 'Catégories articles', type: 'fonction', code: 'GESITG' },
                  ]
                },
                {
                  items: [
                    { label: 'Articles - Dépôts', type: 'fonction', code: 'GESITW' },
                  ]
                },
                {
                  items: [
                    { label: 'Versions', type: 'fonction', code: 'GESECS' },
                  ]
                },
              ], [
                {
                  items: [
                    { label: 'Articles', type: 'fonction', code: 'GESITM' },
                  ]
                },
                {
                  label: 'Articles - Coûts', type: 'categorie', code: 'MDITC',
                  items: [
                    { label: 'Coûts standards', type: 'fonction', code: 'GESICD' },
                    { label: 'Coûts standards actualisés', type: 'fonction', code: 'GESICA' },
                    { label: 'Coûts standards budget', type: 'fonction', code: 'GESICB' },
                    { label: 'Coûts standards simulés', type: 'fonction', code: 'GESICS' },
                    { label: 'Consultation coûts standards', type: 'fonction', code: 'FUNITC' },
                  ]
                },
              ], [
                {
                  items: [
                    { label: 'Articles - Sites', type: 'fonction', code: 'GESITF' },
                  ]
                },
                {
                  label: 'Utilitaires', type: 'categorie', code: 'MDITU',
                  items: [
                    { label: 'Changement catégorie', type: 'fonction', code: 'FUNCHGITG' },
                    { label: 'Création article-site', type: 'fonction', code: 'CREITFMA' },
                    { label: 'Ajout de pièces jointes', type: 'fonction', code: 'ZPJAJITM' },
                    { label: 'Remplacement de pièces jointes', type: 'fonction', code: 'ZPJRPLITM' },
                    { label: 'MAJ articles embarqués', type: 'fonction', code: 'ZMAJARTEMB' },
                  ]
                }
              ],
            ]
          },
          {
            label: 'Nomenclatures',
            items: [
              [
                {
                  items: [
                    { label: 'Alternatives nomenclature', type: 'fonction', code: 'GESTBO' },
                  ]
                },
                {
                  items: [
                    { label: 'Nomenclatures sous-traitance', type: 'fonction', code: 'GESBODS' },
                  ]
                },
                {
                  items: [
                    { label: 'Calcul besoin composants', type: 'fonction', code: 'BOMRET' },
                  ]
                },
                {
                  label: 'Suppression', type: 'categorie', code: 'MSUPP',
                  items: [
                    { label: 'Composants', type: 'fonction', code: 'SUPPRCOMP' },
                    { label: 'Services', type: 'fonction', code: 'SUPPRSRV' },
                    { label: 'Impression nomenclatures', type: 'fonction', code: 'BOMPRN' },
                  ]
                },
              ],
              [
                {
                  items: [
                    { label: 'Nomenclatures commerciales', type: 'fonction', code: 'GESBODC' },
                  ]
                },
                {
                  items: [
                    { label: 'Nomenclatures multi niveaux', type: 'fonction', code: 'VISUBOMJ' },
                  ]
                },
                {
                  label: 'Cas d\'emploi', type: 'categorie', code: 'MCAS',
                  items: [
                    { label: 'Composants', type: 'fonction', code: 'CASNOMENP' },
                    { label: 'Services', type: 'fonction', code: 'CASNOMENS' },
                  ]
                },
                {
                  label: 'Codes plus bas niveau', type: 'categorie', code: 'MDBLC',
                  items: [
                    { label: 'Consultation', type: 'fonction', code: 'CONSLLC' },
                    { label: 'Resynchronisation', type: 'fonction', code: 'SYNCLLC' },
                  ]
                },
              ],
              [
                {
                  items: [
                    { label: 'Nomenclatures production', type: 'fonction', code: 'GESBODP' },
                  ]
                },
                {
                  items: [
                    { label: 'Recette', type: 'fonction', code: 'VISUBOMROU' },
                  ]
                },
                {
                  label: 'Remplacement', type: 'categorie', code: 'MREMP',
                  items: [
                    { label: 'Composants', type: 'fonction', code: 'REMPLCOMP' },
                    { label: 'Services', type: 'fonction', code: 'REMPLSRV' },
                  ]
                },
                {
                  items: [
                    { label: 'Copie nomenclatures', type: 'fonction', code: 'COPYNOMEN' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Configurateur',
            items: [
              [
                {
                  items: [
                    { label: 'Configurateur', type: 'fonction', code: 'FUNCFG' },
                  ]
                },
                {
                  items: [
                    { label: 'Sélections', type: 'fonction', code: 'FUNCFGS' },
                  ]
                },
                {
                  items: [
                    { label: 'Historique des configurations', type: 'fonction', code: 'GESCFH' },
                  ]
                },
                {
                  items: [
                    { label: 'Automate configurateur', type: 'fonction', code: 'FUNCFGAUT' },
                  ]
                },
                {
                  items: [
                    { label: 'Purge des configurations', type: 'fonction', code: 'FUNCFGPUR' },
                  ]
                }
              ]
            ]
          },
          {
            label: 'Contrôle de gestion',
            items: [
              [
                {
                  items: [
                    { label: 'Sections de valorisation', type: 'fonction', code: 'GESMWC' },
                  ]
                },
                {
                  items: [
                    { label: 'Catégories frais généraux', type: 'fonction', code: 'GESONA' },
                  ]
                },
                {
                  items: [
                    { label: 'Codes frais généraux', type: 'fonction', code: 'GESOVE' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Relation client',
            items: [
              [
                {
                  label: 'Action commerciale', type: 'categorie', code: 'MACA',
                  items: [
                    { label: 'Correspondants', type: 'fonction', code: 'GESCOR' },
                    { label: 'Ressources', type: 'fonction', code: 'GESRSE' },
                    { label: 'Réservations de ressources', type: 'fonction', code: 'GESRRS' },
                    { label: 'Secteurs de marché', type: 'fonction', code: 'GESMST' },
                    { label: 'Affectation secteurs marché', type: 'fonction', code: 'FUNMST6' },
                    { label: 'Gestion des hors-secteurs', type: 'fonction', code: 'FUNMST8' },
                    { label: 'Consultation des secteurs', type: 'fonction', code: 'FUNMST7' },
                    { label: 'Secteurs lead', type: 'fonction', code: 'GESSPT' },
                    { label: 'Affectation piste', type: 'fonction', code: 'FUNSPT6' },
                  ]
                },
                {
                  label: 'Régénérations', type: 'categorie', code: 'MUTI',
                  items: [
                    { label: 'Clients internes', type: 'fonction', code: 'FUNINTBPC' },
                  ]
                },
              ], [
                {
                  label: 'Support client', type: 'categorie', code: 'MHDA',
                  items: [
                    { label: 'Queues', type: 'fonction', code: 'GESQUE' },
                    { label: 'Familles de compétences', type: 'fonction', code: 'GESPBL' },
                    { label: 'Modèles de contrat de service', type: 'fonction', code: 'GESCOT' },
                    { label: 'Historique des indices', type: 'fonction', code: 'FUNCON6' },
                    { label: 'Débits de points', type: 'fonction', code: 'GESPBL' },
                    { label: 'Articles pour horodatage', type: 'fonction', code: 'GESHOI' },
                    { label: 'Coupons de garantie', type: 'fonction', code: 'GESFLY' },
                    { label: 'Texte e-mails CRM', type: 'fonction', code: 'GESHTMMAI' },
                  ]
                },
              ], [
                {
                  label: 'Marketing', type: 'categorie', code: 'MMKA',
                  items: [
                    { label: 'Articles concurrents', type: 'fonction', code: 'GESCCC' },
                    { label: 'Déroulement scripts d\'appel', type: 'fonction', code: 'GESSCP' },
                    { label: 'Etat mailing', type: 'fonction', code: 'GESOMR' },
                  ]
                },
              ],
            ]
          },
          {
            label: 'Données Safe X3 WAS',
            items: [
              [
                {
                  items: [
                    { label: 'Utilisateurs Safe X3 WAS', type: 'fonction', code: 'GESTAU' },
                  ]
                },
                {
                  items: [
                    { label: 'Panier d\'achat', type: 'fonction', code: 'GESTBA' },
                  ]
                },
                {
                  items: [
                    { label: 'Articles Safe X3 WAS', type: 'fonction', code: 'GESTIT' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Note de transport',
            items: [
              [
                {
                  items: [
                    { label: 'Type note transport', type: 'fonction', code: 'ECMLINK' },
                  ]
                },
                {
                  items: [
                    { label: 'Note de transport', type: 'fonction', code: 'GESTNH' },
                  ]
                },
                {
                  items: [
                    { label: 'Validation note de transport', type: 'fonction', code: 'GESTTN' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Affaires',
            items: [
              [
                {
                  items: [
                    { label: 'Catégories de tâches', type: 'fonction', code: 'GESCTA' },
                  ]
                },
                {
                  items: [
                    { label: 'Nature de dépense', type: 'fonction', code: 'GESPJCC' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Gestion FAI',
            items: [
              [
                {
                  items: [
                    { label: 'FAI de référence', type: 'fonction', code: 'GESXX1JFFR' },
                  ]
                },
                {
                  items: [
                    { label: 'FAI', type: 'fonction', code: 'GESXX1JFFAI' },
                  ]
                },
              ]
            ] as ExtendedMenuItem[][]
          },
        ];
      case 'Relation client':
        return [
          {
            label: 'Relation client',
            items: [
              [
                {
                  items: [
                    { label: 'Identifier', type: 'fonction', code: 'FUNCRM9' },
                  ]
                },
              ],
            ]
          },
          {
            label: 'Action commerciale',
            items: [
              [
                {
                  items: [
                    { label: 'Agenda', type: 'fonction', code: 'FUNCRMAGD' },
                  ]
                },
                {
                  items: [
                    { label: 'Tâches', type: 'fonction', code: 'GESTSK' },
                  ]
                },
                {
                  items: [
                    { label: 'Appels', type: 'fonction', code: 'GESCLL' },
                  ]
                },
                {
                  items: [
                    { label: 'Rendez-vous', type: 'fonction', code: 'GESBAP' },
                  ]
                },
                {
                  items: [
                    { label: 'Affaires', type: 'fonction', code: 'GESOPP' },
                  ]
                },
                {
                  label: 'Consultations', type: 'categorie', code: 'MCCNS',
                  items: [
                    { label: 'Tracabilité pièces', type: 'fonction', code: 'CONSPIC' },
                  ]
                },
              ],
            ]
          },
          {
            label: 'Support client',
            items: [
              [
                {
                  items: [
                    { label: 'Agenda', type: 'fonction', code: 'FUNHDKAGD' },
                  ]
                },
                {
                  items: [
                    { label: 'Demandes de service', type: 'fonction', code: 'GESSRE' },
                  ]
                },
                {
                  items: [
                    { label: 'Interventions', type: 'fonction', code: 'GESITN' },
                  ]
                },
                {
                  items: [
                    { label: 'Solutions', type: 'fonction', code: 'GESSOL' },
                  ]
                },
                {
                  items: [
                    { label: 'Parc client', type: 'fonction', code: 'GESMAC' },
                  ]
                },
                {
                  items: [
                    { label: 'Demandes de garantie', type: 'fonction', code: 'GESRQW' },
                  ]
                },
                {
                  items: [
                    { label: 'Contrats de service', type: 'fonction', code: 'GESCON' },
                  ]
                },
                {
                  label: 'Consultations', type: 'categorie', code: 'MHCNS',
                  items: [
                    { label: 'Contrats de service', type: 'fonction', code: 'CONSCON' },
                    { label: 'Traçabilité pièces', type: 'fonction', code: 'CONSPIH' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Marketing',
            items: [
              [
                {
                  items: [
                    { label: 'Planning marketing', type: 'fonction', code: 'FUNPLG' },
                  ]
                },
                {
                  items: [
                    { label: 'Campagnes marketing', type: 'fonction', code: 'GESCMG' },
                  ]
                },
                {
                  label: 'Opérations marketing', type: 'categorie', code: 'MPOPG',
                  items: [
                    { label: 'Publipostages', type: 'fonction', code: 'GESOMM' },
                    { label: 'Campagnes d\'appels', type: 'fonction', code: 'GESOMP' },
                    { label: 'Salons professionnels', type: 'fonction', code: 'GESOMT' },
                    { label: 'Campagnes de presse', type: 'fonction', code: 'GESOMN' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Utilitaires',
            items: [
              [
                {
                  items: [
                    { label: 'Resynchronisation en-cours client', type: 'fonction', code: 'FUNCRMLCM' },
                  ]
                },
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case 'Affaires':
        return [
          {
            label: 'Affaires',
            items: [
              [
                {
                  items: [
                    { label: 'Gestion des affaires', type: 'fonction', code: 'GESPJM' },
                  ]
                },
                {
                  items: [
                    { label: 'Suivi financier', type: 'fonction', code: 'PJMFINOV0' },
                  ]
                },
                {
                  items: [
                    { label: 'Copie d\'affaire', type: 'fonction', code: 'PJMACTAFCP' },
                  ]
                },
                {
                  items: [
                    { label: 'Saisie des temps', type: 'fonction', code: 'PJMTE' },
                  ]
                },
                {
                  items: [
                    { label: 'Création documents de vente', type: 'fonction', code: 'GESPSO' },
                  ]
                },
                {
                  items: [
                    { label: 'Extraction états financiers', type: 'fonction', code: 'PJMRPTEXT' },
                  ]
                },
                {
                  items: [
                    { label: 'Resynchronisation commandes ventes', type: 'fonction', code: 'PJMSOQSYN' },
                  ]
                },
                {
                  label: 'Interfaces', type: 'categorie', code: '0000000',
                  items: [
                    { label: 'Export affaires vers e-Temptation', type: 'fonction', code: 'ZETEMPAFF' },
                    { label: 'Export pointages OF vers e-Temptation', type: 'fonction', code: 'ZETEMPOF' },
                    { label: 'Import temps saisis / affaire depuis e-Temptation', type: 'fonction', code: 'ZETEMPTPS' },
                  ]
                },
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case 'Achats':
        return [
          {
            label: 'Tarifs',
            items: [
              [
                {
                  items: [
                    { label: 'Recherche tarifs', type: 'fonction', code: 'FUNACHPPSI' },
                  ]
                },
                {
                  items: [
                    { label: 'Saisie des tarifs', type: 'fonction', code: 'GESPPL' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Approvisionnement',
            items: [
              [
                {
                  items: [
                    { label: 'Planning global', type: 'fonction', code: 'FUNGBENCHA' },
                  ]
                },
                {
                  items: [
                    { label: 'Plan de travail', type: 'fonction', code: 'FUNDBENCHA' },
                  ]
                },
                {
                  items: [
                    { label: 'Plan de regroupement', type: 'fonction', code: 'FUNMPICKA' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Demandes d\'achat',
            items: [
              [
                {
                  items: [
                    { label: 'Demandes d\'achat', type: 'fonction', code: 'GESPSH' },
                  ]
                },
                {
                  label: 'Solde demandes d\'achat', type: 'categorie', code: 'MPRQS',
                  items: [
                    { label: 'Solde automatique', type: 'fonction', code: 'FUNPSH' },
                    { label: 'solde manuel', type: 'fonction', code: 'FUNPSH2' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Appels d\'offres',
            items: [
              [
                {
                  items: [
                    { label: 'Demandes', type: 'fonction', code: 'GESPQH' },
                  ]
                },
                {
                  items: [
                    { label: 'Réponses', type: 'fonction', code: 'GESPPD' },
                  ]
                },
                {
                  items: [
                    { label: 'Relances', type: 'fonction', code: 'FUNREL' },
                  ]
                },
                {
                  items: [
                    { label: 'Génération lignes tarifs', type: 'fonction', code: 'FUNPPD3' },
                  ]
                }
              ]
            ]
          },
          {
            label: 'Sous-traitance',
            items: [
              [
                {
                  items: [
                    { label: 'Ordres de sous-traitance', type: 'fonction', code: 'GESSCO' },
                  ]
                },
                {
                  items: [
                    { label: 'Allocations automatiques', type: 'fonction', code: 'FUNTEOALL' },
                  ]
                },
                {
                  items: [
                    { label: 'Désallocations automatiques', type: 'fonction', code: 'FUNTEODESA' },
                  ]
                },
                {
                  items: [
                    { label: 'Clôture/solde en série', type: 'fonction', code: 'FUNTEOCLO' },
                  ]
                }
              ]
            ]
          },
          {
            label: 'Commandes',
            items: [
              [
                {
                  items: [
                    { label: 'Plan de l\'acheteur', type: 'fonction', code: 'GESPOI' },
                  ]
                },
                {
                  items: [
                    { label: 'Commandes', type: 'fonction', code: 'GESPOH' },
                  ]
                },
                {
                  items: [
                    { label: 'Commandes ouvertes', type: 'fonction', code: 'GESPOC' },
                  ]
                },
                {
                  items: [
                    { label: 'Demandes de livraisons', type: 'fonction', code: 'GESPOD' },
                  ]
                },
                {
                  items: [
                    { label: 'Visu demandes de livraisons', type: 'fonction', code: 'GESPOV' },
                  ]
                },
                {
                  items: [
                    { label: 'Contremarques', type: 'fonction', code: 'FUNPOHW' },
                  ]
                },
                {
                  items: [
                    { label: 'Solde des commandes', type: 'fonction', code: 'FUNCLEAR' },
                  ]
                },
                {
                  items: [
                    { label: 'Gestion des acomptes', type: 'fonction', code: 'FUNPNS' },
                  ]
                }
              ]
            ]
          },
          {
            label: 'Expéditions',
            items: [
              [
                {
                  items: [
                    { label: 'Conteneur', type: 'fonction', code: 'GESCTRH' },
                  ]
                },
                {
                  items: [
                    { label: 'Expéditions', type: 'fonction', code: 'GESSHIP' },
                  ]
                },
                {
                  items: [
                    { label: 'Transport', type: 'fonction', code: 'GESTRNP' },
                  ]
                },
                {
                  items: [
                    { label: 'Pré-réception des expéditions', type: 'fonction', code: 'GESPPTS' },
                  ]
                }
              ]
            ]
          },
          {
            label: 'Réceptions',
            items: [
              [
                {
                  items: [
                    { label: 'Réceptions', type: 'fonction', code: 'GESPTH2' },
                  ]
                },
                {
                  items: [
                    { label: 'Pré-réception des commandes', type: 'fonction', code: 'GESPPTO' },
                  ]
                }
              ]
            ]
          },
          {
            label: 'Factures',
            items: [
              [
                {
                  items: [
                    { label: 'Factures', type: 'fonction', code: 'GESPIH' },
                  ]
                },
                {
                  items: [
                    { label: 'Validation des factures', type: 'fonction', code: 'FUNPIH' },
                  ]
                }
              ]
            ]
          },
          {
            label: 'Retours',
            items: [
              [
                {
                  items: [
                    { label: 'Retours d\'achat', type: 'fonction', code: 'GESPNH' },
                  ]
                },
                {
                  items: [
                    { label: 'Validation des retours', type: 'fonction', code: 'FUNPNHTRT' },
                  ]
                },
                {
                  items: [
                    { label: 'Bon de transport', type: 'fonction', code: 'GESBOLP' },
                  ]
                }
              ]
            ]
          },
          {
            label: 'Consultations',
            items: [
              [
                {
                  label: 'Demandes d\'achat', type: 'categorie', code: 'MPCND',
                  items: [
                    { label: 'Lignes demandes d\'achat', type: 'fonction', code: 'CONSCPD' },
                  ]
                },
                {
                  label: 'Réceptions', type: 'categorie', code: 'MPCNR',
                  items: [
                    { label: 'Liste réceptions', type: 'fonction', code: 'CONSCPR' },
                    { label: 'Lignes réceptions', type: 'fonction', code: 'CONSCPS' },
                    { label: 'Réceptions par période', type: 'fonction', code: 'FUNGRHPR' },
                  ]
                },
                {
                  items: [
                    { label: 'Traçabilité pièces', type: 'fonction', code: 'CONSPIA' },
                  ]
                },
              ], [
                {
                  label: 'Sous-traitance', type: 'categorie', code: 'MPCNE',
                  items: [
                    { label: 'Allocations', type: 'fonction', code: 'CONSALLA' },
                    { label: 'Allocations en rupture', type: 'fonction', code: 'CONSSHTA' },
                    { label: 'Consommation sous-traitance', type: 'fonction', code: 'CONSSCM' },
                  ]
                },
                {
                  label: 'Factures', type: 'categorie', code: 'MPCNF',
                  items: [
                    { label: 'Liste factures', type: 'fonction', code: 'CONSCPI' },
                    { label: 'Lignes factures', type: 'fonction', code: 'CONSCPJ' },
                    { label: 'Factures par période', type: 'fonction', code: 'FUNGRHPI' },
                    { label: 'Palmarès factures', type: 'fonction', code: 'FUNGRHPI2' },
                  ]
                },
                {
                  items: [
                    { label: 'Produits par fournisseur', type: 'fonction', code: 'CONSBPSI' },
                  ]
                },
              ], [
                {
                  label: 'Commandes', type: 'categorie', code: 'MPCNC',
                  items: [
                    { label: 'Liste commandes', type: 'fonction', code: 'CONSCPO' },
                    { label: 'Lignes commandes', type: 'fonction', code: 'CONSCPP' },
                    { label: 'Lignes sous-traitance', type: 'fonction', code: 'CONSSSC' },
                    { label: 'Commandes par période', type: 'fonction', code: 'FUNGRHPO' },
                  ]
                },
                {
                  label: 'Retours', type: 'categorie', code: 'MPCNZ',
                  items: [
                    { label: 'Liste retours', type: 'fonction', code: 'CONSCPN' },
                    { label: 'Lignes retours', type: 'fonction', code: 'CONSCPQ' },
                    { label: 'Retours par période', type: 'fonction', code: 'FUNGRHPN' },
                    { label: 'Palmarès retours', type: 'fonction', code: 'FUNGRHPN2' },
                  ]
                },
                {
                  label: 'Expéditions', type: 'categorie', code: 'MPCNI',
                  items: [
                    { label: 'Transport', type: 'fonction', code: 'CONSTRN' },
                    { label: 'Lignes d\'expéditions', type: 'fonction', code: 'CONSSHIPD' },
                  ]
                }
              ]
            ]
          },
          {
            label: 'Utilitaires',
            items: [
              [
                {
                  items: [
                    { label: 'Resynchronisation en-cours', type: 'fonction', code: 'FUNBPSMVT' },
                  ]
                },
                {
                  items: [
                    { label: 'Resynchronisation engagements', type: 'fonction', code: 'FUNUTICMM' },
                  ]
                },
                {
                  items: [
                    { label: 'Resynchronisation sous-traitance', type: 'fonction', code: 'FUNSCOMVT' },
                  ]
                },
                {
                  items: [
                    { label: 'Contrôle contrats inter-sites', type: 'fonction', code: 'FUNUTIPOC' },
                  ]
                },
                {
                  items: [
                    { label: 'MAJ situation en masse', type: 'fonction', code: 'ZMAJSITUATIO' },
                  ]
                }
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case 'Ventes':
        return [
          {
            label: 'Tarifs',
            items: [
              [
                {
                  items: [
                    { label: 'Recherche tarifs', type: 'fonction', code: 'FUNVENSPSI' },
                  ]
                },
                {
                  items: [
                    { label: 'Saisie tarifs', type: 'fonction', code: 'GESSPL' },
                  ]
                },
                {
                  items: [
                    { label: 'Génération catalogues tarifs', type: 'fonction', code: 'GESSPP' },
                  ]
                },
                {
                  items: [
                    { label: 'Définition révision tarifs', type: 'fonction', code: 'GESSNE' },
                  ]
                },
                {
                  items: [
                    { label: 'Révision tarifs', type: 'fonction', code: 'FUNSPCINC' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Devis',
            items: [
              [
                {
                  items: [
                    { label: 'Devis', type: 'fonction', code: 'GESSQH' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Devis Technique',
            items: [
              [
                {
                  items: [
                    { label: 'Détermination marge', type: 'fonction', code: 'GESXX1JTXMM' },
                  ]
                },
                {
                  items: [
                    { label: 'Devis technique', type: 'fonction', code: 'GESXX1JTXSQ' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Commandes',
            items: [
              [
                {
                  items: [
                    { label: 'Commandes', type: 'fonction', code: 'GESSOH' },
                  ]
                },
                {
                  items: [
                    { label: 'Commandes ouvertes', type: 'fonction', code: 'GESSOR' },
                  ]
                },
                {
                  items: [
                    { label: 'Demandes de livraisons', type: 'fonction', code: 'GESSOH' },
                  ]
                },
                {
                  items: [
                    { label: 'Visu demandes de livraisons', type: 'fonction', code: 'GESSOV' },
                  ]
                },
                {
                  items: [
                    { label: 'Gestion des acomptes', type: 'fonction', code: 'FUNSNS' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Allocations',
            items: [
              [
                {
                  items: [
                    { label: 'Réservations clients', type: 'fonction', code: 'FUNBPCALL' },
                  ]
                },
                {
                  items: [
                    { label: 'Allocations automatiques', type: 'fonction', code: 'FUNAUTALL' },
                  ]
                },
                {
                  items: [
                    { label: 'Allocations par article', type: 'fonction', code: 'FUNMANALL' },
                  ]
                },
                {
                  items: [
                    { label: 'Désallocations', type: 'fonction', code: 'FUNDESALL' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Préparations d\'expéditions',
            items: [
              [
                {
                  items: [
                    { label: 'Génération listes de préparation', type: 'fonction', code: 'FUNAUTPRE2' },
                  ]
                },
                {
                  items: [
                    { label: 'Plans de préparation', type: 'fonction', code: 'FUNPREP2' },
                  ]
                },
                {
                  items: [
                    { label: 'Bons de préparation', type: 'fonction', code: 'GESPRH2' },
                  ]
                },
                {
                  items: [
                    { label: 'Colisage déclaratif', type: 'fonction', code: 'FUNPKD2' },
                  ]
                },
                {
                  items: [
                    { label: 'Post-colisage', type: 'fonction', code: 'FUNPKP2' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Livraisons',
            items: [
              [
                {
                  items: [
                    { label: 'Livraisons', type: 'fonction', code: 'GESSDH' },
                  ]
                },
                {
                  items: [
                    { label: 'Génération livraison commande', type: 'fonction', code: 'FUNAUTDLV' },
                  ]
                },
                {
                  items: [
                    { label: 'Livraisons des bons préparation', type: 'fonction', code: 'FUNPREDLV' },
                  ]
                },
                {
                  items: [
                    { label: 'Validation des livraisons', type: 'fonction', code: 'FUNCFMDLV' },
                  ]
                },
                {
                  items: [
                    { label: 'Bon de transport', type: 'fonction', code: 'GESBOLS' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Factures',
            items: [
              [
                {
                  items: [
                    { label: 'Factures', type: 'fonction', code: 'GESSIH' },
                  ]
                },
                {
                  items: [
                    { label: 'Génération factures commandes', type: 'fonction', code: 'FUNAUTINVO' },
                  ]
                },
                {
                  items: [
                    { label: 'Génération factures livraisons', type: 'fonction', code: 'FUNAUTINVD' },
                  ]
                },
                {
                  items: [
                    { label: 'Génération factures contrats', type: 'fonction', code: 'FUNAUTINVC' },
                  ]
                },
                {
                  items: [
                    { label: 'Génération factures services', type: 'fonction', code: 'FUNAUTINVS' },
                  ]
                },
                {
                  items: [
                    { label: 'Génération factures transferts', type: 'fonction', code: 'FUNAUTINVT' },
                  ]
                },
                {
                  items: [
                    { label: 'Génération factures échéances', type: 'fonction', code: 'FUNAUTINVSCH' },
                  ]
                },
                {
                  items: [
                    { label: 'Validation facture/avoir vente', type: 'fonction', code: 'FUNCFMINV' },
                  ]
                },
                {
                  items: [
                    { label: 'Emission des acomptes', type: 'fonction', code: 'FUNEMIINS' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Retours',
            items: [
              [
                {
                  items: [
                    { label: 'Retours client', type: 'fonction', code: 'GESSRH' },
                  ]
                },
                {
                  items: [
                    { label: 'Retours prêt', type: 'fonction', code: 'GESSRL' },
                  ]
                },
                {
                  items: [
                    { label: 'Retours matières sous-traitance', type: 'fonction', code: 'GESSRS' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Consultations',
            items: [
              [
                {
                  label: 'Devis', type: 'categorie', code: 'MSCND',
                  items: [
                    { label: 'Liste Devis', type: 'fonction', code: 'CONSCSQ' },
                    { label: 'Lignes devis', type: 'fonction', code: 'CONSCSL' },
                    { label: 'Devis par période', type: 'fonction', code: 'FUNGRHSQH1' },
                    { label: 'Devis par représentant', type: 'fonction', code: 'FUNGRHSQH3' },
                    { label: 'Palmarès Devis', type: 'fonction', code: 'FUNGRHSQH2' },
                  ]
                },
                {
                  label: 'Factures', type: 'categorie', code: 'MSCNF',
                  items: [
                    { label: 'Liste factures', type: 'fonction', code: 'CONSCSI' },
                    { label: 'Lignes factures', type: 'fonction', code: 'CONSCST' },
                    { label: 'Factures par période', type: 'fonction', code: 'FUNGRHSIH1' },
                    { label: 'Factures par représentant', type: 'fonction', code: 'FUNGRHSIH3' },
                    { label: 'Palmarès factures', type: 'fonction', code: 'FUNGRHSIH2' },
                  ]
                },
              ],
              [
                {
                  label: 'Commandes', type: 'categorie', code: 'MSCNC',
                  items: [
                    { label: 'Liste commandes', type: 'fonction', code: 'CONSCSO' },
                    { label: 'Lignes commandes', type: 'fonction', code: 'CONSCSP' },
                    { label: 'Commandes par période', type: 'fonction', code: 'FUNGRHSOH1' },
                    { label: 'Tournées', type: 'fonction', code: 'CONSCSG2' },
                    { label: 'Palmarès commandes', type: 'fonction', code: 'FUNGRHSOH2' },
                  ]
                },
                {
                  label: 'Retours', type: 'categorie', code: 'MSCNR',
                  items: [
                    { label: 'Liste retours', type: 'fonction', code: 'CONSCSN' },
                    { label: 'Lignes retours', type: 'fonction', code: 'CONSCSR' },
                    { label: 'Palmarès motifs retours', type: 'fonction', code: 'FUNGRHSDH2' }
                  ]
                },
                {
                  items: [
                    { label: 'Contenu colis', type: 'fonction', code: 'CONSCOL2' }
                  ]
                }
              ],
              [
                {
                  label: 'Livraisons', type: 'categorie', code: 'MSCNL',
                  items: [
                    { label: 'Liste livraison', type: 'fonction', code: 'CONSCSD' },
                    { label: 'Lignes livraison', type: 'fonction', code: 'CONSCSF' },
                    { label: 'Livraison par période', type: 'fonction', code: 'FUNGRHSDH1' },
                    { label: 'Tournées', type: 'fonction', code: 'CONSCSG' },
                  ]
                },
                {
                  label: 'Allocations', type: 'categorie', code: 'MSCNA',
                  items: [
                    { label: 'Allocations', type: 'fonction', code: 'CONSALLS' },
                    { label: 'Allocations en rupture', type: 'fonction', code: 'CONSSHTS' },
                  ]
                },
                {
                  items: [
                    { label: 'Traçabilité pièces', type: 'fonction', code: 'CONSPIV' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Utilitaires',
            items: [
              [
                {
                  items: [
                    { label: 'Resynchronisation en-cours client', type: 'fonction', code: 'FUNBPCMVT' },
                  ]
                },
                {
                  items: [
                    { label: 'Initialisation Sage Sales Tax', type: 'fonction', code: 'FUNSSTENT' },
                  ]
                },
                {
                  items: [
                    { label: 'MAJ situation en masse', type: 'fonction', code: 'ZMAJSITUATIO' },
                  ]
                },
                {
                  items: [
                    { label: 'Import dates cdes', type: 'fonction', code: 'ZIMPDDSOQ' },
                  ]
                },
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case 'Stocks':
        return [
          {
            label: 'Stocks',
            items: [
              [
                {
                  items: [
                    { label: 'Changement de dépôt', type: 'fonction', code: 'GESCWRH' },
                  ]
                },
                {
                  items: [
                    { label: 'Versions', type: 'fonction', code: 'GESECS' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Préparations d\'expéditions',
            items: [
              [
                {
                  items: [
                    { label: 'Génération listes de préparation', type: 'fonction', code: 'FUNAUTPREP' },
                  ]
                },
                {
                  items: [
                    { label: 'Plan de préparation', type: 'fonction', code: 'FUNPREP' },
                  ]
                },
                {
                  items: [
                    { label: 'Bons de préparation', type: 'fonction', code: 'GESPRH' },
                  ]
                },
                {
                  items: [
                    { label: 'Consultation bons de préparation', type: 'fonction', code: 'CONSPRH' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Colisage',
            items: [
              [
                {
                  items: [
                    { label: 'Colisage déclaratif', type: 'fonction', code: 'FUNPKD' },
                  ]
                },
                {
                  items: [
                    { label: 'Post-colisage', type: 'fonction', code: 'FUNPKP' },
                  ]
                },
                {
                  items: [
                    { label: 'Contenu colis', type: 'fonction', code: 'CONSCOL' },
                  ]
                },
                {
                  items: [
                    { label: 'Impression étiquettes colisage', type: 'fonction', code: 'FUNPKE2' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Flux d\'entrées/sorties',
            items: [
              [
                {
                  items: [
                    { label: 'Entrées diverses', type: 'fonction', code: 'GESSMR' },
                  ]
                },
                {
                  items: [
                    { label: 'Sorties diverses', type: 'fonction', code: 'GESSMO' },
                  ]
                },
                {
                  items: [
                    { label: 'Receptions', type: 'fonction', code: 'GESPTH' },
                  ]
                },
                {
                  label: 'Livraisons', type: 'categorie', code: 'MLIVR',
                  items: [
                    { label: 'Livraisons', type: 'fonction', code: 'GESSDH2' },
                    { label: 'Livraisons des commandes', type: 'fonction', code: 'FUNAUTDLV2' },
                    { label: 'Livraisons des bons préparation', type: 'fonction', code: 'FUNPREDLV2' },
                    { label: 'Validation des livraisons', type: 'fonction', code: 'FUNCFMDLV2' },

                  ]
                },
                {
                  items: [
                    { label: 'Transferts inter-sites', type: 'fonction', code: 'GESSIS' },
                  ]
                },
                {
                  items: [
                    { label: 'Transferts sous-traitants', type: 'fonction', code: 'GESSST' },
                  ]
                },
                {
                  items: [
                    { label: 'Retours sous-traitants', type: 'fonction', code: 'GESSTR' },
                  ]
                },

              ]
            ]
          },
          {
            label: 'Flux internes',
            items: [
              [
                {
                  items: [
                    { label: 'Réappro zone consommation', type: 'fonction', code: 'FUNCALREO' },
                  ]
                },
                {
                  items: [
                    { label: 'Plan de réapprovisionement', type: 'fonction', code: 'FUNREO' },
                  ]
                },
                {
                  items: [
                    { label: 'Plan de rangement', type: 'fonction', code: 'FUNSSL' },
                  ]
                },
                {
                  items: [
                    { label: 'Changements stock', type: 'fonction', code: 'GESSCS' },
                  ]
                },
                {
                  items: [
                    { label: 'Assemblage', type: 'fonction', code: 'GESBBY' },
                  ]
                },
                {
                  items: [
                    { label: 'Désassemblage', type: 'fonction', code: 'GESDBY' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Inventaires',
            items: [
              [
                {
                  items: [
                    { label: 'Calcul comptages', type: 'fonction', code: 'CONSSCI' },
                  ]
                },
                {
                  items: [
                    { label: 'Articles à inventorier', type: 'fonction', code: 'CONSSII' },
                  ]
                },
                {
                  items: [
                    { label: 'Sessions inventaires', type: 'fonction', code: 'GESSNX' },
                  ]
                },
                {
                  items: [
                    { label: 'Inventaires', type: 'fonction', code: 'GESSNL' },
                  ]
                },
                {
                  items: [
                    { label: 'Articles en inventaire', type: 'fonction', code: 'CONSSBII' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Contrôle qualité',
            items: [
              [
                {
                  items: [
                    { label: 'Demandes d\'analyse', type: 'fonction', code: 'GESQCR' }
                  ]
                },
                {
                  items: [
                    { label: 'Relevés de contrôles', type: 'fonction', code: 'GESXX1JCRC' }
                  ]
                },
                {
                  items: [
                    { label: 'Contrôle qualité', type: 'fonction', code: 'GESSTQ' }
                  ]
                },
                {
                  items: [
                    { label: 'Changt statut lots périmés', type: 'fonction', code: 'FUNSTOP' }
                  ]
                },
                {
                  items: [
                    { label: 'Changt statut lots re-contrôle', type: 'fonction', code: 'FUNSTOLTI' }
                  ]
                },
                {
                  label: 'Modification des lots', type: 'categorie', code: 'MSLOT',
                  items: [
                    { label: 'Changement caractéristiques', type: 'fonction', code: 'GESSMX' },
                    { label: 'Changement en série lot', type: 'fonction', code: 'FUNSMXUPD' },
                    { label: 'Renumérotation/mélange', type: 'fonction', code: 'GESSLM' },
                    { label: 'Modification zones utilisateurs', type: 'fonction', code: 'FUNSMU' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Réapprovisionnements',
            items: [
              [
                {
                  items: [
                    { label: 'Prévision de consommation', type: 'fonction', code: 'GESORZS' },
                  ]
                },
                {
                  items: [
                    { label: 'Réapprovisionnements hors MRP', type: 'fonction', code: 'FUNSTKB' },
                  ]
                },
                {
                  items: [
                    { label: 'Calcul besoins nets', type: 'fonction', code: 'FUNMRP' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Affectations',
            items: [
              [
                {
                  items: [
                    { label: 'Plan d\'affectation', type: 'fonction', code: 'FUNMLINK' },
                  ]
                },
                {
                  items: [
                    { label: 'Affectations', type: 'fonction', code: 'FUNMAUTMTO' },
                  ]
                },
                {
                  items: [
                    { label: 'Désaffectations', type: 'fonction', code: 'FUNMDESMTO' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Traitements périodiques',
            items: [
              [
                {
                  label: 'Valorisation',
                  type: 'categorie', code: 'MSVAL',
                  items: [
                    { label: 'Régularisation de prix', type: 'fonction', code: 'FUNSTKADJ' },
                    { label: 'Interface comptable', type: 'fonction', code: 'FUNSTKACC' },
                    { label: 'Etat valorisé des stocks', type: 'fonction', code: 'FUNSTVA' },
                  ]
                },
                {
                  items: [
                    { label: 'Régularisation des stocks manquants', type: 'fonction', code: 'FUNSHTSEL' }
                  ]
                }
              ], [
                {
                  label: 'Purge',
                  type: 'categorie', code: 'MSPUR',
                  items: [
                    { label: 'Mouvements stocks', type: 'fonction', code: 'FUNSTPU' },
                    { label: 'Lots nuls', type: 'fonction', code: 'FUNSTPL' },
                    { label: 'Sessions inventaires', type: 'fonction', code: 'FUNSTPI' },
                    { label: 'Analyses qualité', type: 'fonction', code: 'FUNSTPQ' },
                    { label: 'Numéros séries', type: 'fonction', code: 'FUNSTPE' },
                    { label: 'Traçabilité', type: 'fonction', code: 'FUNSTPT' },
                    { label: 'Purge des suggestions', type: 'fonction', code: 'FUNPURSUGA' },
                  ]
                },
                {
                  items: [
                    { label: 'Validation des périodes stocks', type: 'fonction', code: 'FUNCPTITH' }
                  ]
                },
              ], [
                {
                  items: [
                    { label: 'Calcul classe ABC', type: 'fonction', code: 'FUNSTKA' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Etiquetage',
            items: [
              [
                {
                  items: [
                    { label: 'Impression étiquettes stock', type: 'fonction', code: 'FUNLBEIMP' }
                  ]
                },
                {
                  items: [
                    { label: 'Impression étiquettes colisage', type: 'fonction', code: 'FUNPKE' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Consultations',
            items: [
              [
                {
                  label: 'Stocks', type: 'categorie', code: 'MSINS',
                  items: [
                    { label: 'Stock par site', type: 'fonction', code: 'CONSSFC' },
                    { label: 'Stocks par article', type: 'fonction', code: 'CONSSAR' },
                    { label: 'Stocks par lots', type: 'fonction', code: 'CONSSLO' },
                    { label: 'Numéros de série', type: 'fonction', code: 'CONSSSE	' },
                    { label: 'Stocks détaillés', type: 'fonction', code: 'CONSSDE' },
                    { label: 'Stocks externes', type: 'fonction', code: 'CONSSXT' },
                    { label: 'Stock prêté', type: 'fonction', code: 'CONSSBP' },
                    { label: 'Stock projeté', type: 'fonction', code: 'CONSSPR' },
                    { label: 'Stock disponible', type: 'fonction', code: 'CONSSDI' },
                    { label: 'Stock à date', type: 'fonction', code: 'CONSSDA' },
                    { label: 'Stock périmé', type: 'fonction', code: 'CONSSPE' },
                    { label: 'Stock inactifs', type: 'fonction', code: 'CONSSDO' },
                    { label: 'Export LOB stock à date', type: 'fonction', code: 'ZEXPLOBSAD' }
                  ]
                },
              ], [
                {
                  label: 'Mouvements', type: 'categorie', code: 'MSINM',
                  items: [
                    { label: 'Mouvements par article', type: 'fonction', code: 'CONSSMV' },
                    { label: 'Mouvements par date', type: 'fonction', code: 'CONSSMJ' },
                    { label: 'Mouvements en attente', type: 'fonction', code: 'CONSSAT' },
                    { label: 'Evolution du PMP par mouvement', type: 'fonction', code: 'CONSSMA' },
                    { label: 'Traçabilité', type: 'fonction', code: 'CONSSTK' },
                    { label: 'Traçabilité étendue', type: 'fonction', code: 'XX1JTRA' }
                  ]
                },
                {
                  label: 'Emplacements', type: 'categorie', code: 'MCEM',
                  items: [
                    { label: 'Emplacements', type: 'fonction', code: 'CONSSEA' },
                    { label: 'Emplacements dédiés', type: 'fonction', code: 'CONSSED' },
                    { label: 'Occupation emplacements', type: 'fonction', code: 'CONSSOE' }
                  ]
                },
              ], [
                {
                  label: 'Articles',
                  type: 'categorie', code: 'MSINA',
                  items: [
                    { label: 'Articles en inventaire', type: 'fonction', code: 'CONSSBI' },
                    { label: 'Encours article', type: 'fonction', code: 'CONSORD7' },
                    { label: 'Historique stocks', type: 'fonction', code: 'CONSSHS' }
                  ]
                },
                {
                  label: 'Réapprovisionnements CBN/PDP',
                  type: 'categorie', code: 'MCRE',
                  items: [
                    { label: 'Résultats CBN', type: 'fonction', code: 'CONSSCBCB' },
                    { label: 'Résultats PDP', type: 'fonction', code: 'CONSSCBPD' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Utilitaires',
            items: [
              [
                {
                  label: 'Valorisation', type: 'categorie', code: 'MSSYV',
                  items: [
                    { label: 'Changement de valeur', type: 'fonction', code: 'FUNCHGVAL' },
                    { label: 'Modification date d\'imputation', type: 'fonction', code: 'FUNIPTD' }
                  ]
                },
                {
                  items: [
                    { label: 'Resynchronisation et contrôle stock', type: 'fonction', code: 'FUNSTOR' }
                  ]
                },
                {
                  items: [
                    { label: 'Resynchronisation réapp zone conso', type: 'fonction', code: 'FUNSYNREO' }
                  ]
                },
                {
                  items: [
                    { label: 'Resynchronisation plan de rangement', type: 'fonction', code: 'FUNSYNSRG' }
                  ]
                },
                {
                  items: [
                    { label: 'Resynchronisation emplacements', type: 'fonction', code: 'FUNLOCS' }
                  ]
                },
                {
                  items: [
                    { label: 'Resynchronisation encours', type: 'fonction', code: 'FUNSYNCW' }
                  ]
                },
                {
                  items: [
                    { label: 'Resynchronisation qtés en saisie', type: 'fonction', code: 'FUNSTOWIPW' }
                  ]
                },
                {
                  items: [
                    { label: 'Ré-imp. bartender plan de rng', type: 'fonction', code: 'ZREBARRNG' }
                  ]
                },
                {
                  items: [
                    { label: 'Alerte Kanban', type: 'fonction', code: 'GESZKBN' }
                  ]
                }
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case 'Production':
        return [
          {
            label: 'Données techniques',
            items: [
              [
                {
                  label: 'Centres de production',
                  type: 'categorie', code: 'MMWCR',
                  items: [
                    { label: 'Centres de charge', type: 'fonction', code: 'GESTWC' },
                    { label: 'Postes de charge', type: 'fonction', code: 'GESMWS' },
                    { label: 'Cas d\'emploi postes', type: 'fonction', code: 'GESMWW' }
                  ]
                },
              ], [
                {
                  label: 'Gammes',
                  type: 'categorie', code: 'MMROU',
                  items: [
                    { label: 'Alternatives gammes', type: 'fonction', code: 'GESTRO' },
                    { label: 'Opérations standard', type: 'fonction', code: 'GESROT' },
                    { label: 'Gestion gammes', type: 'fonction', code: 'GESROU' },
                    { label: 'Gammes multi niveaux', type: 'fonction', code: 'VISUROUG' },
                    { label: 'Recette', type: 'fonction', code: 'VISUROUBOM' },
                    { label: 'Cas d\'emploi gammes', type: 'fonction', code: 'GESROW' },
                    { label: 'Instructions opératoires', type: 'fonction', code: 'GESXX1JWIO' }
                  ]
                },
              ], [
                {
                  label: 'Modifications en série',
                  type: 'categorie', code: 'MMTDU',
                  items: [
                    { label: 'Postes de charge', type: 'fonction', code: 'FUNTDUPDW' },
                    { label: 'Opérations standard', type: 'fonction', code: 'FUNSTDTDU' },
                    { label: 'Opérations de gamme', type: 'fonction', code: 'FUNTDUPDR5' },
                    { label: 'Remplacement postes', type: 'fonction', code: 'FUNTDUWST' },
                    { label: 'Variation capacité', type: 'fonction', code: 'FUNTDUVAR' },
                    { label: 'Copie gammes', type: 'fonction', code: 'COPYGAMME' },
                    { label: 'Suppression gammes', type: 'fonction', code: 'SUPGAMME' },
                    { label: 'Poste de charge/Variation capacité', type: 'fonction', code: 'FUNTDUCAP' },
                    { label: 'Ajout PJ sur opérations de gamme', type: 'fonction', code: 'ZPJAJROO' },
                    { label: 'Remplacement PJ sur opérations de gamme', type: 'fonction', code: 'ZPJRPLROO' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Planification',
            items: [
              [
                {
                  items: [
                    { label: 'Prévisions de consommation', type: 'fonction', code: 'GESORZ' }
                  ]
                },
                {
                  items: [
                    { label: 'Regroupement', type: 'fonction', code: 'FUNMPICK' }
                  ]
                },
                {
                  items: [
                    { label: 'Calcul besoins nets', type: 'fonction', code: 'FUNMRPG' }
                  ]
                },
                {
                  items: [
                    { label: 'Modification des objectifs', type: 'fonction', code: 'FUNTDUOF' }
                  ]
                },
                {
                  items: [
                    { label: 'Dates objectifs OF', type: 'fonction', code: 'ZRECALOBJ' }
                  ]
                },
              ], [
                {
                  items: [
                    { label: 'Planning global', type: 'fonction', code: 'FUNGBENCH' }
                  ]
                },
                {
                  items: [
                    { label: 'Ordre de fabrication', type: 'fonction', code: 'GESMFG' }
                  ]
                },
                {
                  items: [
                    { label: 'Planification multi-niveaux', type: 'fonction', code: 'MULTIWOX' }
                  ]
                },
                {
                  items: [
                    { label: 'Replanification en série des OF en-cours', type: 'fonction', code: 'ZRECALOF' }
                  ]
                },
              ], [
                {
                  items: [
                    { label: 'Plan de travail', type: 'fonction', code: 'FUNDBENCH' }
                  ]
                },
                {
                  items: [
                    { label: 'Plan directeur production', type: 'fonction', code: 'FUNMPS' }
                  ]
                },
                {
                  items: [
                    { label: 'Replanification en série', type: 'fonction', code: 'FUNTDUMRP' }
                  ]
                },
                {
                  items: [
                    { label: 'MAJ - Dte réel / Op of', type: 'fonction', code: 'ZMFGO' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Traitements automatiques',
            items: [
              [
                {
                  label: 'Allocation / Désallocation',
                  type: 'categorie', code: 'MMAUA',
                  items: [
                    { label: 'Allocation', type: 'fonction', code: 'FUNMAUTA' },
                    { label: 'Désallocation', type: 'fonction', code: 'FUNMDESA' }
                  ]
                },
                {
                  label: 'Jalonnement / Déjalonnement',
                  type: 'categorie', code: 'MMAUJ',
                  items: [
                    { label: 'Jalonnement', type: 'fonction', code: 'FUNMAUTJ' },
                    { label: 'Déjalonnement', type: 'fonction', code: 'FUNMAUTD' }
                  ]
                },
                {
                  label: 'Ordre de fabrication',
                  type: 'categorie', code: 'MMAUO',
                  items: [
                    { label: 'Décâlage', type: 'fonction', code: 'FUNMAUTP' },
                    { label: 'Suspension', type: 'fonction', code: 'FUNMAUTSU' },
                    { label: 'Réactivation', type: 'fonction', code: 'FUNMAUTRE' },
                    { label: 'Mise à niveau', type: 'fonction', code: 'FUNMAUTM' },
                  ]
                },
                {
                  items: [
                    { label: 'Décâlage opérations', type: 'fonction', code: 'FUNMAUTO' }
                  ]
                },
                {
                  items: [
                    { label: 'Suppression automatique', type: 'fonction', code: 'FUNMAUTS' }
                  ]
                },
                {
                  items: [
                    { label: 'Purge des suggestions', type: 'fonction', code: 'FUNPURSUG' }
                  ]
                },
                {
                  items: [
                    { label: 'Recalcul des charges', type: 'fonction', code: 'FUNMIWL' }
                  ]
                },
              ]
            ]
          },
          {
            label: 'Suivi de fabrication',
            items: [
              [
                {
                  items: [
                    { label: 'Suivi de fabrication', type: 'fonction', code: 'GESMTK' }
                  ]
                },
                {
                  items: [
                    { label: 'Situation OF', type: 'fonction', code: 'FUNMSITU' }
                  ]
                },
                {
                  items: [
                    { label: 'Clôture/solde OF', type: 'fonction', code: 'FUNMCLOSE' }
                  ]
                },
                {
                  items: [
                    { label: 'Clôture/solde en série', type: 'fonction', code: 'FUNTDUCLO' }
                  ]
                },
                {
                  items: [
                    { label: 'Plan de suivi des temps', type: 'fonction', code: 'FUNBENCHO' }
                  ]
                },
                {
                  items: [
                    { label: 'Plan de suivi des matières', type: 'fonction', code: 'FUNBENCHM' }
                  ]
                },
                {
                  items: [
                    { label: 'Plan de production', type: 'fonction', code: 'FUNBENCHI' }
                  ]
                },
                {
                  items: [
                    { label: 'Plan de réintégration', type: 'fonction', code: 'FUNBENCHR' }
                  ]
                },
                {
                  items: [
                    { label: 'Plan des fiches techniques', type: 'fonction', code: 'FUNBENCHT' }
                  ]
                },
                {
                  items: [
                    { label: 'Pilotage des plans de suivi', type: 'fonction', code: 'FUNBENPLT' }
                  ]
                },
                {
                  label: 'Suivi atelier',
                  type: 'categorie', code: 'MMSFT',
                  items: [
                    { label: 'Suivi atelier', type: 'fonction', code: 'FUNSFTPOR' },
                    { label: 'Activité collaborateur', type: 'fonction', code: 'FUNSFTEAC' },
                    { label: 'Validation saisie main oeuvre', type: 'fonction', code: 'FUNSFTVAL' }
                  ]
                },
                {
                  items: [
                    { label: 'Articles à retoucher', type: 'fonction', code: 'GESXX1JP' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Consultations',
            items: [
              [
                {
                  label: 'Charges',
                  type: 'categorie', code: '0000000',
                  items: [
                    { label: 'Charges', type: 'fonction', code: '0000000' },
                    { label: 'Charges graphiques', type: 'fonction', code: '0000000' }
                  ]
                },
                {
                  label: 'Stocks',
                  type: 'categorie', code: '0000000',
                  items: [
                    { label: 'Stock disponible', type: 'fonction', code: '0000000' },
                    { label: 'Stock projeté', type: 'fonction', code: '0000000' }
                  ]
                },
                {
                  label: 'REQUETES PRODUCTION',
                  type: 'categorie', code: '0000000',
                  items: [
                    { label: 'Aucune conso sur OP soldée', type: 'fonction', code: '0000000' },
                    { label: 'DEC_PROD partielle', type: 'fonction', code: '0000000' },
                    { label: 'Défaut statut opération', type: 'fonction', code: '0000000' },
                    { label: 'Sur et sous consommation OF', type: 'fonction', code: '0000000' },
                  ]
                },
                {
                  items: [
                    { label: 'Sous-traitance', type: 'fonction', code: 'CONSSST' }
                  ]
                },
              ], [
                {
                  label: 'Allocations',
                  type: 'categorie', code: 'MMINA',
                  items: [
                    { label: 'Allocations', type: 'fonction', code: 'CONSALLG' },
                    { label: 'Allocations en rupture', type: 'fonction', code: 'CONSSHTG' }
                  ]
                },
                {
                  label: 'Résultats réapprovisionnement',
                  type: 'categorie', code: 'MMINR',
                  items: [
                    { label: 'Résultats PDP', type: 'fonction', code: 'CONSSCBPD1' },
                    { label: 'Résultats CBN', type: 'fonction', code: 'CONSSCBCB1' }
                  ]
                },
                {
                  items: [
                    { label: 'Extract suivi toutes OP', type: 'fonction', code: 'EXEALH' }
                  ]
                },
              ], [
                {
                  label: 'En-cours',
                  type: 'categorie', code: 'MMINE',
                  items: [
                    { label: 'Encours article', type: 'fonction', code: 'CONSORD' },
                    { label: 'Encours charge', type: 'fonction', code: 'CONSOPX' }
                  ]
                },
                {
                  label: 'Suivis',
                  type: 'categorie', code: 'MMINV',
                  items: [
                    { label: 'OF en rupture', type: 'fonction', code: 'CONSSHO' },
                    { label: 'Suivis par OF', type: 'fonction', code: 'GESTKI' },
                    { label: 'Temps passés', type: 'fonction', code: 'CONSMKO' },
                    { label: 'Consommations', type: 'fonction', code: 'CONSMKM' },
                    { label: 'Productions', type: 'fonction', code: 'CONSMKI' },
                    { label: 'Saisie des temps Matricule', type: 'fonction', code: 'CNSXTPS' },
                  ]
                },
                {
                  items: [
                    { label: 'Liste des OF', type: 'fonction', code: 'CONSMFG' }
                  ]
                },
              ]
            ]
          },
          {
            label: 'Analyse',
            items: [
              [
                {
                  items: [
                    { label: 'Analyses de production', type: 'fonction', code: 'FUNANL' }
                  ]
                },
                {
                  items: [
                    { label: 'Edition axes ressources', type: 'fonction', code: 'FUNWANL' }
                  ]
                },
                {
                  items: [
                    { label: 'Edition axes produits', type: 'fonction', code: 'FUNMANL' }
                  ]
                },
              ]
            ]
          },
          {
            label: 'Utilitaires',
            items: [
              [
                {
                  items: [
                    { label: 'Historique PEC', type: 'fonction', code: 'FUNMCOV' }
                  ]
                },
                {
                  items: [
                    { label: 'Réouverture OF', type: 'fonction', code: 'FUNMREACT' }
                  ]
                },
                {
                  items: [
                    { label: 'Resynchronisation charge', type: 'fonction', code: 'FUNSYNCO' }
                  ]
                },
                {
                  items: [
                    { label: 'Ré-impression bartender OF', type: 'fonction', code: 'ZBAROFCRIT' }
                  ]
                },
                {
                  items: [
                    { label: 'Résumé anomalies valo', type: 'fonction', code: 'ZRVRESUME' }
                  ]
                },
                {
                  items: [
                    { label: 'Régulations anomalies valo', type: 'fonction', code: 'ZRVREGUL' }
                  ]
                },
                {
                  items: [
                    { label: 'Export valorisation PRI', type: 'fonction', code: 'ZVALOPRI' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Production Scheduler',
            items: [
              [
                {
                  items: [
                    { label: 'Production Scheduler', type: 'fonction', code: 'FUNPSSCH' }
                  ]
                },
                {
                  items: [
                    { label: 'Consultation Prod. Scheduler', type: 'fonction', code: 'FUNPSVIEW' }
                  ]
                },
                {
                  items: [
                    { label: 'Soumettre à l\'ordonnancement', type: 'fonction', code: 'FUNPSMOPT' }
                  ]
                },
                {
                  items: [
                    { label: 'Retirer de l\'ordonnancement', type: 'fonction', code: 'GESPOPSCV' }
                  ]
                },
                {
                  items: [
                    { label: 'Valeurs personnalisées Production Scheduler', type: 'fonction', code: 'GESPOPSCV' }
                  ]
                },
                {
                  items: [
                    { label: 'Recalcul 1e date dispo mat. OF', type: 'fonction', code: 'FUNPSFDMAUPD' }
                  ]
                }
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case 'Contrôle de gestion':
        return [
          {
            label: 'Calculs coûts prévisionnels',
            items: [
              [
                {
                  items: [
                    { label: 'Calcul coûts standards', type: 'fonction', code: 'CALCSTSTD' }
                  ]
                },
                {
                  items: [
                    { label: 'Calcul coûts actualisés', type: 'fonction', code: 'CALCSTCUT' }
                  ]
                },
                {
                  items: [
                    { label: 'Calcul coûts budget', type: 'fonction', code: 'CALCSTBUD' }
                  ]
                },
                {
                  items: [
                    { label: 'Calcul coûts simulés', type: 'fonction', code: 'CALCSTSIM' }
                  ]
                },
                {
                  items: [
                    { label: 'Mise à jour coûts calculés', type: 'fonction', code: 'CALCSTUPD' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Coûts de fabrication',
            items: [
              [
                {
                  items: [
                    { label: 'Calcul coûts prévisionnels OF', type: 'fonction', code: 'CALMFGCOST' }
                  ]
                },
                {
                  items: [
                    { label: 'Consultation prix revient', type: 'fonction', code: 'GESMFC' }
                  ]
                },
                {
                  items: [
                    { label: 'Consultation coûts prévisionnels', type: 'fonction', code: 'GESMFCP' }
                  ]
                },
                {
                  items: [
                    { label: 'Coûts de revient industriels', type: 'fonction', code: 'GESMWI' }
                  ]
                },
                {
                  items: [
                    { label: 'Calcul prix de revient de fab', type: 'fonction', code: 'FUNWIPMFC' }
                  ]
                },
                {
                  items: [
                    { label: 'Coût en-cours sans OF', type: 'fonction', code: 'FUNWIPBOM' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Coûts de sous-traitance',
            items: [
              [
                {
                  items: [
                    { label: 'Calcul coûts prévisionnels ss-trait', type: 'fonction', code: 'CALSCOCOST' }
                  ]
                },
                {
                  items: [
                    { label: 'Consultation coûts prévisionnels', type: 'fonction', code: 'GESSCCP' }
                  ]
                },
                {
                  items: [
                    { label: 'Consulter en-cours ss-trait.', type: 'fonction', code: 'GESPWI' }
                  ]
                },
                {
                  items: [
                    { label: 'Calcul prix revient sous-traitance', type: 'fonction', code: 'FUNWIPSCO' }
                  ]
                },
                {
                  items: [
                    { label: 'Consultation prix revient', type: 'fonction', code: 'GESSCC' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Analyse performances',
            items: [
              [
                {
                  items: [
                    { label: 'Comparaison des coûts', type: 'fonction', code: 'COMPCOUT' }
                  ]
                },
                {
                  items: [
                    { label: 'Impression comparatif coûts', type: 'fonction', code: 'COMPCOUTM' }
                  ]
                },
                {
                  items: [
                    { label: 'Historique', type: 'fonction', code: 'GESHIC' }
                  ]
                },
                {
                  items: [
                    { label: 'Historique prix de revient', type: 'fonction', code: 'GESHIM' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'En-cours',
            items: [
              [
                {
                  items: [
                    { label: 'Valorisation en-cours', type: 'fonction', code: 'ORDWIPVAL' }
                  ]
                },
                {
                  items: [
                    { label: 'Comptabilisation en-cours OF', type: 'fonction', code: 'FUNWIPACC' }
                  ]
                },
                {
                  items: [
                    { label: 'Export LOB OF', type: 'fonction', code: 'ZEXPLOBOF' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Traitements divers',
            items: [
              [
                {
                  items: [
                    { label: 'Transfert de coûts', type: 'fonction', code: 'COPYCOUT' }
                  ]
                },
                {
                  items: [
                    { label: 'Purger enreg, coûts en-cours', type: 'fonction', code: 'FUNPURWIP' }
                  ]
                },
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case 'Comptabilité':
        return [
          {
            label: 'Pièces',
            items: [
              [
                {
                  items: [
                    { label: 'Saisie pièces', type: 'fonction', code: 'GESGAS' },
                  ]
                },
                {
                  items: [
                    { label: 'Saisie lots', type: 'fonction', code: 'GESLOT' },
                  ]
                },
                {
                  items: [
                    { label: 'Engagements', type: 'fonction', code: 'GESCMM' },
                  ]
                },
                {
                  items: [
                    { label: 'Saisie pièces inter-sociétés', type: 'fonction', code: 'GESGIC' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Consultations',
            items: [
              [
                {
                  items: [
                    { label: 'Balances', type: 'fonction', code: 'CONSBAL' }
                  ]
                },
                {
                  items: [
                    { label: 'Balances analytiques', type: 'fonction', code: 'EDITBLA' }
                  ]
                },
                {
                  items: [
                    { label: 'Balance en devises', type: 'fonction', code: 'CONSBAF' }
                  ]
                },
                {
                  items: [
                    { label: 'Comptes', type: 'fonction', code: 'CONSCPT' }
                  ]
                },
                {
                  items: [
                    { label: 'Comptes analytiques', type: 'fonction', code: 'CONSNAT' }
                  ]
                },
                {
                  items: [
                    { label: 'Sections', type: 'fonction', code: 'CONSSEC' }
                  ]
                },
                {
                  items: [
                    { label: 'Ecritures', type: 'fonction', code: 'CONSPCE	' }
                  ]
                },
                {
                  items: [
                    { label: 'Consultation bilan', type: 'fonction', code: 'CONSBSE' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Lettrage',
            items: [
              [
                {
                  items: [
                    { label: 'Lettrage manuel', type: 'fonction', code: 'LETTRAGE' }
                  ]
                },
                {
                  items: [
                    { label: 'Lettrage automatique', type: 'fonction', code: 'LETTRAUTO' }
                  ]
                },
                {
                  items: [
                    { label: 'Délettrage', type: 'fonction', code: 'DELETTRAGE' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Traitements courants',
            items: [
              [
                {
                  items: [
                    { label: 'Validation définitive', type: 'fonction', code: 'CPTVAL' },
                  ]
                },
                {
                  label: 'Simulations',
                  type: 'categorie', code: 'TRSIM',
                  items: [
                    { label: 'Activation', type: 'fonction', code: 'CPTACTSIM' },
                    { label: 'Désactivation', type: 'fonction', code: 'CPTDESSIM' },
                    { label: 'Annulation', type: 'fonction', code: 'CPTANUSIM' },
                    { label: 'Validation', type: 'fonction', code: 'CPTVALSIM' }
                  ]
                },
                {
                  items: [
                    { label: 'Extournes', type: 'fonction', code: 'CPTEXT' }
                  ]
                },
                {
                  items: [
                    { label: 'Lots', type: 'fonction', code: 'CPTLOT' }
                  ]
                },
                {
                  label: 'Abonnements',
                  type: 'categorie', code: 'ABT',
                  items: [
                    { label: 'Abonnements', type: 'fonction', code: 'VALABT' },
                    { label: 'Solde', type: 'fonction', code: 'SOLABT' }
                  ]
                },
                {
                  items: [
                    { label: 'Ecritures calculées', type: 'fonction', code: 'CPTCLP' }
                  ]
                },
                {
                  items: [
                    { label: 'Déversement', type: 'fonction', code: 'CPTDUM' }
                  ]
                },
                {
                  items: [
                    { label: 'Répartitions analytiques', type: 'fonction', code: 'CPTDSPANA' }
                  ]
                },
                {
                  items: [
                    { label: 'Modifications analytiques', type: 'fonction', code: 'CPTANA' }
                  ]
                },
                {
                  items: [
                    { label: 'Création pièces inter-sociétés', type: 'fonction', code: 'CPTINTCPY' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Traitements arrêtés',
            items: [
              [
                {
                  items: [
                    { label: 'Factures à recevoir', type: 'fonction', code: 'FUNPTH' }
                  ]
                },
                {
                  items: [
                    { label: 'Avoirs à recevoir', type: 'fonction', code: 'FUNPNH' }
                  ]
                },
                {
                  items: [
                    { label: 'Factures à émettre', type: 'fonction', code: 'FUNAUTFAE' }
                  ]
                },
                {
                  items: [
                    { label: 'CCA/PCA', type: 'fonction', code: 'CPTSVC' }
                  ]
                },
                {
                  items: [
                    { label: 'Ecarts de conversion', type: 'fonction', code: 'CNVECAR' }
                  ]
                },
                {
                  items: [
                    { label: 'Fin d\'exercice', type: 'fonction', code: 'FIYEND' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Budgets',
            items: [
              [
                {
                  items: [
                    { label: 'Saisie budgets', type: 'fonction', code: 'BUDGET' }
                  ]
                },
                {
                  items: [
                    { label: 'OD budgétaires', type: 'fonction', code: 'GESBDO' }
                  ]
                },
                {
                  items: [
                    { label: 'Copie budgets', type: 'fonction', code: 'BUDCOP' }
                  ]
                },
                {
                  items: [
                    { label: 'Calcul budgets', type: 'fonction', code: 'GESBUC' }
                  ]
                },
                {
                  items: [
                    { label: 'Mise à jour budgets BI', type: 'fonction', code: 'BIMAJBUD' }
                  ]
                },
                {
                  items: [
                    { label: 'Report des engagements', type: 'fonction', code: 'CMMREP' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Reporting',
            items: [
              [
                {
                  label: 'Tableaux de bord',
                  type: 'categorie', code: 'TDBOR',
                  items: [
                    { label: 'Consultation', type: 'fonction', code: 'GESTXW' },
                    { label: 'Calcul', type: 'fonction', code: 'TXSGRP' },
                  ]
                },
                {
                  items: [
                    { label: 'Extraction pour consolidation', type: 'fonction', code: 'BALCONSO' }
                  ]
                },
                {
                  label: 'Extraction par contrepartie',
                  type: 'categorie', code: 'CPCSF',
                  items: [
                    { label: 'Anamyse flux trésorerie', type: 'fonction', code: 'GESCSRH' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Interfaces',
            items: [
              [
                {
                  items: [
                    { label: 'Export échéancier trésorerie Sage', type: 'fonction', code: 'EXPCASDUD' }
                  ]
                },
                {
                  items: [
                    { label: 'Export règlements trésorerie Sage', type: 'fonction', code: 'EXPCASPAY' }
                  ]
                },
                {
                  items: [
                    { label: 'Export vers SAGE I7', type: 'fonction', code: 'ZEXPSAGE' }
                  ]
                },
                {
                  items: [
                    { label: 'Import virements trésorerie Sage', type: 'fonction', code: 'BNKTRSIMP' }
                  ]
                },
                {
                  items: [
                    { label: 'Export balance conso Sage', type: 'fonction', code: 'EXPCONSO' }
                  ]
                },
                {
                  items: [
                    { label: 'Export balance', type: 'fonction', code: 'EXPBAL' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Utilitaires',
            items: [
              [
                {
                  label: 'Resynchronisations',
                  type: 'categorie', code: 'UTIRE',
                  items: [
                    { label: 'Ecritures', type: 'fonction', code: 'RECECT' },
                    { label: 'Engagements', type: 'fonction', code: 'RECENG' },
                    { label: 'Balances', type: 'fonction', code: 'RECBAL' },
                    { label: 'Balances analytiques', type: 'fonction', code: 'RECBLA' },
                    { label: 'Balances engagements', type: 'fonction', code: 'RECBLM' },
                    { label: 'Balances analytiques qté', type: 'fonction', code: 'RECBLQ' },
                    { label: 'Soldes comptables', type: 'fonction', code: 'RECSOL' },
                    { label: 'Lettrage', type: 'fonction', code: 'RECLET' },
                    { label: 'Pyramides comptes', type: 'fonction', code: 'RECPYRACC' },
                    { label: 'Pyramides sections', type: 'fonction', code: 'RECPYRCCE' },
                    { label: 'Historisation des échéances', type: 'fonction', code: 'RECHDU' }
                  ]
                },
                {
                  label: 'Ajout référentiel',
                  type: 'categorie', code: 'UTILE',
                  items: [
                    { label: 'Création exercices/périodes', type: 'fonction', code: 'UTIFIYPER' },
                    { label: 'Génération écritures', type: 'fonction', code: 'UTIGNRLED' }
                  ]
                },
              ], [
                {
                  label: 'Clôture',
                  type: 'categorie', code: 'UTIEN',
                  items: [
                    { label: 'Ré-ouverture période', type: 'fonction', code: 'OPNPER' },
                    { label: 'Fermeture période', type: 'fonction', code: 'UTICLOPER' },
                    { label: 'Reconstitution à nouveau', type: 'fonction', code: 'SIMULFINEX' },
                    { label: 'Ré-ouverture d\'exercice', type: 'fonction', code: 'OPNFIY' }
                  ]
                },
              ], [
                {
                  label: 'Divers',
                  type: 'categorie', code: 'UTIMI',
                  items: [
                    { label: 'Fusions de comptes', type: 'fonction', code: 'GACMERGE' },
                    { label: 'Fusions de tiers', type: 'fonction', code: 'BPRMERGE' },
                    { label: 'Transfert collectif', type: 'fonction', code: 'TRFSAC' },
                    { label: 'TVA déclarée', type: 'fonction', code: 'VATSAI' },
                    { label: 'Vérification date fin devise', type: 'fonction', code: 'VERFEURO' }
                  ]
                }
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case 'Comptabilité tiers':
        return [
          {
            label: 'Facturation',
            items: [
              [
                {
                  items: [
                    { label: 'Factures tiers client', type: 'fonction', code: 'GESBIC' }
                  ]
                },
                {
                  items: [
                    { label: 'Factures inter-soc clients', type: 'fonction', code: 'GESBICI' }
                  ]
                },
                {
                  items: [
                    { label: 'Validation factures tiers client', type: 'fonction', code: 'BPCVAL' }
                  ]
                },
                {
                  items: [
                    { label: 'Factures périodiques clients', type: 'fonction', code: 'GESRCC' }
                  ]
                },
                {
                  items: [
                    { label: 'Factures tiers fournisseur', type: 'fonction', code: 'GESBIS' }
                  ]
                },
                {
                  items: [
                    { label: 'Factures inter-soc fournisseurs', type: 'fonction', code: 'GESBISI' }
                  ]
                },
                {
                  items: [
                    { label: 'Factures en attente', type: 'fonction', code: 'VALBIS' }
                  ]
                },
                {
                  items: [
                    { label: 'Validation factures tiers fourn.', type: 'fonction', code: 'BPSVAL' }
                  ]
                },
                {
                  items: [
                    { label: 'Factures périodiques fourn', type: 'fonction', code: 'GESRCS' }
                  ]
                },
                {
                  items: [
                    { label: 'Création facture périodique', type: 'fonction', code: 'BPRICRE' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Échéances',
            items: [
              [
                {
                  items: [
                    { label: 'Gestion des échéances', type: 'fonction', code: 'MODECHE' }
                  ]
                },
                {
                  items: [
                    { label: 'Saisie des échéances', type: 'fonction', code: 'MODECHE2' }
                  ]
                },
                {
                  items: [
                    { label: 'Campagnes de relances', type: 'fonction', code: 'GESFUP' }
                  ]
                },
                {
                  items: [
                    { label: 'Relevés', type: 'fonction', code: 'GESREL' }
                  ]
                },
                {
                  items: [
                    { label: 'Blocage client', type: 'fonction', code: 'BPCREDIT' }
                  ]
                },
                {
                  items: [
                    { label: 'Déblocage client', type: 'fonction', code: 'BPCREDITD' }
                  ]
                },
                {
                  items: [
                    { label: 'Imputations clients', type: 'fonction', code: 'IPTACPTCLI' }
                  ]
                },
                {
                  items: [
                    { label: 'Imputations fournisseurs', type: 'fonction', code: 'IPTACPTFOU' }
                  ]
                },
                {
                  items: [
                    { label: 'Compensation tiers', type: 'fonction', code: 'BPOINET' }
                  ]
                },
                {
                  items: [
                    { label: 'Génération de prévisions', type: 'fonction', code: 'FUNTRTCFO' }
                  ]
                },
                {
                  items: [
                    { label: 'Gestion prévisions de trésorerie', type: 'fonction', code: 'GESCFO' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Règlements',
            items: [
              [
                {
                  items: [
                    { label: 'Proposition automatique', type: 'fonction', code: 'PAYPROPAL' }
                  ]
                },
                {
                  items: [
                    { label: 'Saisie règlements', type: 'fonction', code: 'GESPAY' }
                  ]
                },
                {
                  items: [
                    { label: 'Retour acceptation', type: 'fonction', code: 'RETACC' }
                  ]
                },
                {
                  items: [
                    { label: 'Comptabilisation des effets', type: 'fonction', code: 'PAYMEP' }
                  ]
                },
                {
                  items: [
                    { label: 'Affectation banques', type: 'fonction', code: 'BANAFFA' }
                  ]
                },
                {
                  items: [
                    { label: 'Saisie banques', type: 'fonction', code: 'BANAFFM' }
                  ]
                },
                {
                  items: [
                    { label: 'Comptabilisation en banque', type: 'fonction', code: 'REMBAN' }
                  ]
                },
                {
                  items: [
                    { label: 'Génération fichier Positive Pay', type: 'fonction', code: 'GESPPY' }
                  ]
                },
                {
                  items: [
                    { label: 'Dévalorisation des effets', type: 'fonction', code: 'VALPORT' }
                  ]
                },
                {
                  items: [
                    { label: 'Prorogation client', type: 'fonction', code: 'PROROGC' }
                  ]
                },
                {
                  items: [
                    { label: 'Prorogation fournisseur', type: 'fonction', code: 'PROROG' }
                  ]
                },
                {
                  items: [
                    { label: 'Impayés', type: 'fonction', code: 'IMPAYE' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Bordereaux de remise',
            items: [
              [
                {
                  items: [
                    { label: 'Génération remises', type: 'fonction', code: 'GENBORREM' }
                  ]
                },
                {
                  items: [
                    { label: 'Saisie bordereau de remise', type: 'fonction', code: 'GESFRM' }
                  ]
                },
                {
                  items: [
                    { label: 'Remises magnétiques', type: 'fonction', code: 'FICMAG' }
                  ]
                },
                {
                  items: [
                    { label: 'Comptabilisation intermédiaire', type: 'fonction', code: 'REMCPT' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Avis de domiciliations',
            items: [
              [
                {
                  items: [
                    { label: 'Génération domiciliations', type: 'fonction', code: 'GENAVIDOM' }
                  ]
                },
                {
                  items: [
                    { label: 'Saisie avis de domiciliation', type: 'fonction', code: 'GESPAB' }
                  ]
                },
                {
                  items: [
                    { label: 'Import relevé LCR', type: 'fonction', code: 'RELLCR' }
                  ]
                },
                {
                  items: [
                    { label: 'Rapprochement manuel', type: 'fonction', code: 'RAPLCRMAN' }
                  ]
                },
                {
                  items: [
                    { label: 'Rapprochement automatique', type: 'fonction', code: 'RAPLCRAUT' }
                  ]
                },
                {
                  items: [
                    { label: 'Export relevé LCR', type: 'fonction', code: 'REPLCR' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Transactions bancaires',
            items: [
              [
                {
                  items: [
                    { label: 'Pointage', type: 'fonction', code: 'POINTAGE' }
                  ]
                },
                {
                  items: [
                    { label: 'Pointage des relevés bancaires', type: 'fonction', code: 'BANREC' }
                  ]
                },
                {
                  items: [
                    { label: 'Import relevé bancaire', type: 'fonction', code: 'RELBANK' }
                  ]
                },
                {
                  items: [
                    { label: 'Suppression relevé', type: 'fonction', code: 'ANURBK' }
                  ]
                },
                {
                  items: [
                    { label: 'Saisie relevé bancaire', type: 'fonction', code: 'GESRLK' }
                  ]
                },
                {
                  items: [
                    { label: 'Pointage en partie simple', type: 'fonction', code: 'UTICHK' }
                  ]
                },
                {
                  items: [
                    { label: 'Rapprochement bancaire', type: 'fonction', code: 'RAPBAN' }
                  ]
                },
                {
                  items: [
                    { label: 'Dépointage', type: 'fonction', code: 'DEPOINTAGE' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Consultations',
            items: [
              [
                {
                  items: [
                    { label: 'Situation client', type: 'fonction', code: 'CONSBAG' }
                  ]
                },
                {
                  items: [
                    { label: 'Situation fournisseur', type: 'fonction', code: 'CONSBAGF' }
                  ]
                },
                {
                  items: [
                    { label: 'Balance âgée client à date', type: 'fonction', code: 'CONSBAH' }
                  ]
                },
                {
                  items: [
                    { label: 'Balance âgée fourn à date', type: 'fonction', code: 'CONSBAHF' }
                  ]
                },
                {
                  items: [
                    { label: 'Règlements', type: 'fonction', code: 'CONSPAY' }
                  ]
                },
                {
                  items: [
                    { label: 'Factures', type: 'fonction', code: 'CONSFAC' }
                  ]
                },
                {
                  items: [
                    { label: 'Banques', type: 'fonction', code: 'CONSBAN' }
                  ]
                },
                {
                  items: [
                    { label: 'Chèques', type: 'fonction', code: 'CONSCHQ' }
                  ]
                },
                {
                  items: [
                    { label: 'Situation bancaire', type: 'fonction', code: 'CONSBTR' }
                  ]
                },
                {
                  items: [
                    { label: 'Traçabilité pièces', type: 'fonction', code: 'CONSPIT' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Affacturage',
            items: [
              [
                {
                  items: [
                    { label: 'Saisie factors', type: 'fonction', code: 'SAIFCT' }
                  ]
                },
                {
                  items: [
                    { label: 'Génération quittances', type: 'fonction', code: 'GENQUIT' }
                  ]
                },
                {
                  items: [
                    { label: 'Annulation quittances', type: 'fonction', code: 'DELQUIT' }
                  ]
                },
                {
                  items: [
                    { label: 'Comptabilisation quittances', type: 'fonction', code: 'CPTQUIT' }
                  ]
                },
                {
                  items: [
                    { label: 'Génération de fichier', type: 'fonction', code: 'GENFIC' }
                  ]
                },
                {
                  items: [
                    { label: 'Notification de règlement', type: 'fonction', code: 'NTFQUIT' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Notes de frais',
            items: [
              [
                {
                  items: [
                    { label: 'Relevés de frais', type: 'fonction', code: 'GESEXS' }
                  ]
                },
                {
                  items: [
                    { label: 'Comptabilisation des frais', type: 'fonction', code: 'EXSGEN' }
                  ]
                },
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case 'Déclarations':
        return [
          {
            label: 'Déclaration des honoraires',
            items: [
              [
                {
                  label: 'Autres',
                  type: 'categorie', code: 'FOTH',
                  items: [
                    { label: 'Fichier déclaration honoraires', type: 'fonction', code: 'GESTFT' }
                  ]
                },
                {
                  label: 'France',
                  type: 'categorie', code: 'PACPF',
                },
                {
                  label: 'Paramétrage',
                  type: 'categorie', code: 'FFRAS',
                  items: [
                    { label: 'Fichier DADS-U', type: 'fonction', code: 'GESFTD' },
                    { label: 'Paramètres extraction DADS-U', type: 'fonction', code: 'GESPRM' }
                  ]
                },
                {
                  label: 'Traitements',
                  type: 'categorie', code: 'DAS2',
                  items: [
                    { label: 'Extraction honoraires', type: 'fonction', code: 'HONLINEXT' },
                    { label: 'Annulation lignes d\'honoraires', type: 'fonction', code: 'HONLINANN' },
                    { label: 'Mise à jour lignes d\'honoraires', type: 'fonction', code: 'SUBHLN' },
                    { label: 'Contrôles TDS', type: 'fonction', code: 'TDSCTL' },
                    { label: 'Génération fichier TDS', type: 'fonction', code: 'TDSGENE' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Impression',
            items: [
              [
                {
                  label: 'Gestion des taxes',
                  type: 'categorie', code: 'VATST',
                  items: [
                    { label: 'Autres', type: 'fonction', code: 'RFI60' },
                    { label: 'Gestion des cases TVA', type: 'fonction', code: 'RFI6B' }
                  ]
                },
                {
                  label: 'Déclaration honoraires',
                  type: 'categorie', code: 'MFEE',
                  items: [
                    { label: 'Autres', type: 'fonction', code: 'RFI68' },
                    { label: 'France', type: 'fonction', code: 'RFI64' }
                  ]
                },
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case 'Immobilisations':
        return [
          {
            label: 'Immobilisations',
            items: [
              [
                {
                  items: [
                    { label: 'Dépenses', type: 'fonction', code: 'GESLOF' }
                  ]
                },
                {
                  items: [
                    { label: 'Biens comptables', type: 'fonction', code: 'GESFAS' }
                  ]
                },
                {
                  items: [
                    { label: 'Plan d\'amortissement', type: 'fonction', code: 'GESDPP' }
                  ]
                },
                {
                  items: [
                    { label: 'Plan de production', type: 'fonction', code: 'GESPLP' }
                  ]
                },
              ]
            ]
          },
          {
            label: 'Traitements',
            items: [
              [
                {
                  items: [
                    { label: 'Statut des contextes', type: 'fonction', code: 'SAISTACPY' },
                  ]
                },
                {
                  label: 'Interface comptable',
                  type: 'categorie', code: 'MFSTC',
                  items: [
                    { label: 'Génération écritures comptables', type: 'fonction', code: 'TRTCPTINT' },
                    { label: 'Pièces comptables', type: 'fonction', code: 'GESGPC' }
                  ]
                },
              ], [
                {
                  label: 'Amortissements',
                  type: 'categorie', code: 'MFSTA',
                  items: [
                    { label: 'Réévaluation', type: 'fonction', code: 'FASRVAM' },
                    { label: 'Calcul amortissements', type: 'fonction', code: 'FASCALC' },
                    { label: 'Simulation amortissements', type: 'fonction', code: 'FASSIMU' },
                    { label: 'Dépréciation', type: 'fonction', code: 'FASIMLM' },
                    { label: 'Génération flux provisoires', type: 'fonction', code: 'FASFLXM' },
                    { label: 'Clôture période et exercice', type: 'fonction', code: 'FASCLOTURE' }
                  ]
                },
                {
                  label: 'Régularisation TVA',
                  type: 'categorie', code: 'MFSTR',
                  items: [
                    { label: 'Dépenses', type: 'fonction', code: 'LOFVATREG' },
                    { label: 'Biens', type: 'fonction', code: 'FASVATREG' },
                    { label: 'Globale', type: 'fonction', code: 'FASVATRGG' }
                  ]
                },
              ], [
                {
                  label: 'Mouvements',
                  type: 'categorie', code: 'MFSTM',
                  items: [
                    { label: 'Immobilisation des dépenses', type: 'fonction', code: 'LOFGRPFAS' },
                    { label: 'Modif. imputation comptable', type: 'fonction', code: 'FASTRFCM' },
                    { label: 'Modif. méthode amortissement', type: 'fonction', code: 'FASMTCM' },
                    { label: 'Transfert analytique / géographique', type: 'fonction', code: 'FASTRFM' },
                    { label: 'Eclatement massif des biens', type: 'fonction', code: 'FASSPLM' },
                    { label: 'Sortie d\'actif', type: 'fonction', code: 'FASISSM' }
                  ]
                },
                {
                  label: 'Interface',
                  type: 'categorie', code: 'MFFXM',
                  items: [
                    { label: 'Mouvements à intégrer', type: 'fonction', code: 'GESFXM' },
                    { label: 'Intégration des mouvements', type: 'fonction', code: 'FXDINT' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Gestion physique',
            items: [
              [
                {
                  label: 'Traitements',
                  type: 'categorie',//JE NE TROUVE PAS LE CODE 
                  items: [
                    { label: 'Transfert géographique massif', type: 'fonction', code: 'PHYTRFM' },
                    { label: 'Sortie massive', type: 'fonction', code: 'PHYISSM' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Financement',
            items: [
              [
                {
                  label: 'Contrats location financement',
                  type: 'categorie', code: 'MLOCF',
                  items: [
                    { label: 'Contrats location financement', type: 'fonction', code: 'GESLEA' },
                    { label: 'Génération évenements redevance', type: 'fonction', code: 'LEAPAY' }
                  ]
                },
                {
                  label: 'Subventions',
                  type: 'categorie', code: 'MFSTS',
                  items: [
                    { label: 'Subventions', type: 'fonction', code: 'GESGRT' },
                    { label: 'Calcul des subventions', type: 'fonction', code: 'GRACAL' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Cessions intra-groupe',
            items: [
              [
                {
                  items: [
                    { label: 'Définition de l\'opération', type: 'fonction', code: 'GESCIG' }
                  ]
                },
                {
                  items: [
                    { label: 'Pré-enregistrement des sorties', type: 'fonction', code: 'GESCIT' }
                  ]
                },
                {
                  items: [
                    { label: 'Ajustement manuel des sorties', type: 'fonction', code: 'GESCIB' }
                  ]
                },
                {
                  items: [
                    { label: 'Validation de la cession', type: 'fonction', code: 'GESCII' }
                  ]
                },
                {
                  items: [
                    { label: 'Paramétrage des sélections de biens', type: 'fonction', code: 'GESCIS' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Consultations',
            items: [
              [
                {
                  label: 'Toutes législations',
                  type: 'categorie',//JE NE TROUVE PAS LE CODE 
                  items: [
                    { label: 'Simulation amortissements', type: 'fonction', code: 'CONSSIM' },
                    { label: 'Traçabilité pièces', type: 'fonction', code: 'CONSPIF' }
                  ]
                },
                {
                  label: 'Allemagne & Autriche',
                  type: 'categorie', //JE NE TROUVE PAS LE CODE 
                  items: [
                    { label: 'Situation par code flux', type: 'fonction', code: 'FAS246G' },
                    { label: 'Pièces immobilisations', type: 'fonction', code: 'FASENTRY' },
                    { label: 'Cessions et sorties immobilisations', type: 'fonction', code: 'FASEXIT' },
                    { label: 'Liste immobilisations', type: 'fonction', code: 'FASLISTDEP' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Utilitaires',
            items: [
              [
                {
                  items: [
                    { label: 'Modifications en attente', type: 'fonction', code: 'UPDWAITRT' }
                  ]
                },
                {
                  items: [
                    { label: 'Synchronisation contextes', type: 'fonction', code: 'FASCNXSYNC' }
                  ]
                },
                {
                  items: [
                    { label: 'Recodifications massives', type: 'fonction', code: 'GESREC' }
                  ]
                },
                {
                  items: [
                    { label: 'Reprise Abel Entreprise', type: 'fonction', code: 'REPRISEAE' }
                  ]
                },
                {
                  items: [
                    { label: 'Création DEPREC courant', type: 'fonction', code: 'UCREDEPCUM' }
                  ]
                },
                {
                  items: [
                    { label: 'Mise à jour du dérogatoire', type: 'fonction', code: 'UMAJDEROG' }
                  ]
                },
                {
                  items: [
                    { label: 'Suppression plan amortissement', type: 'fonction', code: 'UDELPLN' }
                  ]
                },
                {
                  items: [
                    { label: 'Synchronisation des suivis', type: 'fonction', code: 'UMAJSUIV' }
                  ]
                }
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case 'Terminaux portables':
        return [
          {
            label: 'Terminaux portables',
            items: [
              [
                {
                  items: [
                    { label: 'Définir le site', type: 'fonction', code: 'VXASS' },
                  ]
                },
                {
                  items: [
                    { label: 'Définir la destination', type: 'fonction', code: 'VXASP' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Stocks',
            items: [
              [
                {
                  items: [
                    { label: 'Préparations d\'expéditions', type: 'fonction', code: 'VXABP' }
                  ]
                },
                {
                  items: [
                    { label: 'Entrées diverses', type: 'fonction', code: 'VXAMR' }
                  ]
                },
                {
                  items: [
                    { label: 'Sorties diverses', type: 'fonction', code: 'VXAMO' }
                  ]
                },
                {
                  items: [
                    { label: 'Réceptions', type: 'fonction', code: '0000000' }
                  ]
                },
                {
                  items: [
                    { label: 'Transferts inter-sites', type: 'fonction', code: 'VXAIT' }
                  ]
                },
                {
                  items: [
                    { label: 'Transferts sous-traitants', type: 'fonction', code: 'VXAST' }
                  ]
                },
                {
                  items: [
                    { label: 'Changements stock', type: 'fonction', code: 'VXASC' }
                  ]
                },
                {
                  items: [
                    { label: 'Rangements sur liste', type: 'fonction', code: 'VXASY' }
                  ]
                },
                {
                  items: [
                    { label: 'Réapprovisionnements emplacements', type: 'fonction', code: 'VXALR' }
                  ]
                },
                {
                  items: [
                    { label: 'Inventaires', type: 'fonction', code: 'VXACC' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Production',
            items: [
              [
                {
                  items: [
                    { label: 'Déclaration production', type: 'fonction', code: 'VXAPT' },
                  ]
                },
                {
                  items: [
                    { label: 'Suivi des temps', type: 'fonction', code: 'VXAOT' },
                  ]
                },
                {
                  items: [
                    { label: 'Sortie matières', type: 'fonction', code: 'VXAMT' },
                  ]
                },
                {
                  label: 'Suivi atelier',
                  type: 'categorie', code: 'VXADS',
                  items: [
                    { label: 'Pointage arrivée', type: 'fonction', code: 'VXECI' },
                    { label: 'Pointage départ', type: 'fonction', code: 'VXECO' },
                    { label: 'Début de pause', type: 'fonction', code: 'VXBRKI' },
                    { label: 'Arrêt de pause', type: 'fonction', code: 'VXBRKO' },
                    { label: 'Début préparation', type: 'fonction', code: 'VXSETI' },
                    { label: 'Fin préparation', type: 'fonction', code: 'VXSETO' },
                    { label: 'Début exécution', type: 'fonction', code: 'VXRUNI' },
                    { label: 'Arrêt exécution', type: 'fonction', code: 'VXRUNO' },
                    { label: 'Début temps hors production', type: 'fonction', code: 'VXINDI' },
                    { label: 'Arrêt temps hors production', type: 'fonction', code: 'VXINDO' },
                    { label: 'Heures passées', type: 'fonction', code: 'VXELP' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Sélection par identifiant',
            items: [
              [
                {
                  items: [
                    { label: 'Sorties diverses', type: 'fonction', code: 'VXBMO' },
                    { label: 'Changements stock', type: 'fonction', code: 'VXBSC' },
                    { label: 'Transferts inter-sites', type: 'fonction', code: 'VXBIT' },
                    { label: 'Transferts sous-traitants', type: 'fonction', code: 'VXBST' },
                    { label: 'Sortie matières', type: 'fonction', code: 'VXBMT' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Consultations',
            items: [
              [
                {
                  items: [
                    { label: 'Articles - Sites', type: 'fonction', code: 'VXCAS' },
                    { label: 'Emplacements', type: 'fonction', code: 'VXCEM' }
                  ]
                }
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case 'Exploitation':
        return [
          {
            label: 'Serveur batch',
            items: [
              [
                {
                  items: [
                    { label: 'Gestion des requêtes', type: 'fonction', code: 'AREQUETE' },
                  ]
                },
                {
                  items: [
                    { label: 'Gestion des tâches', type: 'fonction', code: 'GESABT' },
                  ]
                },
                {
                  items: [
                    { label: 'Groupes de tâches', type: 'fonction', code: 'GESABG' },
                  ]
                },
                {
                  items: [
                    { label: 'Gestion des abonnements', type: 'fonction', code: 'GESABA' },
                  ]
                },
                {
                  items: [
                    { label: 'Soumission des requêtes', type: 'fonction', code: 'EXERQT' },
                  ]
                },
                {
                  items: [
                    { label: 'Tâches comptables', type: 'fonction', code: 'VALPCE' }
                  ]
                },
              ]
            ]
          },
          {
            label: 'Statistiques',
            items: [
              [
                {
                  items: [
                    { label: 'Validation batch', type: 'fonction', code: 'VALSTA' },
                  ]
                },
                {
                  items: [
                    { label: 'Consultations', type: 'fonction', code: 'CONSSTA' },
                  ]
                },
                {
                  items: [
                    { label: 'Prévisions', type: 'fonction', code: 'SAISTA' }
                  ]
                },
              ]
            ]
          },
          {
            label: 'Imports/Exports',
            items: [
              [
                {
                  items: [
                    { label: 'Imports', type: 'fonction', code: 'GIMPOBJ' },
                  ]
                },
                {
                  items: [
                    { label: 'Exports', type: 'fonction', code: 'GEXPOBJ' },
                  ]
                },
                {
                  items: [
                    { label: 'Imports enchaînés', type: 'fonction', code: 'GIMPENCH' },
                  ]
                },
                {
                  items: [
                    { label: 'Exports enchaînés', type: 'fonction', code: 'GEXPENCH' },
                  ]
                },
                {
                  items: [
                    { label: 'Structuration tableau/import', type: 'fonction', code: 'IMPORTV3' },
                  ]
                },
                {
                  items: [
                    { label: 'Sas import/export', type: 'fonction', code: 'GESAOW' },
                  ]
                },
                {
                  items: [
                    { label: 'Conversion fichiers mono-ligne', type: 'fonction', code: 'AIFIMPGENFIC' }
                  ]
                },
              ]
            ]
          },
          {
            label: 'Utilisateurs',
            items: [
              [
                {
                  items: [
                    { label: 'Personnalisation', type: 'fonction', code: 'CHXPERSO' },
                  ]
                },
                {
                  items: [
                    { label: 'Changement de mot de passe', type: 'fonction', code: 'PASSE' },
                  ]
                },
                {
                  items: [
                    { label: 'Changement date', type: 'fonction', code: 'CHGDAT' }
                  ]
                },
              ]
            ]
          },
          {
            label: 'Exploitation',
            items: [
              [
                {
                  items: [
                    { label: 'Historisation / Epuration', type: 'fonction', code: 'AHISTO' },
                  ]
                },
                {
                  items: [
                    { label: 'Moniteur Workflow', type: 'fonction', code: 'SAIWRKPLN' }
                  ]
                },
              ]
            ]
          },
          {
            label: 'Migrations',
            items: [
              [
                {
                  items: [
                    { label: 'Procédures de migration', type: 'fonction', code: 'GESAM3' },
                  ]
                },
                {
                  items: [
                    { label: 'Moniteur d\'enchainement', type: 'fonction', code: 'AMOULIN' },
                  ]
                },
                {
                  items: [
                    { label: 'Migration des pièces jointes', type: 'fonction', code: 'AMIGNAMFIC' }
                  ]
                },
              ]
            ]
          },
          {
            label: 'Audit',
            items: [
              [
                {
                  items: [
                    { label: 'Connexions', type: 'fonction', code: 'CONSALO' },
                  ]
                },
                {
                  items: [
                    { label: 'Tables', type: 'fonction', code: 'CONSAUH' },
                  ]
                },
                {
                  items: [
                    { label: 'Champs', type: 'fonction', code: 'CONSAUD' },
                  ]
                },
                {
                  items: [
                    { label: 'Historique des e-Signatures', type: 'fonction', code: 'CONSESR' },
                  ]
                },
                {
                  label: 'France',
                  type: 'categorie',//JE NE TROUVE PAS LE CODE
                  items: [
                    { label: 'Ctrl. signatures électroniques', type: 'fonction', code: 'FRADSICTL' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Connecteurs métier',
            items: [
              [
                {
                  items: [
                    { label: 'Pivots', type: 'fonction', code: 'GESPIT' },
                  ]
                },
                {
                  label: 'Prévision APS',
                  type: 'categorie', code: 'MSCM',
                  items: [
                    { label: 'Paramétrage Prévision APS', type: 'fonction', code: 'GESSZP' },
                    { label: 'Lancement interface Prév. APS', type: 'fonction', code: 'SCMAINT' }
                  ]
                },
                {
                  label: 'REACH',
                  type: 'categorie', code: 'MRPA',
                  items: [
                    { label: 'Paramétrage REACH', type: 'fonction', code: 'GESRPA' },
                    { label: 'Lancement interface REACH', type: 'fonction', code: 'RPAINT' }
                  ]
                },
              ], [
                {
                  label: 'PLM',
                  type: 'categorie', code: 'MPLM',
                  items: [
                    { label: 'Paramétrage PLM', type: 'fonction', code: 'GESPLM' },
                    { label: 'Lancement interface PLM', type: 'fonction', code: 'PLMINT' }
                  ]
                },
                {
                  label: 'APS',
                  type: 'categorie', code: 'MAPS',
                },
                {
                  label: 'PREACTOR',
                  type: 'categorie', code: 'MORP',
                  items: [
                    { label: 'Paramétrage PREACTOR', type: 'fonction', code: 'GESORP' },
                    { label: 'Lancement interface PREACTOR', type: 'fonction', code: 'ORPINT' }
                  ]
                },
                {
                  label: 'APS',
                  type: 'categorie', code: 'MORO',
                  items: [
                    { label: 'Paramétrage APS', type: 'fonction', code: 'GESORO' },
                    { label: 'Lancement interface APS', type: 'fonction', code: 'OROINT' }
                  ]
                },
              ], [
                {
                  label: 'MES',
                  type: 'categorie', code: 'MMES',
                  items: [
                    { label: 'Paramétrage MES', type: 'fonction', code: 'GESMES' },
                    { label: 'Lancement interface MES', type: 'fonction', code: 'MESINT' }
                  ]
                },
                {
                  label: 'MMS',
                  type: 'categorie', code: 'MMMS',
                  items: [
                    { label: 'Paramétrage MMS', type: 'fonction', code: 'GESMMS' },
                    { label: 'Lancement interface MMS', type: 'fonction', code: 'MMSINT' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'RGPD',
            items: [
              [
                {
                  items: [
                    { label: 'Contrôle société pour DPD', type: 'fonction', code: 'ALISTDPOCPY' }
                  ]
                },
                {
                  items: [
                    { label: 'Paramétrage RGPD', type: 'fonction', code: 'GESAGS' }
                  ]
                },
                {
                  items: [
                    { label: 'Recherche RGPD', type: 'fonction', code: 'AGDPRSEA' }
                  ]
                },
                {
                  items: [
                    { label: 'Liste des données Email', type: 'fonction', code: 'AGDPRMAI' }
                  ]
                },
                {
                  items: [
                    { label: 'Liste des données téléphone', type: 'fonction', code: 'AGDPRPHONE' }
                  ]
                },
                {
                  items: [
                    { label: 'Liste des données personnelles', type: 'fonction', code: 'AGDPRPDATA' }
                  ]
                }
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case 'Impressions':
        return [
          {
            label: 'Impressions',
            items: [
              [
                {
                  items: [
                    { label: 'Visualisation de requêtes', type: 'fonction', code: 'EXEALH' }
                  ]
                },
                {
                  items: [
                    { label: 'Visualisation groupe de requêtes', type: 'fonction', code: 'EXEALHGRP' }
                  ]
                },
                {
                  items: [
                    { label: 'Visualisation archive', type: 'fonction', code: 'ARCVISU' }
                  ]
                },
                {
                  items: [
                    { label: 'Interrogation GED', type: 'fonction', code: 'ARCVISUOBJ' }
                  ]
                },
                {
                  items: [
                    { label: 'Surveillance impressions', type: 'fonction', code: 'PSIMP' }
                  ]
                },
                {
                  items: [
                    { label: 'Lecture traces', type: 'fonction', code: 'PSIMP' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Impressions/groupe',
            items: [
              [
                {
                  items: [
                    { label: 'Superviseur', type: 'fonction', code: 'RPT01' }
                  ]
                },
                {
                  label: 'Achats',
                  type: 'categorie', code: 'GIMPA',
                  items: [
                    { label: 'Documents externes', type: 'fonction', code: 'RPT18' },
                    { label: 'Documents internes', type: 'fonction', code: 'RPT19' },
                    { label: 'Tarifs', type: 'fonction', code: 'RPT20' },
                    { label: 'Analyse', type: 'fonction', code: 'RPT21' },
                    { label: 'Listes', type: 'fonction', code: 'RPT22' },
                  ]
                },
                {
                  label: 'Production',
                  type: 'categorie', code: 'GIMPP',
                  items: [
                    { label: 'Données techniques', type: 'fonction', code: 'RPT33' },
                    { label: 'Documents de fabrication', type: 'fonction', code: 'RPT32' },
                    { label: 'Réapprovisionnement', type: 'fonction', code: 'RPT31' },
                    { label: 'Valorisation', type: 'fonction', code: 'RPT34' },
                    { label: 'Analyse', type: 'fonction', code: 'RPT35' },
                  ]
                },
              ], [
                {
                  items: [
                    { label: 'Données de base', type: 'fonction', code: 'RPT02' }
                  ]
                },
                {
                  label: 'Ventes',
                  type: 'categorie', code: 'GIMPV',
                  items: [
                    { label: 'Documents externes', type: 'fonction', code: 'RPT12' },
                    { label: 'Documents internes', type: 'fonction', code: 'RPT13' },
                    { label: 'Tarifs', type: 'fonction', code: 'RPT14' },
                    { label: 'Analyse', type: 'fonction', code: 'RPT15' },
                    { label: 'Listes', type: 'fonction', code: 'RPT16' },
                  ]
                },
                {
                  label: 'Comptabilité',
                  type: 'categorie', code: 'GIMPC',
                  items: [
                    { label: 'Comptabilité générale', type: 'fonction', code: 'RPT03' },
                    { label: 'Comptabilité tiers', type: 'fonction', code: 'RPT05' },
                    { label: 'Comptabilité analytique/budgétaire', type: 'fonction', code: 'RPT04' },
                    { label: 'Editions légales', type: 'fonction', code: 'RPT06' },
                    { label: 'Trésorerie', type: 'fonction', code: 'RPT08' },
                    { label: 'Suivi des échéances', type: 'fonction', code: 'RPT09' },
                    { label: 'Règlements', type: 'fonction', code: 'RPT10' },
                    { label: 'Relances clients', type: 'fonction', code: 'RPT11' },
                  ]
                },
                {
                  label: 'Gestion des taxes',
                  type: 'categorie', code: 'RPT6M',
                  items: [
                    { label: 'Autres', type: 'fonction', code: 'RPT60' },
                    { label: 'Gestion des cases TVA', type: 'fonction', code: 'RPT6F' },
                  ]
                },
                {
                  label: 'Déclaration honoraires',
                  type: 'categorie', code: 'RPT5M',
                  items: [
                    { label: 'Autres', type: 'fonction', code: 'RPT68' },
                    { label: 'France', type: 'fonction', code: 'RPT64' },
                  ]
                },
              ], [
                {
                  label: 'Relation client',
                  type: 'categorie', code: 'GIMPM',
                  items: [
                    { label: 'Support client', type: 'fonction', code: 'RPT23' },
                    { label: 'Action commerciale', type: 'fonction', code: 'RPT24' },
                  ]
                },
                {
                  label: 'Stocks',
                  type: 'categorie', code: 'GIMPS',
                  items: [
                    { label: 'Documents internes', type: 'fonction', code: 'RPT29' },
                    { label: 'Inventaires', type: 'fonction', code: 'RPT25' },
                    { label: 'Réapprovisionnement', type: 'fonction', code: 'RPT26' },
                    { label: 'Stock à mouvementer', type: 'fonction', code: 'RPT27' },
                    { label: 'Analyse', type: 'fonction', code: 'RPT28' },
                  ]
                },
                {
                  label: 'Immobilisations',
                  type: 'categorie', code: 'GIMPF',
                  items: [
                    { label: 'Immobilisations', type: 'fonction', code: 'RPTF1' },
                    { label: 'Financement', type: 'fonction', code: 'RPTF2' },
                    { label: 'Gestion physique', type: 'fonction', code: 'RPTF3' },
                    { label: 'Paramétrage et données de base', type: 'fonction', code: 'RPTF4' },
                  ]
                },
                {
                  label: 'Par législation',
                  type: 'categorie', code: 'MFRPT',
                  items: [
                    { label: 'Allemagne & Autriche', type: 'fonction', code: 'RPTF5' },
                    { label: 'Portugal', type: 'fonction', code: 'RPTF6' },
                    { label: 'Italie', type: 'fonction', code: 'RPTF7' },
                    { label: 'Royaume Uni', type: 'fonction', code: 'RPTF8' },
                    { label: 'France', type: 'fonction', code: 'RPTF9' },
                  ]
                }
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case 'Traductions':
        return [
          {
            label: 'Logiciel',
            items: [
              [
                {
                  label: 'Fonctions',
                  type: 'categorie', code: 'ATFCT',
                  items: [
                    { label: 'Textes à traduire', type: 'fonction', code: 'ATXTTRAD' },
                    { label: 'Traduction textes', type: 'fonction', code: 'GESATR' },
                    { label: 'Traduction menus locaux', type: 'fonction', code: 'ATFCT' },
                    { label: 'Traduction processus', type: 'fonction', code: 'APRTRAD' },
                    { label: 'Traduction des libellés', type: 'fonction', code: 'FUNTRATXI' }
                  ]
                },
                {
                  label: 'Outils',
                  type: 'categorie', code: 'ATTLS',
                  items: [
                    { label: 'Génération textes', type: 'fonction', code: 'AGENREFAML' },
                    { label: 'Génération réf. croisées', type: 'fonction', code: 'AGENREFTXT' },
                    { label: 'Recherche texte', type: 'fonction', code: 'ARECTXTTRD' },
                    { label: 'Textes-ApIsId non traduits', type: 'fonction', code: 'ATXNOTRANS' },
                    { label: 'Export messages', type: 'fonction', code: 'AEXPATD' },
                    { label: 'Export textes', type: 'fonction', code: 'AEXPATR' },
                    { label: 'Import messages', type: 'fonction', code: 'AIMPATD' },
                    { label: 'Import textes', type: 'fonction', code: 'AIMPATR' },
                    { label: 'Exceptions (traduction)', type: 'fonction', code: 'GESAEX' },
                    { label: 'Traduction écrans', type: 'fonction', code: 'GESAMD' },
                    { label: 'Traduction tables', type: 'fonction', code: 'GESATT' },
                    { label: 'Génération des libellés', type: 'fonction', code: 'ALANG' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Documentation',
            items: [
              [
                {
                  items: [
                    { label: 'Plan de travail documentation', type: 'fonction', code: 'ADOCTRA' },
                  ]
                },
                {
                  items: [
                    { label: 'Extraction documentation', type: 'fonction', code: 'ADOCEXT' },
                  ]
                },
                {
                  items: [
                    { label: 'Import documentation', type: 'fonction', code: 'ADOCIMP' }
                  ]
                },
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case 'Pages en lecture seule':
        return [
          {
            label: 'Comptabilité',
            items: [
              [
                {
                  items: [
                    { label: 'Sections analytiques', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Comptes', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Modèles comptables', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Journaux comptables', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Budgets', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Répartitions temporelles', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Axes', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Versions de budgets', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Référentiels', type: 'fonction' },
                  ]
                }
              ]
            ]
          },
          {
            label: 'Comptabilité tiers',
            items: [
              [
                {
                  items: [
                    { label: 'Destinations comptables', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Transactions saisie règlements', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Groupes de relances', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Facteurs', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Caisses', type: 'fonction' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Immobilisations',
            items: [
              [
                {
                  items: [
                    { label: 'Contextes d\'amortissements', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Dépenses', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Immobilisations', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Contrats de location-financement', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Subventions', type: 'fonction' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Données de base',
            items: [
              [
                {
                  items: [
                    { label: 'Tiers', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Prospects', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Catégories clients', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Clients', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Catégories articles', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Article site', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Article', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Articles - dépôts', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Statuts stock', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Représentants', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Incoterm', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Catégories fournisseurs', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Fournisseurs', type: 'fonction' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Achats',
            items: [
              [
                {
                  items: [
                    { label: 'Gestion des retours', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Ordres de sous-traitance', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Commandes d\'achat', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Réceptions d\'achat', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Demandes d\'achat', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Contrôle des factures', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Recherche prix d\'achat', type: 'fonction' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Ventes',
            items: [
              [
                {
                  items: [
                    { label: 'Saisie tarifs', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Affaires', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Devis', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Commandes de ventes', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Commandes ouvertes', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Demandes de livraison', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Livraisons', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Retours client', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Retours de prêt', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Retours matières de sous-traitance', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Factures', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Consultation tarifs vente', type: 'fonction' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Production',
            items: [
              [
                {
                  items: [
                    { label: 'Nomenclatures de Production', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Alternatives nomenclatures', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Gammes', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Alternatives Gamme', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Consultation prix de revient de fabrication', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Coût standard', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Coût standard révisé', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Coût standard budget', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Coût standard simulé', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Centres de charge', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Postes de charge', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Opérations standard', type: 'fonction' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Stocks',
            items: [
              [
                {
                  items: [
                    { label: 'Emplacements', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Types emplacements', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Questions', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Contrôle qualité', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Fiches techniques', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Réponses', type: 'fonction' },
                  ]
                },
                {
                  items: [
                    { label: 'Emballages', type: 'fonction' },
                  ]
                },
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case 'EDI':
        return [
          {
            label: 'Exploitation EDI',
            items: [
              [
                {
                  label: 'Traitements EDI',
                  type: 'categorie',
                  items: [
                    { label: 'Génération envois EDI', type: 'fonction' },
                    { label: 'Génération réceptions EDI', type: 'fonction' }
                  ]
                },
                {
                  label: 'Contrôles EDI',
                  type: 'categorie',
                  items: [
                    { label: 'Sas EDI', type: 'fonction' },
                    { label: 'Purge EDI', type: 'fonction' },
                    { label: 'Purge EDI', type: 'fonction' },
                    { label: 'Suivi des documents EDI', type: 'fonction' },
                    { label: 'Requête paramétrage EDI', type: 'fonction' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Paramétrage EDI',
            items: [
              [
                {
                  label: 'Paramétrage de base',
                  type: 'categorie',
                  items: [
                    { label: 'Partenaires EDI', type: 'fonction' },
                    { label: 'Catégories EDI', type: 'fonction' },
                    { label: 'Protocoles EDI', type: 'fonction' },

                  ]
                },
                {
                  label: 'Définition flux',
                  type: 'categorie',
                  items: [
                    { label: 'Mapping de messages EDI', type: 'fonction' },
                    { label: 'Fichier séquentiel EDI', type: 'fonction' },
                    { label: 'Téléchargement fichier XSD EDI', type: 'fonction' },
                    { label: 'Fichiers XML EDI', type: 'fonction' },
                    { label: 'Flux EDI', type: 'fonction' },
                  ]
                },
                {
                  label: 'Associations',
                  type: 'categorie',
                  items: [
                    { label: 'Partenaires EDI par société', type: 'fonction' },
                    { label: 'Partenaires EDI par site', type: 'fonction' },
                    { label: 'Partenaires EDI par tiers', type: 'fonction' },
                    { label: 'Flux EDI par tiers société', type: 'fonction' },
                  ]
                },
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case '4CAD Gestion de la qualité':
        return [
          {
            label: 'Événements qualité',
            items: [
              [
                {
                  items: [
                    { label: 'Événement qualité', type: 'fonction', code: 'GESXX1JQXIN' }
                  ]
                },
                {
                  items: [
                    { label: 'Action qualité', type: 'fonction', code: 'GESXX1JQXIA' }
                  ]
                },
                {
                  items: [
                    { label: 'Plan d\'actions', type: 'fonction', code: 'GESXX1JQXIP' }
                  ]
                },
                {
                  items: [
                    { label: 'Mise à jours des coûts', type: 'fonction', code: 'XX1JQMAJCOUT' }
                  ]
                },
                {
                  items: [
                    { label: 'Réimpression étiquettes EQ', type: 'fonction', code: 'ZBAREQ' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Gestion de la qualité',
            items: [
              [
                {
                  items: [
                    { label: 'Action modèle', type: 'fonction', code: 'GESXX1JQXAM' }
                  ]
                },
                {
                  items: [
                    { label: 'Modèles de plans d\'actions', type: 'fonction', code: 'GESXX1JQXPL' }
                  ]
                },
                {
                  items: [
                    { label: 'Audit', type: 'fonction', code: 'GESXX1JQXAU' }
                  ]
                },
                {
                  label: 'Notation fournisseurs',
                  type: 'categorie',//JE NE TROUVE PAS LE CODE
                  items: [
                    { label: 'Profil qualité', type: 'fonction', code: 'GESXX1JQXPQ' },
                    { label: 'Consultation notes', type: 'fonction', code: 'CONSXX1JQ' },
                    { label: 'Calcul notes', type: 'fonction', code: 'GESXX1JQXCN' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Scorecard',
            items: [
              [
                {
                  label: 'Client',
                  type: 'categorie', //JE NE TROUVE PAS LE CODE
                  items: [
                    { label: 'Calcul', type: 'fonction', code: 'XX1JYOTD' },
                    { label: 'Consultation', type: 'fonction', code: 'CONSX1JYC' },
                    { label: 'Objectif global', type: 'fonction', code: 'XX1JYXOBJC' },
                  ]
                },
                {
                  label: 'Fournisseurs',
                  type: 'categorie', //JE NE TROUVE PAS LE CODE
                  items: [
                    { label: 'Calcul', type: 'fonction', code: 'XX1JYOTDF' },
                    { label: 'Consultation', type: 'fonction', code: 'XX1JYXOBJ' },
                    { label: 'Objectif global', type: 'fonction', code: 'CONSX1JYF' },
                  ]
                },
              ]
            ]
          },
          {
            label: 'Gestion des dérogations',
            items: [
              [
                {
                  items: [
                    { label: 'Demandes de dérogation Clients', type: 'fonction', code: 'GESXX1JDDC' }
                  ]
                },
                {
                  items: [
                    { label: 'Demandes de dérogation Fournisseurs', type: 'fonction', code: 'GESXX1JDDF' }
                  ]
                },
                {
                  items: [
                    { label: 'Notifications de rejet Clients', type: 'fonction', code: 'GESXX1JDNC' }
                  ]
                },
                {
                  items: [
                    { label: 'Notifications de rejet Fournisseurs', type: 'fonction', code: 'GESXX1JDNF' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Contrôle qualité',
            items: [
              [
                {
                  items: [
                    { label: 'Relevés de contrôles', type: 'fonction', code: 'GESXX1JCRC' }
                  ]
                },
                {
                  items: [
                    { label: 'Gammes de contrôles', type: 'fonction', code: 'GESXX1JCSGC' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Gestion des FAI',
            items: [
              [
                {
                  items: [
                    { label: 'FAI de référence', type: 'fonction', code: 'GESXX1JFFR' }
                  ]
                },
                {
                  items: [
                    { label: 'FAI', type: 'fonction', code: 'GESXX1JFFAI' }
                  ]
                }
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case '4CAD Gestion des moyens':
        return [
          {
            label: 'Maintenance',
            items: [
              [
                {
                  items: [
                    { label: 'Moyens', type: 'fonction', code: 'GESXX1JMMO' }
                  ]
                },
                {
                  items: [
                    { label: 'Tâches', type: 'fonction', code: 'GESXX1JMTSK' }
                  ]
                },
                {
                  items: [
                    { label: 'Monitoring des plans de maintenance', type: 'fonction', code: 'XX1JMPM' }
                  ]
                }
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case '4CAD Gestion des habilitations':
        return [
          {
            label: 'Habilitations',
            items: [
              [
                {
                  items: [
                    { label: 'Gestion des habilitations', type: 'fonction', code: 'GESXX1JHHAB' }
                  ]
                },
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case '4CAD Devis technique':
        return [
          {
            label: 'Devis technique',
            items: [
              [
                {
                  items: [
                    { label: 'Détermination marge', type: 'fonction', code: 'GESXX1JTXMM' }
                  ]
                },
                {
                  items: [
                    { label: 'Détermination technique', type: 'fonction', code: 'GESXX1JTXSQ' }
                  ]
                },
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      case '4CAD Suivi atelier':
        return [
          {
            label: 'Paramétrage',
            items: [
              [
                {
                  items: [
                    { label: 'Décomposition codes-barres', type: 'fonction', code: 'GESX4BAD' }
                  ]
                },
                {
                  items: [
                    { label: 'Horaires pré-saisis matricule', type: 'fonction', code: 'CONSXCT' }
                  ]
                },
                {
                  items: [
                    { label: 'Matricules avec horaires', type: 'fonction', code: 'GESXM2' }
                  ]
                },
                {
                  items: [
                    { label: 'Horaire d\'équipe', type: 'fonction', code: 'X4EQUIPE' }
                  ]
                },
                {
                  items: [
                    { label: 'Configuration Saisie des temps', type: 'fonction', code: 'GESXNC' }
                  ]
                },
                {
                  items: [
                    { label: 'Préparation des regroupements', type: 'fonction', code: 'GESXTL' }
                  ]
                }
              ]
            ]
          },
          {
            label: 'Exploitation',
            items: [
              [
                {
                  items: [
                    { label: 'Validation des temps', type: 'fonction', code: 'CONSXTS' }
                  ]
                },
                {
                  items: [
                    { label: 'Validation globale des temps', type: 'fonction', code: 'CONSXTG' }
                  ]
                },
                {
                  items: [
                    { label: 'Régularisation des temps', type: 'fonction', code: 'X4TPSASUP' }
                  ]
                },
                {
                  items: [
                    { label: 'Gestion des temps', type: 'fonction', code: 'GESXTP' }
                  ]
                },
                {
                  items: [
                    { label: 'Saisie des temps Matricule', type: 'fonction', code: 'CNSXTPS' }
                  ]
                },
                {
                  items: [
                    { label: 'Regroupement de temps', type: 'fonction', code: 'GESXTR	' }
                  ]
                },
                {
                  items: [
                    { label: 'Validation auto des temps', type: 'fonction', code: 'X4TPSVAL' }
                  ]
                },
                {
                  items: [
                    { label: 'Suspension automatique', type: 'fonction', code: 'X4AUTSSP' }
                  ]
                }
              ]
            ] as ExtendedMenuItem[][]
          }
        ];
      default:
        menuItems = []; // Ajoutez cette ligne pour gérer les cas par défaut
        break;

    }
    return menuItems;

  }

  utilitairesSubMenuItems: MenuItem[] = [
    {
      label: 'Utilitaires',
      items: [
        {
          label: 'Vérifications',
          items: this.getVerificationSubMenu()
        },
        {
          label: 'Maintenances',
          items: this.getMaintenanceSubMenu()
        },
        {
          label: 'Dictionnaire',
          items: this.getDictionnaireSubMenu()
        },
        {
          label: 'Dossiers',
          items: this.getDossiersSubMenu()
        },
        {
          label: 'Recherches',
          items: this.getRecherchesSubMenu()
        },
        {
          label: 'Extraction/Intégration',
          items: this.getExtractionIntegrationSubMenu()
        },
        {
          label: 'Patches',
          items: this.getPatchesSubMenu()
        },
        {
          label: 'Migration depuis 130',
          items: this.getMigration130SubMenu()
        },
        {
          label: 'Tables comptables',
          items: this.getTablesComptablesSubMenu()
        },
        {
          label: 'Divers',
          items: this.getDiversSubMenu()
        },
      ],
      className: 'has-submenu' // Ajoutez une classe spécifique
    },
  ]



  getVerificationSubMenu(): MenuItem[] {
    return [
      { label: 'Surveillances', type: 'categorie', code: 'CONSOIT' },
      { label: 'Surveillance utilisateurs', type: 'fonction' }, //ENTITE
      { label: 'Utilisateurs', type: 'fonction', code: 'PSADX' },
      { label: 'Services', type: 'fonction', code: 'ADXD' },
      { label: 'Verrous', type: 'categorie', code: 'UTI1V' },
      { label: 'Symboles verrouillés', type: 'fonction', code: 'VERSYMB' },
      { label: 'Traitements verrouillés', type: 'fonction', code: 'LCKSRC' },
      { label: 'Données', type: 'categorie', code: 'UTI1D' },
      { label: 'Cohérences', type: 'fonction', code: 'UTIBASE' },
      { label: 'Dépendances', type: 'fonction', code: 'UTIDEP' },
      { label: 'Base de données', type: 'categorie', code: 'UTI1B' },
      { label: 'Statistiques', type: 'fonction', code: 'TRTSTA' },
      { label: 'Processus', type: 'fonction', code: 'TRTPRO' },
      { label: 'Propriétés', type: 'fonction', code: 'TRTPROP' },
      { label: 'Etat des tables', type: 'fonction', code: 'ETAFIC' },
      { label: 'Recherche index', type: 'fonction', code: 'SQLDICO' },
    ]
  }
  getMaintenanceSubMenu(): MenuItem[] {
    return [
      { label: 'En lignes', type: 'fonction', code: 'GMAINT' },
      { label: 'En colonnes', type: 'fonction', code: 'GSTDCOL' }
    ]
  }
  getDictionnaireSubMenu(): MenuItem[] {
    return [
      { label: 'Validations', type: 'categorie', code: 'UTI2V' },
      { label: 'Profils fonction site', type: 'fonction', code: 'AVALAFC' },
      { label: 'Dictionnaire', type: 'fonction', code: 'VALDICO' },
      { label: 'Menus', type: 'fonction', code: 'VALMENU' },
      { label: 'Recodification processus', type: 'fonction', code: 'ARECOPRO' },
      { label: 'Analyseurs de différences', type: 'categorie', code: 'UTI2D' },
      { label: 'Objets', type: 'fonction', code: 'ACOMPOBJ' },
      { label: 'Arguments sous-programmes', type: 'fonction', code: 'ADIFSUB' },
      { label: 'Génération transactions', type: 'fonction', code: 'GENMSKTRT' },
      { label: 'Synchronisation des fenêtres', type: 'fonction', code: 'SYNCHDICO' },
      { label: 'Copies', type: 'categorie', code: 'UTI2C' },
      { label: 'Dictionnaire', type: 'fonction', code: 'ACOPDIC' },
      { label: 'Transactions', type: 'fonction', code: 'ACOPTRS' },
      { label: 'Copie élément client', type: 'fonction', code: 'ACOPELT' },
      { label: 'Traitements', type: 'fonction', code: 'COPTRT' },
      { label: 'Fichiers', type: 'fonction', code: 'ACOPFIC' },
      { label: 'Etats', type: 'fonction', code: 'COPRPT' },
      { label: 'Législations', type: 'fonction', code: 'ADOSCOPDAT' },
      { label: 'Codes postaux', type: 'fonction', code: 'ACOPPOS' },
      { label: 'Archives', type: 'categorie', code: 'UTI2A' },
      { label: 'Génération de l\'archive', type: 'fonction', code: 'ARCHGENTRT' },
      { label: 'Archive traitements', type: 'fonction', code: 'ARCHTRT' },
      { label: 'Mise à jour menus locaux', type: 'fonction', code: 'GENMENULOC' },
    ];

  }
  getDossiersSubMenu(): MenuItem[] {
    return [
      { label: 'Changement de dossier', type: 'fonction', code: 'CHDOS' },
      { label: 'Déverrouillage dossier', type: 'fonction', code: 'DEVERROU' },
      { label: 'Verrouillage dossier', type: 'fonction', code: 'VERROU' },
      { label: 'Remise à zéro dossier', type: 'fonction', code: 'RAZDOS' },
      { label: 'Import dossier', type: 'fonction', code: 'IMPDOS' },
      { label: 'Mode mono', type: 'fonction', code: 'MONO' },
      { label: 'Mode multi', type: 'fonction', code: 'MULTI' },
      { label: 'MAJ des utilisateurs nommés', type: 'fonction', code: 'ARECAUO' },
      { label: 'Création dossier historisé', type: 'fonction', code: 'CREHISTO' },
      { label: 'Initialisation textes traduisibles', type: 'fonction', code: 'AINITEXTRA' },
    ];
  }
  getRecherchesSubMenu(): MenuItem[] {
    return [
      { label: 'Code activité', type: 'fonction', code: 'RECHACT' },
      { label: 'Type de données', type: 'fonction', code: 'RECHTYP' },
      { label: 'Code d\'accès', type: 'fonction', code: 'RECHACC' },
      { label: 'Action', type: 'fonction', code: 'RECHACI' },
      { label: 'Champ', type: 'fonction', code: 'RECHAMZ' },
      { label: 'Message', type: 'fonction', code: 'RECHMESS' },
      { label: 'Texte', type: 'fonction', code: 'RECHTXT' },
      { label: 'Texte (avancée)', type: 'fonction', code: 'ASEAAPL' },
      { label: 'Divers', type: 'fonction', code: 'RECHADC' },
      { label: 'Icônes', type: 'fonction', code: 'AICONE' },
      { label: 'Menu', type: 'fonction', code: 'ARECHMEN' },
      { label: 'Recherche rapide traitements', type: 'fonction', code: 'ARECSRC' },
    ];
  }
  getPatchesSubMenu(): MenuItem[] {
    return [
      { label: 'Intégration de patches', type: 'fonction', code: 'PATCH' },
      { label: 'Création de patches', type: 'fonction', code: 'APATCH' },
      { label: 'Consultation de patches', type: 'fonction', code: 'GESAPT' },
      { label: 'Delivery historic', type: 'fonction', code: 'GESXX1JJHIS' },
      { label: 'Test de patches', type: 'fonction', code: 'PATCHT' },
      { label: 'Création automatique de patches', type: 'fonction', code: 'APATCHA' },
      { label: 'Modèle de paramétrage', type: 'fonction', code: 'GESAPH' },
      { label: 'Copie paramétrage', type: 'fonction', code: 'ACOPAPH' },
    ];
  }
  getExtractionIntegrationSubMenu(): MenuItem[] {
    return [
      { label: 'Extraction données', type: 'fonction', code: 'DOSEXTRA' },
      { label: 'Intégration données', type: 'fonction', code: 'DOSINTEG' },
    ];
  }
  getMigration130SubMenu(): MenuItem[] {
    return [
      { label: 'Pièces jointes et images', type: 'fonction', code: 'RECOBJTXT' },
      { label: 'Textes', type: 'fonction', code: 'RECTXTUTI' },
    ];
  }
  getTablesComptablesSubMenu(): MenuItem[] {
    return [
      { label: 'Suppression comptes en masse', type: 'fonction', code: 'GACCDEL' },
      { label: 'Duplication comptes en masse', type: 'fonction', code: 'GACCDUP' },
    ];
  }
  getDiversSubMenu(): MenuItem[] {
    return [
      { label: 'Gestion du portail', type: 'fonction', code: 'AMAINTPORT' },
      { label: 'Transactions système', type: 'fonction', code: 'AMIEXE' },
      { label: 'Ordres système', type: 'fonction', code: 'SYSTEME' },
      { label: 'Trace pour le support', type: 'fonction', code: 'ALOGSUP' },
      { label: 'Exécution traitements', type: 'fonction', code: 'EXETRT' },
      { label: 'Envoi statistiques licence', type: 'fonction', code: 'AUSRSTA' },
      { label: 'Mise à jour textes traduisibles', type: 'fonction', code: 'GENTXTTRA' },
      { label: 'Pool Java Bridge', type: 'fonction', code: 'GESAPB' },
      { label: 'Valeurs des compteurs', type: 'fonction', code: 'MODCPT' },
      { label: 'Pool de services web', type: 'fonction', code: 'GESAPW' },
      { label: 'Copie valeurs paramètres', type: 'fonction', code: 'ACOPADO' },
      { label: 'Paramétrage changement de clé', type: 'fonction', code: 'GESACG' },
      { label: 'Changement de clé en masse', type: 'fonction', code: 'ACHANGE' },
      { label: 'Suppressions', type: 'fonction', code: 'ADELETE' },
      { label: 'Resynchronisation des liaisons', type: 'fonction', code: 'RECUPLNK' },
      { label: 'Activation des liaisons', type: 'fonction', code: 'ACTIVLNK' },
      { label: 'Synchronisation des textes', type: 'fonction', code: 'SYNCHTXT' },
      { label: 'Conversion UTF8', type: 'fonction', code: 'CNVUTF8' },
    ];
  }

  gestionTaxesSubMenuItems: MenuItem[] = [
    {
      label: 'Gestion des taxes',
      items: [
        {
          label: 'Autres',
          items: this.getAutresSubMenu()
        },
        {
          label: 'France',
          items: this.getFranceSubMenu()
        },
        {
          label: 'Etats Unis',
          items: this.getEtatsUnisSubMenu()
        },
      ]
    },
  ]

  getAutresSubMenu(): MenuItem[] {
    return [
      { label: 'Paramétrage', type: 'categorie', code: 'MOTHS' },
      { label: 'Cases TVA', type: 'fonction', code: 'GESVTB' },
      { label: 'Formulaire TVA', type: 'fonction', code: 'GESVEF' },
      { label: 'Entités de TVA', type: 'fonction', code: 'GESVATGRP' },
      { label: 'Traitements', type: 'categorie', code: 'MOTHP' },
      { label: 'Déclaration Européenne de Services', type: 'fonction', code: 'DCLESD' },
      { label: 'Déclaration préparatoire TVA', type: 'fonction', code: 'DCLVATOTH' },
      { label: 'Déclarations de TVA', type: 'fonction', code: 'GESVFE' }
    ]
  }
  getFranceSubMenu(): MenuItem[] {
    return [
      { label: 'Déclaration française', type: 'fonction', code: 'DCLVATFRA' },
    ];
  }
  getEtatsUnisSubMenu(): MenuItem[] {
    return [
      { label: 'Initialisation Sage Sales Tax', type: 'fonction', code: 'FUNSSTENT' },
    ];
  }

  declarationEchangeBienTaxesSubMenuItems: MenuItem[] = [
    {
      label: 'Déclaration d\'échanges de biens',
      items: [
        {
          label: 'Autres',
          items: this.getAutres2SubMenu()
        },
      ]
    },
  ]
  getAutres2SubMenu(): MenuItem[] {
    return [
      { label: 'Paramétrage', type: 'categorie', code: 'MDEBS' },
      { label: 'Régime statistique', type: 'fonction', code: 'GESTSC' },
      { label: 'Nature transaction', type: 'fonction', code: 'GESTEC' },
      { label: 'Régimes et natures mouvement', type: 'fonction', code: 'GESDRN' },
      { label: 'Nomenclatures NC8', type: 'fonction', code: 'GESINO' },
      { label: 'Traitements', type: 'categorie', code: 'MDEBP' },
      { label: 'Génération fichier DEB', type: 'fonction', code: 'FUNDEB' },
      { label: 'Gestion fichier DEB', type: 'fonction', code: 'GESDEB' },
    ];
  }

  AutresDeclarations: MenuItem[] = [
    {
      label: 'Autres déclarations',
      items: [
        {
          label: 'Balances des paiements',
          items: this.getBalancePaiements()
        },
        {
          label: 'Gestion des déchets',
          items: this.getGestionDechets()
        },
      ]
    },
  ]

  getBalancePaiements(): MenuItem[] {
    return [
      { label: 'Paramétrage', type: 'categorie' },//PAS TROUVE
      { label: 'Paramètres champ', type: 'fonction' },//ENTITE
      { label: 'Articles/motifs économiques', type: 'fonction' },//ENTITE
      { label: 'Configuration', type: 'fonction' },//ENTITE
      { label: 'Traitements', type: 'categorie' },//PAS TROUVE
      { label: 'Génération', type: 'fonction' },//ENTITE
    ];
  }

  getGestionDechets(): MenuItem[] {
    return [
      { label: 'Traitements', type: 'categorie', code: 'MDMWP' },
      { label: 'Calcul des déchets', type: 'fonction', code: 'DMWBAT' },
      { label: 'Autriche', type: 'categorie', code: 'DMWPA' },
      { label: 'Résultats détaillés calcul', type: 'fonction', code: 'CONSDMWD' },
      { label: 'Résultats groupés calcul', type: 'fonction', code: 'CONSDMWG' },
      { label: 'Allemagne', type: 'categorie', code: 'DMWPD' },
      { label: 'Résultats détaillés calcul', type: 'fonction', code: 'CONSDMWDD' },
      { label: 'Résultats groupés calcul', type: 'fonction', code: 'CONSDMWGD' },
      { label: 'Paramétrage', type: 'categorie', code: 'MDMWS' },
      { label: 'Système de gestion des déchets', type: 'fonction', code: 'GESDMWSC' },
      { label: 'Classification Ordonnance emballage', type: 'fonction', code: 'GESDMWPAORD' },
      { label: 'Affectation emballage article', type: 'fonction', code: 'GESDMWPPA' },
      { label: 'Quotas de gestion des déchets', type: 'fonction', code: 'GESDMWQUOTA' },
      { label: 'Exceptions gestion des déchets', type: 'fonction', code: 'GESDMWBPREX' },
    ];
  }

  Audit: MenuItem[] = [
    {
      label: 'Audit',
      items: [
        {
          label: 'France',
          items: this.getFrance2()
        },
        {
          label: 'Gestion des déchets',
          items: this.getPortugal()
        },
      ]
    },
  ]

  getFrance2(): MenuItem[] {
    return [
      { label: 'Paramétrage', type: 'categorie', code: 'AFRAS' },
      { label: 'Paramètres FEC', type: 'fonction', code: 'GESFAE' },
      { label: 'Traitements', type: 'categorie', code: 'AFRAP' },
      { label: 'Lancement interface FEC', type: 'fonction', code: 'FAEINT' },
    ];
  }
  getPortugal(): MenuItem[] {
    return [
      { label: 'Paramétrage', type: 'categorie', code: 'APORS' },
      { label: 'Classification fiscale', type: 'fonction', code: 'GESVCL' },
      { label: 'Traitements', type: 'categorie', code: 'APORP' },
      { label: 'Extraction SAF-T', type: 'fonction', code: 'FUNSAFTEXT' },
    ];
  }




}