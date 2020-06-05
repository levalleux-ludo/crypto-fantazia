import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-dock-container',
  templateUrl: './dock-container.component.html',
  styleUrls: ['./dock-container.component.scss']
})
export class DockContainerComponent implements OnInit {

  @Input()
  height = 240;

  constructor() { }

  ngOnInit(): void {
  }

}
