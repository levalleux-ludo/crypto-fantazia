import { Component, OnInit } from '@angular/core';
import { ModalService } from 'src/app/_services/modal.service';
import { ISpace } from 'src/app/_services/spaces.service';

@Component({
  selector: 'app-space-details-modal',
  templateUrl: './space-details-modal.component.html',
  styleUrls: ['./space-details-modal.component.scss']
})
export class SpaceDetailsModalComponent implements OnInit {

  public space: ISpace;

  constructor(
    public modalService: ModalService
  ) { }

  ngOnInit(): void {
  }

}
