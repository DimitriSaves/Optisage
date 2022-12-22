import { Component, OnInit, Input} from '@angular/core';
import { Router } from '@angular/router';
import { distinctUntilKeyChanged } from 'rxjs';
import { FaceSnap } from 'src/models/face-snap.model';
import { FaceSnapsServices } from '../services/face-snaps.services';

@Component({
  selector: 'app-face-snap',
  templateUrl: './face-snap.component.html',
  styleUrls: ['./face-snap.component.scss']
})
export class FaceSnapComponent implements OnInit{
  @Input() faceSnap! : FaceSnap;

  stateSnaps!: boolean;
  buttonText!: string;


  constructor(private faceSnapsService: FaceSnapsServices,
              private router: Router){

  }

  ngOnInit(){
    this.stateSnaps = true;
    this.buttonText = 'Like';
  }

  onSnap() {
    if (this.buttonText === 'Like') {
        this.faceSnapsService.snapFaceSnapById(this.faceSnap.id, 'snap');
        this.buttonText = 'Dislike';
    } else {
      this.stateSnaps = true;
      this.faceSnapsService.snapFaceSnapById(this.faceSnap.id, 'unsnap');
      this.buttonText = 'Like';
  }
}

onViewFaceSnap(){
  this.router.navigateByUrl(`facesnaps/${this.faceSnap.id}`);}


}
