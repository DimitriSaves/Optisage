import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  file!: File;

  constructor(private http: HttpClient) { }

  upload(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post('/api/upload', formData);
}

getFile(): File {
  return this.file;
}




}
