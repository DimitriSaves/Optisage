import { Injectable } from '@angular/core'
import { FaceSnap } from 'src/models/face-snap.model';

@Injectable({
    providedIn: 'root'
})
export class FaceSnapsServices {
    faceSnaps: FaceSnap[] = [
        {
          id: 1,
          title: 'Archibald',
          description: 'Scientifique',
          imageUrl: 'assets/ArchibaldAlexander.jpg',
          createdDate: new Date(),
          snaps: 190,
          location: 'Paris'
        },
        {
          id: 2,
          title: 'Drake',
          description: 'Rapper',
          imageUrl: 'assets/Drake.jpg',
          createdDate: new Date(),
          snaps: 105
        },
        {
          id: 3,
          title: 'Cadaques',
          description: 'Une belle ville de Catalogne',
          imageUrl: 'assets/Cadaques.jpg',
          createdDate: new Date(),
          snaps: 15
        }
       ];
  
  getAllFaceSnaps(): FaceSnap[]{
    return this.faceSnaps;
  }

  getFaceSnapById (faceSnapId: number): FaceSnap {
    const faceSnap = this.faceSnaps.find(faceSnaps => faceSnaps.id === faceSnapId);
    if(!faceSnap) {
      throw new Error('FaceSnap not found!');
    } else {
      return faceSnap;
    }
  }

  snapFaceSnapById(faceSnapId: number, snapType: 'snap' | 'unsnap'): void {
    const faceSnap = this.getFaceSnapById(faceSnapId);
    snapType === 'snap' ? faceSnap.snaps++ : faceSnap.snaps--;
  }


}