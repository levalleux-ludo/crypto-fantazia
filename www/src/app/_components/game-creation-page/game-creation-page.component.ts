import { Component, OnInit } from '@angular/core';
import { GameService } from 'src/app/_services/game.service';

@Component({
  selector: 'app-game-creation-page',
  templateUrl: './game-creation-page.component.html',
  styleUrls: ['./game-creation-page.component.scss']
})
export class GameCreationPageComponent implements OnInit {

  constructor(
    public gameService: GameService
  ) { }

  ngOnInit(): void {
  }

}
