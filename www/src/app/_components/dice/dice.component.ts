import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-dice',
  templateUrl: './dice.component.html',
  styleUrls: ['./dice.component.scss']
})
export class DiceComponent implements OnInit {

  @Input() name = '';
  @Input() imagesList = [];

  @Input() value: number;

  constructor() { }

  ngOnInit(): void {
  }

  // set(num: number) {
  //   this.value = num;
  // }

  getImage() {
    return this.imagesList[this.value - 1];
  }

}
