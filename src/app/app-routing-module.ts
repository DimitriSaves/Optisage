import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabPageComponent } from './tab-page/tab-page.component';
import { AppSage2Component } from './appsage2/app-sage2.component';

const routes: Routes = [
    { path:'', component: TabPageComponent },
    { path: 'app-page2', component: AppSage2Component }


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