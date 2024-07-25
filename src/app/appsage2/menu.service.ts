// menu.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private codesSubject = new BehaviorSubject<string[]>([]);
  
  // Appelé depuis UploadService pour mettre à jour la liste des codes
  setCodes(codes: string[]) {
    this.codesSubject.next(codes);
  }

  // Utilisé par AppSage2Component pour s'abonner aux codes
  getCodesObservable() {
    return this.codesSubject.asObservable();
  }
  private menuUpdateSource = new Subject<void>();

  menuUpdate$ = this.menuUpdateSource.asObservable();

  notifyMenuUpdate(): void {
    this.menuUpdateSource.next();
  }

}
