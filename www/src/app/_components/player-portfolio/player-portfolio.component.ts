import { Component, OnInit, Input, AfterViewInit } from '@angular/core';
import { GameService } from 'src/app/_services/game.service';

@Component({
  selector: 'app-player-portfolio',
  templateUrl: './player-portfolio.component.html',
  styleUrls: ['./player-portfolio.component.scss']
})
export class PlayerPortfolioComponent implements OnInit, AfterViewInit {

  @Input()
  player: string;

  portfolio = [];
  get totalValue(): number {
    let total = 0;
    for (const asset of this.portfolio) {
      total += asset.price;
    }
    return total;
  }

  constructor(
    private gameService: GameService
  ) { }

  ngOnInit(): void {
    this.gameService.onAssetsChange.subscribe(({player, portfolio}) => {
      if (player === this.player) {
        this.portfolio = portfolio;
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.gameService.playersAssets.has(this.player)) {
      this.portfolio = this.gameService.playersAssets.get(this.player);
    }
  }

  getCategoryIcon(category: string) {
    switch (category) {
      case 'MINING_FARM': {
        return 'cluster';
        break;
      }
      case 'BAKERY': {
        return 'factory';
        break;
      }
      case 'BIO_TECH': {
        return 'tree';
        break;
      }
      case 'FIN_TECH': {
        return 'bank';
        break;
      }
      case 'LAW_TECH': {
        return 'balance';
        break;
      }
      case 'EDUCATION': {
        return 'library';
        break;
      }
      case 'HW_WALLET': {
        return 'key';
        break;
      }
      case 'GAME': {
        return 'wand';
        break;
      }
      case 'SOCIAL': {
        return 'share';
        break;
      }
      case 'MARKETPLACE': {
        return 'shopping-cart';
        break;
      }
      case 'EXCHANGE': {
        return 'piggy-bank';
        break;
      }
    }
  }

}
