import { Component, OnInit, AfterViewInit, ViewChild, NgZone, ChangeDetectorRef } from '@angular/core';
import { GameService } from 'src/app/_services/game.service';
import { GameControllerService } from 'src/app/_services/game-controller.service';
import { CarouselComponent } from '../carousel/carousel.component';
import { DiceComponent } from '../dice/dice.component';
import { ConnectionService } from 'src/app/_services/connection.service';
import { MediaMatcher } from '@angular/cdk/layout';
import { SpacesService } from 'src/app/_services/spaces.service';
import { CardService } from 'src/app/_services/card.service';
import { TezosService } from 'src/app/_services/tezos.service';

@Component({
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss']
})
export class BoardComponent implements OnInit, AfterViewInit {

  @ViewChild('carousel', {static: false})
  carousel: CarouselComponent;

  // @ViewChild('dicePOW', {static: false})
  // dicePOW: DiceComponent;
  // @ViewChild('dicePOS', {static: false})
  // dicePOS: DiceComponent;
  dicePOWValue;
  dicePOSValue;

  items = [
    { title: 'Slide 1' },
    { title: 'Slide 2' },
    { title: 'Slide 3' },
  ];

  playerBlock = 1;
  targetPOS = 1;
  targetPOW = 1;

  slidesStore = [];

  imagesDicePOW = [
    'assets/dices/dice_1_1.png',
    'assets/dices/dice_1_2.png',
    'assets/dices/dice_1_3.png',
    'assets/dices/dice_1_4.png',
    'assets/dices/dice_1_5.png',
    'assets/dices/dice_1_6.png',
  ];
  imagesDicePOS = [
    'assets/dices/dice_2_1.png',
    'assets/dices/dice_2_2.png',
    'assets/dices/dice_2_3.png',
    'assets/dices/dice_2_4.png',
    'assets/dices/dice_2_5.png',
    'assets/dices/dice_2_6.png',
  ];

  rolling = false;
  progress = 0;
  showSpace = -1;
  currentAlicePosition = 0;
  showOptions = [];
  showCardId = -1;
  selectedOption;

  spacesMap = new Map();
  chances = new Map();
  community_chests = new Map();

  mobileQuery: MediaQueryList;
  private _mobileQueryListener: () => void;

  diceAnimated = false;

  public get carouselSizeParams() {
    return {
      containerWidth: 300,
      containerHeight: 340,
      itemWidth: 200-24,
      imageWidth: '200px'
    }
  }

  constructor(
    public gameService: GameService,
    public gameController: GameControllerService,
    private ngZone: NgZone,
    private changeDetectorRef: ChangeDetectorRef,
    public connectionService: ConnectionService,
    private media: MediaMatcher,
    public spacesService: SpacesService,
    public cardService: CardService,
    private tezosService: TezosService

  ) {
    this.mobileQuery = media.matchMedia('(max-width: 600px)');
    this._mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this._mobileQueryListener);
   }

  ngOnInit(): void {
    this.cardService.getChances().then((cards) => {
      this.chances = new Map();
      for (const card of cards) {
        this.chances.set(card.cardId, this.cardService.computeText(card));
      }
    });
    this.cardService.getCommunityChests().then((cards) => {
      this.community_chests = new Map();
      for (const card of cards) {
        this.community_chests.set(card.cardId, this.cardService.computeText(card));
      }
    });
    this.spacesService.getSpaces().then((spaces) => {
      this.spacesMap = new Map();
      for (const space of spaces) {
        this.spacesMap.set(space.spaceId, space);
      }
      this.slidesStore = spaces.map(space => {
        return {
          id: space.spaceId,
          src: `assets/blocks/block_${space.image}`,
          alt: space.title,
          title: space.title,
          players: []
        };
      });
      const myPosition = this.gameService.playersPosition.get(this.tezosService.account.account_id);
      for (const player of this.gameService.players) {
        this.updateAvatarPosition(player, undefined, this.gameService.playersPosition.get(player));
      }
      this.showSpace = (myPosition !== undefined) ? myPosition : -1;
      if (this.spacesMap.has(myPosition)) {
        setTimeout(() => {
          this.carousel.setCurrentPosition(myPosition);
        }, 500);
      }
      this.changeDetectorRef.detectChanges();
    });
  }

  updateAvatarPosition(player: string, oldPosition: number, newPosition: number) {
    if ((oldPosition !== undefined) && (oldPosition < this.slidesStore.length)) {
      this.slidesStore[oldPosition].players = this.slidesStore[oldPosition].players.filter(
        aPlayer => aPlayer.address !== player
      );
    }
    if ((newPosition !== undefined) && (newPosition < this.slidesStore.length)) {
      this.slidesStore[newPosition].players.push(
        {address: player, image: `assets/avatars/${this.gameService.getAvatar(player)}.png` , name: this.gameService.getUsername(player)}
      );
    }
  }

  ngAfterViewInit(): void {
    this.dicePOWValue = Math.floor(1 + 6 * Math.random());
    this.dicePOSValue = Math.floor(1 + 6 * Math.random());
    const myPosition = this.gameService.playersPosition.get(this.tezosService.account.account_id);
    this.updateAvatarPosition(this.tezosService.account.account_id, undefined, myPosition);
    this.showSpace = (myPosition !== undefined) ? myPosition : -1;
    if (this.spacesMap.has(myPosition)) {
      setTimeout(() => {
        this.carousel.setCurrentPosition(myPosition);
      }, 500);
    }
    this.gameService.onPlayerMove.subscribe(({player, newPosition, oldPosition}) => {
      if ((player === this.tezosService.account.account_id) && !this.diceAnimated) {
        this.showSpace = newPosition;
      }
      this.updateAvatarPosition(player, oldPosition, newPosition);
    });
    if (this.gameService.iAmPlaying() && this.gameService.lastTurn.has(this.tezosService.account.account_id)) {
      this.showOptions = this.gameService.lastTurn.get(this.tezosService.account.account_id).options;
      if (this.showOptions.length === 1) {
        this.selectedOption = this.showOptions[0];
      } else {
        this.selectedOption = undefined;
      }
      this.showCardId = this.gameService.lastTurn.get(this.tezosService.account.account_id).cardId;
      this.dicePOWValue = this.gameService.lastTurn.get(this.tezosService.account.account_id).dices[0];
      this.dicePOSValue = this.gameService.lastTurn.get(this.tezosService.account.account_id).dices[1];
    }

  }


  goto(position: number) {
    this.carousel.goto(position);
  }

  onCarouselStep(event: any) {
    console.log(`onCarouselStep(${event})`);
    const prevBlock = (event > 0) ? event - 1 : this.slidesStore.length - 1;

  }
  rollDices() {
    this.gameController.rollTheDices().then((rollResult) => {
      const targetPOW = rollResult.payload.dice1;
      const targetPOS = rollResult.payload.dice2;
      this.diceAnimated = true;
      this.animateDices(targetPOW, targetPOS).then(() => {
        this.carousel.goto(rollResult.payload.newPosition, (newPosition) => {
          this.showSpace = newPosition;
          this.diceAnimated = false;
          this.showOptions = rollResult.payload.options;
          if (this.showOptions.length === 1) {
            this.selectedOption = this.showOptions[0];
          } else {
            this.selectedOption = undefined;
          }
          this.showCardId = rollResult.payload.cardId;
        });
      });
    });
  }

  async animateDices(targetPOW: number, targetPOS: number) {
    return new Promise((resolve, reject) => {
      let countdown = 10;
      this.progress = 10 - countdown;
      this.rolling = true;
      this.showSpace = -1;
      const interval = setInterval(() => {
        let dicePOW;
        let dicePOS;
        if (--countdown <= 0) {
          clearInterval(interval);
          // this.rolling = false; // no need to set rolling to false because the progress bat fades out by itself
          dicePOW = targetPOW;
          dicePOS = targetPOS;
          resolve();
        } else {
          dicePOW = Math.floor(1 + 6 * Math.random());
          dicePOS = Math.floor(1 + 6 * Math.random());
        }
        this.ngZone.run(() => {
            this.progress = 10 - countdown;
            this.dicePOWValue = dicePOW;
            this.dicePOSValue = dicePOS;
        });
      }, 250);
    });
  }

  play() {
    this.gameController.play(this.selectedOption);
  }

}

