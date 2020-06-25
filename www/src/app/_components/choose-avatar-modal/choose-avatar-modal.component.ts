import { Component, OnInit } from '@angular/core';
import { ModalService } from 'src/app/_services/modal.service';
import { GameService } from 'src/app/_services/game.service';
import { ConnectionService } from 'src/app/_services/connection.service';

@Component({
  selector: 'app-choose-avatar-modal',
  templateUrl: './choose-avatar-modal.component.html',
  styleUrls: ['./choose-avatar-modal.component.scss']
})
export class ChooseAvatarModalComponent implements OnInit {

  selectedAvatar: string;

  constructor(
    public modalService: ModalService,
    private connectionService: ConnectionService
  ) { }

  ngOnInit(): void {
    this.selectedAvatar = this.connectionService.avatar;
  }

}
