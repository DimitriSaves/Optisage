import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabPageComponent } from './tab-page/tab-page.component';
import { AppsageComponent } from './appsage/appsage.component';

const routes: Routes = [
    { path:'', component: TabPageComponent },
    { path: 'app-page', component: AppsageComponent }

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