import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dad-page',
  templateUrl: './dad-page.component.html',
  styleUrls: ['./dad-page.component.scss']
})
export class DadPageComponent {
  http: any;


  constructor(private router: Router) { }

  file: any;
  getFile(event: any) {
    this.file = event.target.files[0];

    console.log('file', this.file);
  }
  uploadFile() {
   
  }
  
}
