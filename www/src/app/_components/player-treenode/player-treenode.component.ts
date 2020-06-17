import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-player-treenode',
  templateUrl: './player-treenode.component.html',
  styleUrls: ['./player-treenode.component.scss']
})
export class PlayerTreenodeComponent implements OnInit {

  @Input()
  assets = [];

  @Input()
  balance: string;

  @Input()
  position: number;

  @Input()
  name: string;

  @Input()
  expanded: boolean;

  constructor() { }

  ngOnInit(): void {
  }

}
