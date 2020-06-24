import { Component, OnInit } from '@angular/core';
import { ModalService } from 'src/app/_services/modal.service';

@Component({
  selector: 'app-game-status-modal',
  templateUrl: './game-status-modal.component.html',
  styleUrls: ['./game-status-modal.component.scss']
})
export class GameStatusModalComponent implements OnInit {

  constructor(
    public modalService: ModalService
  ) { }

  ngOnInit(): void {
  }

}
