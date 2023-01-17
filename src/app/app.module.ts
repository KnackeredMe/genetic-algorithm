import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import {RouterModule, RouterOutlet, Routes} from "@angular/router";
import { GeneticAlgorithmComponent } from './components/genetic-algorithm/genetic-algorithm.component';
import {ReactiveFormsModule} from "@angular/forms";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {MatButtonToggleModule} from "@angular/material/button-toggle";
import {MatButtonModule} from "@angular/material/button";

const appRoutes: Routes = [
  {path: '', redirectTo: 'genetic-algorithm', pathMatch: 'full'},
  {path: 'genetic-algorithm', component: GeneticAlgorithmComponent}
]

@NgModule({
  declarations: [
    AppComponent,
    GeneticAlgorithmComponent
  ],
  imports: [
    BrowserModule,
    RouterOutlet,
    RouterModule.forRoot(
      appRoutes,
      {onSameUrlNavigation: 'reload'},
    ),
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatButtonToggleModule,
    MatButtonModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
