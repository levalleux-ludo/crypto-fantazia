import { Component, OnInit } from '@angular/core';
import { GameService } from 'src/app/_services/game.service';
import { GameControllerService } from 'src/app/_services/game-controller.service';

@Component({
  selector: 'app-playground-page',
  templateUrl: './playground-page.component.html',
  styleUrls: ['./playground-page.component.scss']
})
export class PlaygroundPageComponent implements OnInit {

  constructor(
    public gameService: GameService,
    public gameController: GameControllerService
  ) { }

  ngOnInit(): void {
  }

}
