import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-space-card',
  templateUrl: './space-card.component.html',
  styleUrls: ['./space-card.component.scss']
})
export class SpaceCardComponent implements OnInit {

  @Input() width = 100;
  @Input() space = undefined;

  detail = "Every player can use the marketplace to sell/buy their assets (companies).\nThe marketplace's owner earns 10% of the price of each assets sold.";

  constructor() { }

  ngOnInit(): void {
  }

}
