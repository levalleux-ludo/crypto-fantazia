import { Component, OnInit } from '@angular/core';
import { ModalService } from 'src/app/_services/modal.service';
import { GameService } from 'src/app/_services/game.service';
import { TezosService } from 'src/app/_services/tezos.service';

@Component({
  selector: 'app-choose-session-dialog',
  templateUrl: './choose-session-dialog.component.html',
  styleUrls: ['./choose-session-dialog.component.scss']
})
export class ChooseSessionDialogComponent implements OnInit {

  allSessions: any[] = [
    // {sessionId: "session #1", name: "session #1", status: 'created'},
    // {sessionId: "session #2", name: "session #2", status: 'started'},
    // {sessionId: "session #3", name: "session #3", status: 'created'},
  ];
  selectedSession = undefined;

  my_var = "toto";

  constructor(
    public modalService: ModalService,
    private gameService: GameService,
    private tezosService: TezosService
  ) { }

  ngOnInit(): void {
    this.gameService.getAllSessions().subscribe((games) => {
      this.allSessions = games.map(game => {
        if ((game.status === 'in_creation')
          || (game.status === 'created')
          || ((game.status === 'started') && game.players.includes(this.tezosService.account.account_id))
          ) {
          return {
            sessionId: game.sessionId,
            name: game.sessionId,
            status: game.status,
            creator: game.creator
          };
        }
      }).filter(item => item !== undefined);
      console.log("AllSessions:", this.allSessions);
    });
  }

  connect() {
    this.modalService.hideModal(this.selectedSession);
  }

}
