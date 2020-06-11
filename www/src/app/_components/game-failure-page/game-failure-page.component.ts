import { Component, OnInit } from '@angular/core';
import { GameService } from 'src/app/_services/game.service';

@Component({
  selector: 'app-game-failure-page',
  templateUrl: './game-failure-page.component.html',
  styleUrls: ['./game-failure-page.component.scss']
})
export class GameFailurePageComponent implements OnInit {

  constructor(
    public gameService: GameService
  ) { }

  ngOnInit(): void {
  }

}
