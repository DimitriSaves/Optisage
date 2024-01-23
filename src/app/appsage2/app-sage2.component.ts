import { Component, OnInit } from '@angular/core';
import { MegaMenuItem, MenuItem } from 'primeng/api';

// Interfaces avec identifiants uniques
interface FunctionItem {
  id: string;
  label: string;
}

interface Category {
  id: string;
  label: string;
  functions: FunctionItem[];
}

interface MegaMenuExtended extends MegaMenuItem {
  id: string; // Identifiant unique pour la catégorie
  categories: Category[];
  label: string;

}

@Component({
  selector: 'app-app-sage2',
  templateUrl: './app-sage2.component.html',
  styleUrls: ['./app-sage2.component.scss']
})
export class AppSage2Component implements OnInit {
  horizontal: boolean = true; // Ajoutez cette ligne pour définir la propriété
  mainMenuItems!: MenuItem[];
  megaMenuItems: MegaMenuItem[] = []; // Utilisez le type de base MegaMenuItem

  ngOnInit() {
    this.mainMenuItems = [
      { label: 'Administration', command: () => this.selectMainMenu('administration') },
      { label: 'Développement', command: () => this.selectMainMenu('developpement') },
      // ... autres éléments de menu principal
    ];
  }

  selectMainMenu(menuId: string) {
    if (menuId === 'administration') {
      const adminData = this.getAdministrationData();
      const items = adminData.categories.map(category => ({
        label: category.label,
        items: category.functions.map(func => ({ label: func.label }))
      }));

      this.megaMenuItems = [{
        label: adminData.label,
        items: [items] // items ici doit être un tableau de tableaux
      }];
    } else if (menuId === 'developpement') {
      // Supposons que vous ayez une méthode similaire pour le développement
      // const devData = this.getDevelopmentData();
      // ... 
    }
    // ... autres cas pour d'autres éléments du menu principal
  }

  getAdministrationData(): { label: string, categories: Category[] } {
    return {
      label: 'Administration',
      categories: [
        {
          id: 'utilisateurs', label: 'Utilisateurs',
          functions: [
            { id: 'utilisateurs', label: 'Utilisateurs' },
            { id: 'groupes', label: 'Groupes' },
            { id: 'roles', label: 'Rôles' },
            { id: 'profils_de_securite', label: 'Profils de sécurité' },
          ]
        },
        {
          id: 'licences', label: 'Licences',
          functions: [
            { id: 'detail_de_ licences', label: 'Détail des licences' },
            { id: 'badges', label: 'Badges' },
            { id: 'telechargement_licence', label: 'Téléchargement Licence' },
          ]
        },
        {
          id: 'services_web', label: 'Services_Web',
          functions: [
            { id: 'services_web_classic_SOAP', label: 'Services web Classic SOAP' },
            { id: 'configuration_pools_classic_SOAP', label: 'Configuration pools Classic SOAP' },
            { id: 'services_web_REST', label: 'Services web REST' },
          ]
        },
        {
          id: 'parametrages', label: 'Paramétrages',
          functions: [
            { id: 'parametres_generaux', label: 'Paramètres généraux' },
            { id: 'parametres_regionaux', label: 'Paramètres régionaux' },
            { id: 'politiques_de_mot_de_passe', label: 'Politiques de mot de passe' },
            { id: 'regles_url_externes', label: 'Règles URL externes' },
            { id: 'configuration_des_proxy', label: 'Configuration des proxy' },
          ]
        },
        {
          id: 'authentification', label: 'Authentification',
          functions: [
            { id: 'serveurs_ldap', label: 'Serveurs LDAP' },
            { id: 'serveurs_oauth2', label: 'Serveurs OAuth2' },
            { id: 'fournisseurs_id_saml2', label: 'Fournisseurs ID SAML2' },
            { id: 'applications_connectees', label: 'Applications connectées' },
          ]
        },
        {
          id: 'certificats', label: 'Certificats',
          functions: [
            { id: 'certificats', label: 'Certificats' },
            { id: 'certificats_des_autorites_de_certification', label: 'Certificats des Autorités de certification' }
          ]
        },
        {
          id: 'points_de_connexion', label: 'Points de connexion',
          functions: [
            { id: 'applications', label: 'Applications' },
            { id: 'solutions_x3', label: 'Solutions X3' },
            { id: 'points_de_connexion', label: 'Points de connexion' },
            { id: 'serveur_batch', label: 'Serveur batch' }
          ]
        },
        {
          id: 'serveurs', label: 'Serveurs',
          functions: [
            { id: 'serveur_web', label: 'Serveur web' },
            { id: 'serveurs_de_notification', label: 'Serveurs de notification' },
            { id: 'serveurs_bi', label: 'Serveurs BI' },
            { id: 'profils_bi', label: 'Profils BI' }
          ]
        },
        {
          id: 'portail_sage_x3_people', label: 'Portail Sage X3 People',
          functions: [
            { id: 'serveurs', label: 'Serveurs' },
            { id: 'sites', label: 'Sites' }
          ]
        }
        // ... autres catégories pour l'administration
      ]
    };
  }

}