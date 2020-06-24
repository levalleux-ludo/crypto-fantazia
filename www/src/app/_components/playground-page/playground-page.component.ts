import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { GameService } from 'src/app/_services/game.service';
import { GameControllerService } from 'src/app/_services/game-controller.service';
import { ClrAccordion } from '@clr/angular';
import { MediaMatcher } from '@angular/cdk/layout';
import { ConnectionService } from 'src/app/_services/connection.service';
import { ModalService } from 'src/app/_services/modal.service';
import { GameStatusModalComponent } from '../game-status-modal/game-status-modal.component';

@Component({
  selector: 'app-playground-page',
  templateUrl: './playground-page.component.html',
  styleUrls: ['./playground-page.component.scss']
})
export class PlaygroundPageComponent implements OnInit {

  mobileQuery: MediaQueryList;
  private _mobileQueryListener: () => void;

  gameStatusVisible = false;

  constructor(
    public gameService: GameService,
    public gameController: GameControllerService,
    private changeDetectorRef: ChangeDetectorRef,
    public connectionService: ConnectionService,
    private media: MediaMatcher,
    private modalService: ModalService

  ) {
    this.mobileQuery = media.matchMedia('(max-width: 600px)');
    this._mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this._mobileQueryListener);
   }

  ngOnInit(): void {
  }

  showGameStatus() {
    this.modalService.showModal(GameStatusModalComponent);
  }

}
