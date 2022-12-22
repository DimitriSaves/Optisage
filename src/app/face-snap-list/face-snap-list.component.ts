import { Component, OnInit } from '@angular/core';
import { FaceSnap } from 'src/models/face-snap.model';
import { FaceSnapsServices } from '../services/face-snaps.services';

@Component({
  selector: 'app-face-snap-list',
  templateUrl: './face-snap-list.component.html',
  styleUrls: ['./face-snap-list.component.scss']
})
export class FaceSnapListComponent implements OnInit {

  faceSnaps!: FaceSnap[];

  constructor(private faceSnapsService:FaceSnapsServices ) { }

  ngOnInit(): void {
    this.faceSnaps = this.faceSnapsService.getAllFaceSnaps();

  }

}
