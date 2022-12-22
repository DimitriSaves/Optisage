import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FaceSnap } from 'src/models/face-snap.model';
import { FaceSnapsServices } from '../services/face-snaps.services';

@Component({
  selector: 'app-single-face-snap',
  templateUrl: './single-face-snap.component.html',
  styleUrls: ['./single-face-snap.component.scss']
})
export class SingleFaceSnapComponent {
 faceSnap! : FaceSnap;

  buttonText!: string;
  router: any;


  constructor(private faceSnapsService: FaceSnapsServices,
              private route: ActivatedRoute){

  }

  ngOnInit(){
    this.buttonText = "Like";
    const FaceSnapById = +this.route.snapshot.params['id'];
    this.faceSnap = this.faceSnapsService.getFaceSnapById(FaceSnapById);
  }
 

  onSnap() {
    if (this.buttonText === 'Like') {
        this.faceSnapsService.snapFaceSnapById(this.faceSnap.id, 'snap');
        this.buttonText = 'Dislike';
    } else {
      this.faceSnapsService.snapFaceSnapById(this.faceSnap.id, 'unsnap');
      this.buttonText = 'Like';
  }
}
}