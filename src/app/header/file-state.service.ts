import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FileStateService {
    private fileNameSource = new BehaviorSubject<string | null>(localStorage.getItem('uploadedFileName'));
    currentFileName = this.fileNameSource.asObservable();

    changeFileName(fileName: string | null) {
        this.fileNameSource.next(fileName);
        if (fileName) {
            localStorage.setItem('uploadedFileName', fileName);
        } else {
            localStorage.removeItem('uploadedFileName');
        }
    }
}
