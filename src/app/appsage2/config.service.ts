import { Injectable } from "@angular/core";

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private functionDetails: Map<string, any> = new Map();

  storeFunctionData(code: string, data: any[]) {
    this.functionDetails.set(code, data);
  
    // Mettre à jour la liste globale des fonctions
    let functionsData = JSON.parse(localStorage.getItem('functionsData') || '[]');
  
    // Mettre à jour les configurations pour cette fonction sans les supprimer
    data.forEach((newConfig: any) => {
      const index = functionsData.findIndex((item: any) => 
        item.function === newConfig.function &&
        item.profileCode === newConfig.profileCode &&
        item.sites === newConfig.sites
      );
  
      if (index !== -1) {
        functionsData[index] = newConfig; // Mettre à jour la configuration existante
      } else {
        functionsData.push(newConfig); // Ajouter la nouvelle configuration
      }
    });
  
    localStorage.setItem('functionsData', JSON.stringify(functionsData));
    localStorage.setItem('functionData-' + code, JSON.stringify(data)); // Sauvegarder les données dans localStorage
  }
  
  
  
  getFunctionData(code: string): any[] {
    const storedData = localStorage.getItem('functionData-' + code);
    if (storedData) {
      const data = JSON.parse(storedData);
      this.functionDetails.set(code, data);  // Mettre à jour la Map également
      return data;
    } else {
      return [];
    }
  }

  clearAllFunctionData() {
    this.functionDetails.clear();
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('functionData-')) {
        localStorage.removeItem(key);
      }
    });
    localStorage.removeItem('functionsData');
  }

  private safeStringify(obj: any): string {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return;
        }
        seen.add(value);
      }
      return value;
    });
  }
}
