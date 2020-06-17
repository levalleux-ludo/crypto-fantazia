import { Component, OnInit, Input } from '@angular/core';
import { ISpace } from 'src/app/_services/spaces.service';

@Component({
  selector: 'app-space-details',
  templateUrl: './space-details.component.html',
  styleUrls: ['./space-details.component.scss']
})
export class SpaceDetailsComponent implements OnInit {

  @Input()
  space: ISpace;

  constructor() { }

  ngOnInit(): void {
  }

}
