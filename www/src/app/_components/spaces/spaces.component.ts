import { Component, OnInit } from '@angular/core';
import { SpacesService, ISpace } from 'src/app/_services/spaces.service';
import { GameService } from 'src/app/_services/game.service';
import { ModalService } from 'src/app/_services/modal.service';
import { SpaceDetailsModalComponent } from '../space-details-modal/space-details-modal.component';

@Component({
  selector: 'app-spaces',
  templateUrl: './spaces.component.html',
  styleUrls: ['./spaces.component.scss']
})
export class SpacesComponent implements OnInit {

  spaces = [];
  selectedSpace = undefined;

  constructor(
    public spacesService: SpacesService,
    private gameService: GameService,
    private modalService: ModalService
  ) { }

  ngOnInit(): void {
    this.spacesService.getSpaces().then((spaces) => {
      this.spaces = spaces;
    });
  }

  getPlayersOnSpace(spaceId): string[] {
    return this.gameService.players.filter(player => (this.gameService.getPlayerPosition(player) === spaceId));
  }

  getDetails(space: ISpace) {
    console.log(`click on row -> show details for space ${space.spaceId}`);
    if (this.selectedSpace === space) {
      this.selectedSpace = undefined;
      // TODO: if show details window is shown, hide it
      this.modalService.hideModal();
    } else {
      this.selectedSpace = space;
      // TODO: show details window for selectedSpace
      this.modalService.showModal(SpaceDetailsModalComponent, {space}).then(() => {
        // modal closed
      });
    }
  }

}
