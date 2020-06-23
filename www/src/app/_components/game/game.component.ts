import { Component, OnInit } from '@angular/core';
import { ConnectionService } from 'src/app/_services/connection.service';
import { GameService } from 'src/app/_services/game.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit {

  constructor(
    public connectionService: ConnectionService,
    public gameService: GameService
  ) { }

  ngOnInit(): void {
  }

}
