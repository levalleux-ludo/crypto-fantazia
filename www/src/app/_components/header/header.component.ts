import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ConnectionService } from 'src/app/_services/connection.service';
import {MediaMatcher} from '@angular/cdk/layout';
import { TezosService } from 'src/app/_services/tezos.service';
import { GameService } from 'src/app/_services/game.service';
import { ModalService } from 'src/app/_services/modal.service';
import { GameStatusComponent } from '../game-status/game-status.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {

  mobileQuery: MediaQueryList;
  private _mobileQueryListener: () => void;

  constructor(
    public connectionService: ConnectionService,
    private changeDetectorRef: ChangeDetectorRef,
    public tezosService: TezosService,
    public gameService: GameService,
    private media: MediaMatcher,
    private modalService: ModalService
  ) {
    this.mobileQuery = media.matchMedia('(max-width: 600px)');
    this._mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this._mobileQueryListener);
   }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this._mobileQueryListener);
  }

}
