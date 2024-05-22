import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private functionDetails: Map<string, any> = new Map();

  storeFunctionData(code: string, data: any) {
    this.functionDetails.set(code, data);
    localStorage.setItem('functionData-' + code, JSON.stringify(data)); // Sauvegarder les données dans localStorage
  }

  getFunctionData(code: string): any {
    let data = this.functionDetails.get(code);
    if (!data) {
      // Tenter de récupérer les données de localStorage s'il n'y a rien en mémoire
      const storedData = localStorage.getItem('functionData-' + code);
      if (storedData) {
        data = JSON.parse(storedData);
        this.functionDetails.set(code, data); // Restaurer dans le Map si trouvé
      }
    }
    return data;
  }
}
