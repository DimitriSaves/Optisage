import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { TabPageComponent } from './tab-page/tab-page.component';

const routes: Routes = [
    { path:'', component: LandingPageComponent },
    { path: 'tab', component:TabPageComponent },

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