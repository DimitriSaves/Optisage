import { NgModule, LOCALE_ID, EventEmitter } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatTableModule } from '@angular/material/table';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MatTableDataSourcePaginator } from '@angular/material/table';
import * as fr from  '@angular/common/locales/fr'


import { AppRoutingModule } from './app-routing-module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { TabPageComponent } from './tab-page/tab-page.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    LandingPageComponent,
    TabPageComponent,
    ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    DragDropModule,
    MatTableModule,
    FormsModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule,
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    HttpClientModule,
    NgxDatatableModule
    ],
    schemas: [
      CUSTOM_ELEMENTS_SCHEMA
    ],
  providers: [
    { provide: LOCALE_ID, useValue: 'fr-FR'},    
  ],
  bootstrap: [AppComponent]
})
export class AppModule { 
  constructor(){
    registerLocaleData(fr.default);
  }
}
