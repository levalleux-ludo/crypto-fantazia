import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-player-portfolio',
  templateUrl: './player-portfolio.component.html',
  styleUrls: ['./player-portfolio.component.scss']
})
export class PlayerPortfolioComponent implements OnInit {

  @Input()
  portfolio = [];

  constructor() { }

  ngOnInit(): void {
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
