import { Component, OnInit, AfterViewInit, ViewChild, NgZone } from '@angular/core';
import { GameService } from 'src/app/_services/game.service';
import { GameControllerService } from 'src/app/_services/game-controller.service';
import { CarouselComponent } from '../carousel/carousel.component';
import { DiceComponent } from '../dice/dice.component';

@Component({
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss']
})
export class BoardComponent implements OnInit, AfterViewInit {

  @ViewChild('carousel', {static: false})
  carousel: CarouselComponent;

  @ViewChild('dicePOW', {static: false})
  dicePOW: DiceComponent;
  @ViewChild('dicePOS', {static: false})
  dicePOS: DiceComponent;

  items = [
    { title: 'Slide 1' },
    { title: 'Slide 2' },
    { title: 'Slide 3' },
  ];

  playerBlock = 1;
  targetPOS = 1;
  targetPOW = 1;

  slidesStore = [
    {id: 1, src: 'assets/blocks/block_genesis.png', alt: '1', title: 'block #1', players: [
      {name: 'Alice', image: 'assets/avatars/camel.png'}
    ]},
    {id: 2, src: 'assets/blocks/block_remainersFromTheHashes.png', alt: '2', title: 'block #2', players: []},
    {id: 3, src: 'assets/blocks/block_chance.png', alt: '3', title: 'block #3', players: []},
    {id: 4, src: 'assets/blocks/block_CommunityChest.png', alt: '4', title: 'block #4', players: [
      {name: 'Bob', image: 'assets/avatars/rocket.png'}
    ]},
    {id: 5, src: 'assets/blocks/block_Covid.png', alt: '5', title: 'block #5', players: [
      {name: 'Charlie', image: 'assets/avatars/camel.png'},
      {name: 'Denise', image: 'assets/avatars/rocket.png'},
      {name: 'Edgar', image: 'assets/avatars/diamond.png'}
    ]},
    {id: 6, src: 'assets/blocks/block_Quarantine.png', alt: '6', title: 'block #6', players: []},
    {id: 7, src: 'assets/blocks/block_AntForceOne.png', alt: '7', title: 'block #7', players: [
      {name: 'Romeo', image: 'assets/avatars/camel.png'},
      {name: 'Alpha', image: 'assets/avatars/rocket.png'},
      {name: 'Bravo', image: 'assets/avatars/diamond.png'},
      {name: 'Echo', image: 'assets/avatars/crypto-chip.png'}
    ]},
    {id: 8, src: 'assets/blocks/block_PuddingKing.png', alt: '8', title: 'block #8', players: []}
  ];

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

  constructor(
    public gameService: GameService,
    public gameController: GameControllerService,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.dicePOW.set(Math.floor(1 + 6 * Math.random()));
    this.dicePOS.set(Math.floor(1 + 6 * Math.random()));
    this.showSpace = 0;
  }


  goto(position: number) {
    this.carousel.goto(position);
  }

  onCarouselStep(event: any) {
    console.log(`onCarouselStep(${event})`);
    const prevBlock = (event > 0) ? event - 1 : this.slidesStore.length - 1;
    this.slidesStore[prevBlock].players = this.slidesStore[prevBlock].players.filter(
      player => player.name !== 'Alice'
    );
    this.slidesStore[event].players.push(
      {name: 'Alice', image: 'assets/avatars/camel.png'}
    );
  }
  rollDices() {
    this.gameController.rollTheDices().then((rollResult) => {
      const targetPOW = rollResult.payload.dice1;
      const targetPOS = rollResult.payload.dice2;
      this.animateDices(targetPOW, targetPOS).then(() => {
        this.carousel.goto(rollResult.newPosition, (newPosition) => {
          this.showSpace = newPosition;
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
            this.dicePOW.set(dicePOW);
            this.dicePOS.set(dicePOS);
        });
      }, 250);
    });
  }

  onRollEnd(totalDices: number) {
    this.currentAlicePosition = (this.currentAlicePosition + totalDices) % this.slidesStore.length;
    this.carousel.goto(this.currentAlicePosition, (newPosition) => {
      this.showSpace = newPosition;
    });
    // this.carousel.goto(this.currentAlicePosition);

  }


}

