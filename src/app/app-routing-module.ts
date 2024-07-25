import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppSage2Component } from './appsage2/app-sage2.component';

const routes: Routes = [
    { path: '', component: AppSage2Component }


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