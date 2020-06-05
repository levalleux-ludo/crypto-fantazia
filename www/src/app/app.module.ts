import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ClarityModule } from '@clr/angular';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AlertComponent } from './_components/alert/alert.component';
import { ProgressBarComponent } from './_components/progress-bar/progress-bar.component';
import { DockContainerComponent } from './_components/dock-container/dock-container.component';
import { ModalComponent } from './_components/modal/modal.component';
import { ModalExampleComponent } from './_components/modal-example/modal-example.component';
import { ModalDirective } from './_directives/modal.directive';
import { DummyContentComponent } from './_components/dummy-content/dummy-content.component';
import { FooterComponent } from './_components/footer/footer.component';
import { NavBarComponent } from './_components/nav-bar/nav-bar.component';
import { SubNavBarComponent } from './_components/sub-nav-bar/sub-nav-bar.component';
import { HeaderComponent } from './_components/header/header.component';
import { VerticalLeftBarComponent } from './_components/vertical-left-bar/vertical-left-bar.component';

@NgModule({
  declarations: [
    AppComponent,
    AlertComponent,
    ProgressBarComponent,
    DockContainerComponent,
    ModalComponent,
    ModalExampleComponent,
    ModalDirective,
    DummyContentComponent,
    FooterComponent,
    NavBarComponent,
    SubNavBarComponent,
    HeaderComponent,
    VerticalLeftBarComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ClarityModule,
    BrowserAnimationsModule,
    FlexLayoutModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent],
  entryComponents: [
    ModalExampleComponent
  ]
})
export class AppModule { }
