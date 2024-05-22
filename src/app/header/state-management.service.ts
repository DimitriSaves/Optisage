// src/app/services/state-management.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StateManagementService {
  private resetStateSource = new Subject<void>();

  // Observable stream that components can subscribe to
  resetState$ = this.resetStateSource.asObservable();

  constructor() { }

  public resetState(): void {
    sessionStorage.clear(); // Clear all session storage
    this.resetStateSource.next(); // Notify all subscribers
  }
}

