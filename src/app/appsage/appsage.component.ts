import { Component } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { ViewChildren, QueryList } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import { FormsModule } from '@angular/forms';

interface MenuItem {
  label: string;
  subMenus?: SubMenu[];
}

interface SubMenu {
  label: string;
  categories?: Category[];
}

interface Category {
  label: string;
  functions?: string[];
}

@Component({
  selector: 'app-appsage',
  templateUrl: './appsage.component.html',
  styleUrls: ['./appsage.component.scss']
})
export class AppsageComponent {
  @ViewChildren(MatMenuTrigger) menuTriggers!: QueryList<MatMenuTrigger>;

  triggers: any;
  selectedMenu: MenuItem | null = null;
  showSubMenu: MenuItem | null = null;
  showSubMenus: boolean[]; // Un tableau pour garder la trace de l'état affiché de chaque sous-menu

  // ... Autres propriétés et méthodes
  constructor() {
    // Initialisez menuItems avec vos données ici
    this.showSubMenus = new Array(this.menuItems.length).fill(false); // Commence avec tous les sous-menus masqués
  }


 /* // Fonction pour afficher le sous-menu correspondant
  showSubMenu2(menuItem: MenuItem): void {
    this.showSubMenu = menuItem;
  }

  // Fonction pour masquer le sous-menu
  hideSubMenu(): void {
    this.showSubMenu = null;
  }
  openSubMenu(menuItem: MenuItem): void {
    this.selectedMenu = menuItem;
  }

  closeSubMenu(): void {
    this.selectedMenu = null;
  }*/

  // Méthode pour afficher un sous-menu spécifique
  onMouseEnter(index: number): void {
    this.resetSubMenus(); // Masquer tous les sous-menus
    this.showSubMenus[index] = true; // Afficher le sous-menu survolé
  }

  // Méthode pour masquer tous les sous-menus
  onMouseLeave(): void {
    this.resetSubMenus();
  }

  // Méthode d'assistance pour réinitialiser le tableau showSubMenus
  private resetSubMenus(): void {
    this.showSubMenus.fill(false);
  }


  // Fonction pour basculer l'affichage d'un sous-menu spécifique
  toggleSubMenu(index: number): void {
    // Bascule l'état de true à false ou vice versa
    this.showSubMenus[index] = !this.showSubMenus[index];
  }


  menuItems: MenuItem[] = [
    {
      label: 'Administration',
      subMenus: [
        {
          label: 'Administration',
          categories: [
            {
              label: 'Utilisateurs',
              functions: ['Utilisateurs', 'Groupes', 'Rôles', 'Profils de sécurité'],
            },
            {
              label: 'Licences',
              functions: ['Détail des licences', 'Badges', 'Téléchargement Licence'],
            },
            {
              label: 'Paramétrages',
              functions: ['Paramètres généraux', 'Paramètres régionaux', 'Politiques de mot de passe', 'Règles URL externes', 'Configuration des proxy'],
            },
            {
              label: 'Authentification',
              functions: ['Serveurs LDAP', 'Serveurs OAuth2', 'Fournisseurs ID SAML2', 'Applications connectées'],
            },
            {
              label: 'Certificats',
              functions: ['Certificats', 'Certificats des Authorités de certification'],
            },
            {
              label: 'Points de connexion',
              functions: ['Applications', 'Solutions X3', 'Points de connexion', 'Serveur batch'],
            },
            {
              label: 'Serveurs',
              functions: ['Serveur web', 'Serveurs de notification', 'Serveurs BI', 'Profils BI'],
            },
            {
              label: 'Portail Sage X3 People',
              functions: ['Serveurs', 'Sites'],
            },
          ],
        },
        {
          label: 'Espace collaboratif',
          categories: [
            {
              label: '',
              functions: ['Equipes'],
            },
            {
              label: 'Documents',
              functions: ['Modèles de documents Word', 'Etiquettes de documents', 'Catégories d\'étiquettes de documents'],
            },
            {
              label: '',
              functions: ['Volumes de stockage'],
            },
          ],
        },
        {
          label: 'Personnalisation',
          categories: [
            {
              label: 'Pages',
              functions: ['Pages de navigation', 'Pages d\'accueil', 'Entrées de menu', 'Sous-modules de menu', 'Modules de menu', 'Catégories de menu'],
            },
            {
              label: '',
              functions: ['Pages personnalisées'],
            },
            {
              label: 'Mobile',
              functions: ['Applications mobiles', 'Portails mobiles', 'Gadgets mobiles', 'Tableau de bord d\'accueil mobile', 'Migrer portail mobile'],
            },
          ],
        },
        {
          label: 'Utilitaires',
          categories: [
            {
              label: 'Exports',
              functions: ['Profils d\'exports', 'Export des personnalisations', 'Groupes de ressources'],
            },
            {
              label: 'Mise à jour',
              functions: ['À propos', 'Mises à jour'],
            },
            {
              label: 'Imports',
              functions: ['Imports de données', 'Import des utilisateurs X3', 'Import du profil menu', 'Sessions d\'import'],
            },
            {
              label: 'Imports',
              functions: ['Imports de données', 'Import des utilisateurs X3', 'Import du profil menu', 'Sessions d\'import'],
            },
            {
              label: 'Installation',
              functions: ['Installer les addins pour Office', 'Installer l\'addin pour Outlook', 'Connecteur llog', 'Crystal Report Connector'],
            },
          ],
        },
        {
          label: 'Exploitation',
          categories: [
            {
              label: '',
              functions: ['Gestion du moteur de recherche'],
            },
            {
              label: 'Gestion des sessions',
              functions: ['Suivi licence', 'Informations de session'],
            },
            {
              label: 'Traces',
              functions: ['Traces de sessions X3'],
            },
            {
              label: 'Automatiser',
              functions: ['Ordonnanceur', 'Traces serveur'],
            },
            // Ajoutez d'autres subMenus ici si nécessaire
          ],
        },
      ],
    },
    {
      label: 'Développement',
      subMenus: [
        {
          label: 'Dictionnaires données',
          categories: [
            {
              label: 'Tables',
              functions: ['Tables', 'Types de données', 'Menus locaux - Messages', 'Eléments de dimensionnement', 'Formules de dimensionnement'],
            },
            // Ajoutez d'autres subMenus ici si nécessaire
          ],
        },
      ],
    },
    // ... continuez avec d'autres éléments de menu principaux ici
  ];


 
}
