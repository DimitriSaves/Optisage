import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { FaceSnap } from 'src/models/face-snap.model';
import { FaceSnapsServices } from '../services/face-snaps.services';

@Component({
  selector: 'app-tab-page',
  templateUrl: './tab-page.component.html',
  styleUrls: ['./tab-page.component.scss']
})
export class TabPageComponent {
  @Input() faceSnap! : FaceSnap;

  stateSnaps!: boolean;
  buttonText!: string;


  constructor(private faceSnapsService: FaceSnapsServices,
              private router: Router){

  }
  NomColonne = [
    {
      id: 'id',
      title: 'title',
      description: 'description',
      imageUrl: 'imageUrl',
      createdDate: 'date',
      snaps: 'Snaps',
      location: 'location'
    }
   ];
 
}
