import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MaterialFileInputModule } from 'ngx-material-file-input';
import { ResponsiveModule } from 'ngx-responsive';
import { MatSidenavModule } from '@angular/material/sidenav';

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
import { ConnectionPageComponent } from './_components/connection-page/connection-page.component';
import { WaiterComponent } from './_components/waiter/waiter.component';
import { FantaSymbolComponent } from './_components/fanta-symbol/fanta-symbol.component';
import { TezosConnectComponent } from './_components/tezos-connect/tezos-connect.component';
import { ChooseSessionDialogComponent } from './_components/choose-session-dialog/choose-session-dialog.component';
import { GameStatusComponent } from './_components/game-status/game-status.component';
import { GameFailurePageComponent } from './_components/game-failure-page/game-failure-page.component';
import { GameCreationPageComponent } from './_components/game-creation-page/game-creation-page.component';
import { PlaygroundPageComponent } from './_components/playground-page/playground-page.component';
import { GameOverPageComponent } from './_components/game-over-page/game-over-page.component';
import { PlayersListComponent } from './_components/players-list/players-list.component';
import { PlayerTreenodeComponent } from './_components/player-treenode/player-treenode.component';
import { HistoryComponent } from './_components/history/history.component';
import { SpacesComponent } from './_components/spaces/spaces.component';
import { SpaceDetailsComponent } from './_components/space-details/space-details.component';
import { SpaceDetailsModalComponent } from './_components/space-details-modal/space-details-modal.component';
import { TurnService } from './_services/turn.service';
import { DiceComponent } from './_components/dice/dice.component';
import { CarouselComponent } from './_components/carousel/carousel.component';
import { PlayerPortfolioComponent } from './_components/player-portfolio/player-portfolio.component';
import { SpaceCardComponent } from './_components/space-card/space-card.component';
import { WealthIndicatorComponent } from './_components/wealth-indicator/wealth-indicator.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CarouselItemDirective } from './_components/carousel/carousel-item.directive';
import { CarouselItemElementDirective } from './_components/carousel/carousel-item-element.directive';
import { BoardComponent } from './_components/board/board.component';
import { GameControlsComponent } from './_components/game-controls/game-controls.component';
import { WelcomeComponent } from './_components/welcome/welcome.component';
import { GameComponent } from './_components/game/game.component';
import { OverviewComponent } from './_components/overview/overview.component';
import { GameStatusModalComponent } from './_components/game-status-modal/game-status-modal.component';

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
    VerticalLeftBarComponent,
    ConnectionPageComponent,
    WaiterComponent,
    FantaSymbolComponent,
    TezosConnectComponent,
    ChooseSessionDialogComponent,
    GameStatusComponent,
    GameFailurePageComponent,
    GameCreationPageComponent,
    PlaygroundPageComponent,
    GameOverPageComponent,
    PlayersListComponent,
    PlayerTreenodeComponent,
    HistoryComponent,
    SpacesComponent,
    SpaceDetailsComponent,
    SpaceDetailsModalComponent,
    DiceComponent,
    CarouselComponent,
    PlayerPortfolioComponent,
    SpaceCardComponent,
    WealthIndicatorComponent,
    CarouselItemDirective,
    CarouselItemElementDirective,
    BoardComponent,
    GameControlsComponent,
    WelcomeComponent,
    GameComponent,
    OverviewComponent,
    GameStatusModalComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ClarityModule,
    BrowserAnimationsModule,
    FlexLayoutModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatInputModule,
    MatCardModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatDividerModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MaterialFileInputModule,
    MatTooltipModule,
    ResponsiveModule.forRoot(),
    MatSidenavModule
  ],
  providers: [],
  bootstrap: [AppComponent],
  entryComponents: [
    ModalExampleComponent,
    ChooseSessionDialogComponent,
    SpaceDetailsModalComponent,
    GameStatusComponent
  ]
})
export class AppModule {

  constructor(
    private turnService: TurnService // to be sure the service is instantiated
    ) {}
 }
