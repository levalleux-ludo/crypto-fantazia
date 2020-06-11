import { Component, OnInit } from '@angular/core';
import { GameService } from 'src/app/_services/game.service';

@Component({
  selector: 'app-playground-page',
  templateUrl: './playground-page.component.html',
  styleUrls: ['./playground-page.component.scss']
})
export class PlaygroundPageComponent implements OnInit {

  constructor(
    public gameService: GameService
  ) { }

  ngOnInit(): void {
  }

}
