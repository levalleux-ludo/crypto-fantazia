import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-fanta-symbol',
  templateUrl: './fanta-symbol.component.html',
  styleUrls: ['./fanta-symbol.component.scss']
})
export class FantaSymbolComponent implements OnInit {

  @Input()
  htmlString: string;

  constructor() { }

  ngOnInit(): void {
  }

}
