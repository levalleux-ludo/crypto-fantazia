import { Component, OnInit } from '@angular/core';
import { GameService } from 'src/app/_services/game.service';
import { TezosService } from 'src/app/_services/tezos.service';

@Component({
  selector: 'app-players-list',
  templateUrl: './players-list.component.html',
  styleUrls: ['./players-list.component.scss']
})
export class PlayersListComponent implements OnInit {

  otherPlayers = [];

  constructor(
    public gameService: GameService,
    public tezosService: TezosService
  ) { }

  ngOnInit(): void {
    this.otherPlayers = this.gameService.players.filter(player => player !== this.tezosService.account.account_id);
  }

}
