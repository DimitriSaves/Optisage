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
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { TooltipModule } from 'primeng/tooltip';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { DynamicDialogModule } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DialogService } from 'primeng/dynamicdialog';
import { MultiSelectModule } from 'primeng/multiselect';

import * as fr from  '@angular/common/locales/fr'


import { AppRoutingModule } from './app-routing-module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { MenubarModule } from 'primeng/menubar';
import { MegaMenuModule } from 'primeng/megamenu';
import { AppSage2Component } from './appsage2/app-sage2.component';
import { LayoutModule } from '@angular/cdk/layout';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    AppSage2Component,
    
    
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
    MatSnackBarModule,
    BrowserAnimationsModule,
    CommonModule,
    HttpClientModule,
    NgxDatatableModule,
    ScrollingModule,
    MatButtonModule,
    MatMenuModule,
    MatToolbarModule,
    MenubarModule,
    MegaMenuModule,
    TieredMenuModule,
    LayoutModule,
    TooltipModule,
    OverlayPanelModule,
    InputTextModule,
    ButtonModule,
    FormsModule, 
    DynamicDialogModule,
    DialogModule,
    MultiSelectModule 
    ],
    schemas: [
      CUSTOM_ELEMENTS_SCHEMA
    ],
  providers: [
    { provide: LOCALE_ID, useValue: 'fr-FR'}, 
    DialogService  
  ],
  bootstrap: [AppComponent]
})
export class AppModule { 
  constructor(){
    registerLocaleData(fr.default);
  }
}
