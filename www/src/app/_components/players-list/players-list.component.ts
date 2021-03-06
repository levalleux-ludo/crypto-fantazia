import { Component, OnInit, AfterViewInit, ViewChild, NgZone, ChangeDetectorRef, AfterViewChecked } from '@angular/core';
import { GameService } from 'src/app/_services/game.service';
import { TezosService } from 'src/app/_services/tezos.service';
import { ClrAccordion, ClrAccordionPanel } from '@clr/angular';

@Component({
  selector: 'app-players-list',
  templateUrl: './players-list.component.html',
  styleUrls: ['./players-list.component.scss']
})
export class PlayersListComponent implements OnInit, AfterViewInit, AfterViewChecked {

  me;
  otherPlayers = new Map();


  players = [
    {name: 'Alice', cash: 24, assets: 26},
    {name: 'Bob', cash: 15, assets: 36},
    {name: 'Charlie', cash: 45, assets: 55}
  ];

  @ViewChild('accordion', {static: false})
  accordion: ClrAccordion;

  @ViewChild('myPanel', {static: false})
  myPanel: ClrAccordionPanel;

  constructor(
    public gameService: GameService,
    public tezosService: TezosService,
    private ngZone: NgZone,
    private changeDetector: ChangeDetectorRef
  ) { }
  ngOnInit(): void {

    this.gameService.players.forEach(player => {
      if (player === this.tezosService.account.account_id) {
        this.me = this.createPlayerDetail(player);
      } else {
        this.otherPlayers.set(player, this.createPlayerDetail(player));
      }
    });
    this.computeBars();

  }

  ngAfterViewInit(): void {
    this.accordion.panels.first.togglePanel();
    this.changeDetector.detectChanges();
    this.gameService.onChange.subscribe(() => {
      this.needRefresh = true;
      // this.changeDetector.detach();

      // this.ngZone.runTask(() => {
        // this.changeDetector.reattach();
    // });
    });
    this.gameService.onAssetsChange.subscribe(() => {
      this.changeDetector.detectChanges();
    });
  }

  needRefresh = false;
  ngAfterViewChecked(): void {
    if (this.needRefresh) {
      this.gameService.players.forEach(player => {
        if (player === this.tezosService.account.account_id) {
          this.updatePlayerDetail(player, this.me);

        } else {
          if (this.otherPlayers.has(player)) {
            this.updatePlayerDetail(player, this.otherPlayers.get(player));
          }
        }
        this.computeBars();
      });
      // this.changeDetector.markForCheck();
      // this.changeDetector.reattach();
      // this.changeDetector.detectChanges();
    }
    this.needRefresh = false;
  }


  createPlayerDetail(player: string) {
    return {
      address: player,
      name: this.gameService.getUsername(player),
      cash: this.gameService.balanceOf(player),
      assets: this.getTotalAssetValue(player),
      position: this.gameService.playersPosition.has(player) ? this.gameService.playersPosition.get(player) : -1
    };
  }

  getTotalAssetValue(player: string) {
    let total = 0;
    if (this.gameService.playersAssets.has(player)) {
      for (const asset of this.gameService.playersAssets.get(player)) {
        total += asset.price;
      }
    }
    return total;
  }

  updatePlayerDetail(player: string, detail: any) {
    detail.name = this.gameService.getUsername(player);
    detail.cash = this.gameService.balanceOf(player);
    detail.assets = this.getTotalAssetValue(player);
    detail.position = this.gameService.playersPosition.has(player) ? this.gameService.playersPosition.get(player) : -1;
  }
  bars = new Map();
  computeBars() {
    let maxWealth = Math.max(3000, this.me.cash + this.me.assets);
    for (const player of this.otherPlayers.values()) {
      maxWealth = Math.max(maxWealth, player.cash + player.assets);
    }
    this.bars.set(this.me.address, [
      {
        label: 'CASH',
        value: this.me.cash,
        style: {'color': "black", 'background-color': "white"},
        percentage: maxWealth > 0 ? this.me.cash / maxWealth : 0
      },
      {
        label: 'ASSETS',
        value: this.me.assets,
        style: {'color': "yellow", 'background-color': "gray"},
        percentage: maxWealth > 0 ? this.me.assets / maxWealth : 0
      }
    ]);
    for (const player of this.otherPlayers.values()) {
      this.bars.set(player.address, [
        {
          label: 'CASH',
          value: player.cash,
          style: {'color': "black", 'background-color': "white"},
          percentage: maxWealth > 0 ? player.cash / maxWealth : 0
        },
        {
          label: 'ASSETS',
          value: player.assets,
          style: {'color': "yellow", 'background-color': "gray"},
          percentage: maxWealth > 0 ? player.assets / maxWealth : 0
        }
      ]);
    }
  }

  getPortfolio = (person: string) => {
    const portfolio = this.gameService.playersAssets.get(person);
    if (!portfolio) {
      return [];
    }
    return portfolio.map((asset) => {
      return {
        nbFeatures: 0,
        ...asset
      };
    });
  }

}
