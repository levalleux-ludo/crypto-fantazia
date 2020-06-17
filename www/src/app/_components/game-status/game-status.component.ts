import { Component, OnInit } from '@angular/core';
import { GameService } from 'src/app/_services/game.service';
import { GameControllerService } from 'src/app/_services/game-controller.service';

@Component({
  selector: 'app-game-status',
  templateUrl: './game-status.component.html',
  styleUrls: ['./game-status.component.scss']
})
export class GameStatusComponent implements OnInit {

  constructor(
    public gameService: GameService,
    public gameController: GameControllerService
  ) { }

  ngOnInit(): void {
  }

}
