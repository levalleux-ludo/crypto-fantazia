import { Component, OnInit, Input, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';

@Component({
  selector: 'app-wealth-indicator',
  templateUrl: './wealth-indicator.component.html',
  styleUrls: ['./wealth-indicator.component.scss']
})
export class WealthIndicatorComponent implements OnInit, AfterViewChecked {

  templateColumns = '';

  _bars = [];
  @Input()
  set bars(bars: any[]) {
    this._bars = bars;
    this.updateWrapper();
  }

  constructor() { }
  ngAfterViewChecked(): void {
    this.updateWrapper();
  }

  ngOnInit(): void {
    // tslint:disable-next-line: no-unused-expression
  }

  updateWrapper() {
    let templateColumns = '';
    for (const bar of this._bars) {
      templateColumns += `${bar.percentage * 100}% `;
    }
    this.templateColumns = templateColumns;
  }

}
