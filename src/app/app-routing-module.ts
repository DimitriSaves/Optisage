import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FaceSnapListComponent } from './face-snap-list/face-snap-list.component';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { SingleFaceSnapComponent } from './single-face-snap/single-face-snap.component';
import { TabPageComponent } from './tab-page/tab-page.component';
import { DadPageComponent } from './dad-page/dad-page.component';

const routes: Routes = [
    { path: 'facesnaps/:id', component: SingleFaceSnapComponent },
    { path: 'facesnaps' , component: FaceSnapListComponent},
    { path:'', component: LandingPageComponent },
    { path: 'tab', component:TabPageComponent },
    { path: 'dad', component:DadPageComponent }


];

@NgModule({
    imports: [
        RouterModule.forRoot(routes)
    ],
    exports: [
        RouterModule
    ]
})
export class AppRoutingModule {}