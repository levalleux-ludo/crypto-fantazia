import { Injectable } from '@angular/core';
import { GameService } from './game.service';
import { AlertService } from './alert.service';
import { TezosService } from './tezos.service';
import { ModalService } from './modal.service';
import { SpaceDetailsModalComponent } from '../_components/space-details-modal/space-details-modal.component';
import { SpacesService, eSpaceType } from './spaces.service';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class TurnService {
  spaces = [];
  chances = [];
  community_chests = [];

  constructor(
    private gameService: GameService,
    private tezosService: TezosService,
    private modalService: ModalService,
    private alertService: AlertService,
    private spaceService: SpacesService,
    private apiService: ApiService
  ) {

    this.spaceService.getSpaces().then((spaces) => {
      this.spaces = spaces.sort((a, b) => a.spaceId - b.spaceId);
    });

    this.apiService.get<any[]>('card/chance').subscribe((cards: any[]) => {
      this.chances = cards.sort((a, b) => a.cardId - b.cardId);
    }, err => alertService.error(err));

    this.apiService.get<any[]>('card/cc').subscribe((cards: any[]) => {
      this.community_chests = cards.sort((a, b) => a.cardId - b.cardId);
    }, err => alertService.error(err));

    this.gameService.onPlayerMove.subscribe(({player, newPosition, oldPosition}) => {
      if (player === tezosService.account.account_id) {
        const space = this.spaces[newPosition];
        switch (space.type) {
          case eSpaceType.COMMUNITY:
          case eSpaceType.CHANCE: {
            // TODO: get the cardId from the rollDices request and get the Chance/Community card
            // Then, display the card with 'Apply' button.
            // modalService.showModal(CardDetailsModalComponent, {card}).then(() => {
            // });
            // On apply call Game smart contract that will call Card contract and complete the turn
            break;
          }
          case eSpaceType.GENESIS: {
            // display the card details with 'Apply' button.
            // modalService.showModal(SpaceDetailsModalComponent, {space}).then(() => {
            // });
            // On apply, call Game smart contract, that will mint money for the player and complete the turn
            break;
          }
          case eSpaceType.COVID: {
            // display the card details with 'Apply' button.
            // Check if the player owns immunity passport. If yes, do nothing
        // modalService.showModal(SpaceDetailsModalComponent, {space}).then(() => {
        // });
            // On apply, call Game smart contract, that will move the player into quarantine and complete the turn
            break;
          }
          case eSpaceType.QUARANTINE: {
            // display the card details with 'Apply' button.
        // modalService.showModal(SpaceDetailsModalComponent, {space}).then(() => {
        // });
            // On apply, just call Game contract to complete the turn
            break;
          }
          case eSpaceType.BAKERY:
          case eSpaceType.EXCHANGE:
          case eSpaceType.MARKETPLACE:
          case eSpaceType.MINING_FARM:
          case eSpaceType.STARTUP: {
            // display the card details with buttons:
            // - 'Buy' if the assets is available (no owner or on sale on the marketplace) and if the player has enough money.
            // - 'Ignore' if the assets is available (no owner or on sale on the marketplace)
            // - 'Pay Rent' if the assets is owned (refresh the rentRate by looking into asset smart contract storage)
        // modalService.showModal(SpaceDetailsModalComponent, {space}).then(() => {
        // });
            // On option chosen, call Game contract that will  to complete the turn
            break;
          }
        }
      }
    }, err => alertService.error(err));
   }

}
