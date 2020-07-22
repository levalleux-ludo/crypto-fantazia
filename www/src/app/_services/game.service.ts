import { Injectable, EventEmitter, NgZone } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, interval, Subject } from 'rxjs';
import { GameContract } from '../../../../tezos/src/game.contract';
import { TokenContract } from '../../../../tezos/src/token.contract';
import { Game as IGame } from '../../../../common/model/game';
import { ConnectionService } from './connection.service';
import { AbstractContract } from '../../../../tezos/src/abstract.contract';
import { AlertService } from './alert.service';
import { TezosService } from './tezos.service';
import { WaiterService } from './waiter.service';
import { KeyStore } from '../../../../tezos/node_modules/conseiljs/dist';
import { fadeSlide } from '@clr/angular';
import { tokenService } from '../../../../tezos/src/token.service';
import { UserService } from './user.service';
import { AssetsContract } from '../../../../tezos/src/assets.contract';
import { SpacesService, ISpace } from './spaces.service';
import { posix } from 'path';

export enum eGameCreationStatus {
  NONE = 'NONE',
  IN_CREATION = 'IN_CREATION',
  READY = 'READY',
  PLAYING = 'PLAYING',
  FAILED = 'FAILED',
  ENDED = 'ENDED'
}

export enum eContractType {
  GAME = 'GAME',
  TOKEN = 'TOKEN',
  ASSETS = 'ASSETS'
}

@Injectable({
  providedIn: 'root'
})
export class GameService {

  creationStatus = eGameCreationStatus.NONE;
  playingStatus = '';
  isConnected = false;
  isRegistered = false;
  isRegistering = false;
  _players = [];
  apiRefreshPeriod = 5000;
  nextPlayer = undefined;
  gameCreator = undefined;
  alert: {alertId: number, onClose$: Subject<any>} | undefined;
  balances = new Map<string, number> ();
  waiterTask: string;
  _turns = [];
  currentPlayer: string | undefined;
  currentTurn: number = -1;
  playersPosition = new Map<string, number>();
  playersAssets = new Map<string, ISpace[]>();
  lastTurn = new Map<string, any>();
  usernames = new Map();
  avatars = new Map();
  updated = false;

  _game = undefined;

  contracts: {
    game: GameContract | undefined,
    token: TokenContract | undefined,
    assets: AssetsContract | undefined
  } = {
    game: undefined,
    token: undefined,
    assets: undefined
  };

  onChange: EventEmitter<string> = new EventEmitter();

  onPlayerMove: EventEmitter<{player: string, newPosition: number, oldPosition: number}> = new EventEmitter();

  onAssetsChange: EventEmitter<{player: string, portfolio: ISpace[]}> = new EventEmitter();

  constructor(
    private apiService: ApiService,
    private connectionService: ConnectionService,
    private alertService: AlertService,
    private tezosService: TezosService,
    private waiterService: WaiterService,
    private spaceService: SpacesService,
    private ngZone: NgZone,
    private userService: UserService
  ) {
    connectionService.waitConnected$().subscribe(() => {
      if (!connectionService.isConnected && this.isConnected) {
        this.disconnect();
      }
    }, err => console.error(JSON.stringify(err)));

    setInterval(() => {
      if (this._game) {
        this.apiService.get<IGame>(`game/${this._game.sessionId}`).subscribe(async (game) => {
          await this.updateStatus(game);
        }, err => {
          console.error(JSON.stringify(err));
          this.creationStatus = eGameCreationStatus.FAILED;
          this.disconnect();
        });
      }
    }, this.apiRefreshPeriod);
  }

  get players() {
    return this._players;
  }

  getUsername(player): string {
    return this.usernames.get(player);
  }

  getAvatar(player): string {
    return this.avatars.get(player);
  }

  get game(): IGame {
    return this._game;
  }

  get myBalance(): number {
    return this.balanceOf(this.tezosService.account.account_id);
  }

  balanceOf(player: string): number {
    return this.balances.get(player) || 0;
  }

  get isGameMaster(): boolean {
    return (this._game
      && this.contracts.game
      && (this.gameCreator === this.tezosService.account.account_id)
    );
  }

  // async setContract(): Promise<void> {
  //   const contract = await GameContract.retrieve(this._game.contractAddresses.game);
  //   if (this.contract && this.contract.isWatching) {
  //     this.contract.stopWatching();
  //   }
  //   this.contract = contract;
  //   this.contract.startWatching(2000);
  // }

  private async getContract<T>(contractType: eContractType): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this._game && contractType === eContractType.GAME && this._game.contractAddresses.game) {
        GameContract.retrieve(this._game.contractAddresses.game).then((contract) => {
          resolve(contract as unknown as T);
        }).catch(err => reject(err));
      } else if (this._game && contractType === eContractType.TOKEN && this._game.contractAddresses.token) {
        TokenContract.retrieve(this._game.contractAddresses.token).then((contract) => {
          resolve(contract as unknown as T);
        }).catch(err => reject(err));
      } else if (this._game && contractType === eContractType.ASSETS && this._game.contractAddresses.assets) {
        AssetsContract.retrieve(this._game.contractAddresses.assets).then((contract) => {
          resolve(contract as unknown as T);
        }).catch(err => reject(err));
      } else {
        reject();
      }
    });
  }

  public async createSession(): Promise<any> {
    this.disconnect();
    return new Promise((resolve, reject) => {
      const creator = this.tezosService.account.account_id;
      this.apiService.post<IGame>('game/create', { creator }).subscribe(async (game) => {
        // event the creator will call connectSession
        // this.connectGameEvents(game.sessionId);
        // await this.updateStatus(game);
        resolve(game);
      }, async (err) => {
        await this.updateStatus(undefined);
        reject(err);
      });
    });
  }

  private connectGameEvents(sessionId: string) {
    this.apiService.connectSSE(`events/${sessionId}`).subscribe((event) => {
      console.log('on receive evnt from SSE channel:', event);
      switch (event.type) {
        case 'TURN_STARTED': {
          this._turns.push({id: event.id, ...event.data});
          this.currentTurn = Math.max(event.id, this.currentTurn);
          if (this.currentTurn === event.id) {
            this.lastTurn.set(event.data.player, event.data);
            const oldPosition = this.playersPosition.get(event.data.player);
            if (oldPosition !== event.data.newPosition) {
              this.currentPlayer = event.data.player;
              this.playersPosition.set(event.data.player, event.data.newPosition);
              this.onPlayerMove.emit({
                player: event.data.player,
                newPosition: event.data.newPosition,
                oldPosition: oldPosition
              });
            }
          }
          break;
        }
        case 'TURN_COMPLETED': {
          if (this.currentPlayer === event.data.player) {
            this.currentPlayer = undefined;
          }
          break;
        }
        case 'GAME_CREATION': {
          this.showAlert(event.data as string);
          break;
        }
        case 'FATAL_ERROR': {
          this.alertError(event.data as string);
          break;
        }
      }
    }, err => {
      // this.alertService.error(JSON.stringify(err));
    });
  }

  public async connectSession(sessionId: string): Promise<any> {
    this.disconnect();
    return new Promise((resolve, reject) => {
      this.apiService.get<IGame>(`game/${sessionId}`).subscribe(async (game) => {
        this.connectGameEvents(sessionId);
        await this.updateStatus(game);
        resolve(game);
      }, async (err) => {
        await this.updateStatus(undefined);
        reject(err);
      });
    });
  }

  private registerWhenPossible() {
    // if game contract is created, then register current player
    if (this.contracts.game) {
      this.isRegistering = true;
      this.contracts.game.isRegistered(this.tezosService.account.account_id).then((isRegistered) => {
        if (isRegistered) {
          this.isRegistering = false;
          this.isRegistered = true;
        } else {
          this.showAlert('Game Contract has been created. Now registering current player ...');
          this.contracts.game.register(this.tezosService.keyStore).then((txOper) => {
            this.showAlert('returns from register call:' + txOper.txHash);
            txOper.onConfirmed.then((blockId) => {
                console.log('Tx confirmed', txOper.txHash, blockId);
            }).catch(err => this.alertError('register tx failed:' + err))
          }).catch(err => this.alertError('Error during register call:' + err));
        }
      }).catch(err => this.alertError(JSON.stringify(err)));
    }
  }

  private async updateStatus(game: IGame) {
    if (game) {
      this.updated = (this._game === undefined);
      this._game = game;
      this.isConnected = true;
      if (this._game.status === 'in_creation') {
        // get creation progress status
        this.creationStatus = eGameCreationStatus.IN_CREATION;
      } else {
        await this.checkContracts();
      }
      await this.updateFromGameContract();
      await this.updateFromTokenContract();
      await this.updateFromAssetsContract();
      // await this.updatePlayers();
      if (!this.isRegistering && !this.isRegistered) {
        this.registerWhenPossible();
      }
      if (this.updated) {
        this.onChange.emit();
      }
    } else {
      this.disconnect();
    }
  }

  private async updateFromTokenContract() {
    if (this.contracts.token) {
      await this.contracts.token.update();
      await this.contracts.token.getBalances(this.players).then(balances => {
        if (!this.compareMaps(balances, this.balances)) {
          this.balances = balances;
          this.updated = true;
        }
      });
    }
  }

  private async updateFromAssetsContract() {
    if (this.contracts.assets) {
      await this.contracts.assets.update();
      const spaces = await this.spaceService.getSpaces();
      for (const player of this.players) {
        const portfolio = this.contracts.assets.getPortfolio(player);
        const oldPortfolio = this.playersAssets.get(player);
        let newPortfolio = []
        if (portfolio && portfolio.length > 0) {
          newPortfolio = portfolio.map((assetId) => spaces[assetId]);
        }
        if ( !this.compareArray(oldPortfolio, newPortfolio) ) {
          this.playersAssets.set(player, newPortfolio);
          this.onAssetsChange.emit({ player, portfolio: newPortfolio } );
          this.updated = true;
        }
      }
    }
  }

  private compareArray(set1: any[], set2: any[]): boolean {
    if (set1 && !set2 ) {
      return false;
    }
    if (set2 && !set1) {
      return false;
    }
    if (set1.length !== set2.length) {
      return false;
    }
    for (const item1 of set1) {
      if (!set2.includes(item1)) {
        return false;
      }
    }
    return true;
  }

  private compareMaps<T, U>(maps1: Map<T, U>, maps2: Map<T, U>): boolean {
    if (maps1.size !== maps2.size) {
      return false;
    }
    for (const key of maps1.keys()) {
      if (!maps2.has(key)) {
        return false;
      }
      if (maps2.get(key) !== maps1.get(key)) {
        return false;
      }
    }
    return true;
  }

  public async updateFromGameContract() {
    if (this.contracts.game) {
      await this.contracts.game.update();
      const storage = this.contracts.game._storage;
      this._players = storage.playersSet;
      if (this._players.includes(this.tezosService.account.account_id)) {
        this.isRegistered = true;
      }
      // set the player initial position if needed
      for (const player of this._players) {
        if (!this.playersPosition.has(player)) {
          this.updated = true;
          this.playersPosition.set(player, 0);
        }
        const posInContract = storage.playerPositions.get(player).toNumber();
        if (posInContract !== undefined) {
          if ((this.currentPlayer === this.tezosService.account.account_id)
             && this.lastTurn.has(this.currentPlayer)
             && (posInContract === this.lastTurn.get(this.currentPlayer).newPosition)) {
              // cancel the current play, since the contract is already updated
              // this.currentPlayer = undefined;
          }
          if (posInContract !== this.playersPosition.get(player)) {
            this.updated = true;
            const oldPosition = this.playersPosition.get(player);
            this.playersPosition.set(player, posInContract);
            this.onPlayerMove.emit({player, newPosition: posInContract, oldPosition});
          }
        }
        if (!this.usernames.has(player)) {
          await this.userService.getUser(player).then((user) => {
            this.updated = true;
            this.usernames.set(player, user.userName);
            this.avatars.set(player, user.avatar);
          });
        }
      }
      this.playingStatus = storage.status;
      switch (storage.status) {
        case 'created': {
          if ((this.creationStatus !== eGameCreationStatus.READY) && this.waiterTask) {
            this.waiterService.removeTask(this.waiterTask);
            this.waiterTask = undefined;
          }
          if (this.creationStatus !== eGameCreationStatus.READY) {
            this.creationStatus = eGameCreationStatus.READY;
            this.updated = true;
          }
          break;
        }
        case 'started': {
          if ((this.creationStatus !== eGameCreationStatus.PLAYING) && this.waiterTask) {
            this.waiterService.removeTask(this.waiterTask);
            this.waiterTask = undefined;
          }
          if (this.creationStatus !== eGameCreationStatus.PLAYING) {
            this.creationStatus = eGameCreationStatus.PLAYING;
            this.updated = true;
          }
          break;
        }
        case 'frozen': {
          if (this.creationStatus !== eGameCreationStatus.PLAYING) {
            this.creationStatus = eGameCreationStatus.PLAYING;
            this.updated = true;
          }
          break;
        }
        case 'ended': {
          if (this.creationStatus !== eGameCreationStatus.ENDED) {
            this.creationStatus = eGameCreationStatus.ENDED;
            this.updated = true;
          }
          break;
        }
      }
      if (this.nextPlayer !== storage.nextPlayer) {
        this.nextPlayer = storage.nextPlayer;
        this.updated = true;
      }
      if (this.gameCreator !== storage.creator) {
        this.gameCreator = storage.creator;
        this.updated = true;
      }
    }
  }

  private async checkContracts() {
    const promises = [];
    if (!this.contracts.game) {
      const p = await this.getContract<GameContract>(eContractType.GAME).then((gameContract) => {
        this.updated = true;
        this.contracts.game = gameContract;
        console.log('start watching game contract');
        // this.contracts.game.startWatching(5000, (storage) => {

        // });
      }).catch(err => { /* fail is acceptable meaning that contract is not created yet */ });
      promises.push(p);
    }
    if (!this.contracts.token) {
      const p = await this.getContract<TokenContract>(eContractType.TOKEN).then((tokenContract) => {
        this.updated = true;
        this.contracts.token = tokenContract;
      }).catch(err => { /* fail is acceptable meaning that contract is not created yet */ });
      promises.push(p);
    }
    if (!this.contracts.assets) {
      const p = await this.getContract<AssetsContract>(eContractType.ASSETS).then((assetsContract) => {
        this.updated = true;
        this.contracts.assets = assetsContract;
      }).catch(err => { /* fail is acceptable meaning that contract is not created yet */ });
      promises.push(p);
    }
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }

  public showAlert(message: string) {
    if (this.alert) {
      this.alertService.onClose(this.alert.alertId);
      this.alert = undefined;
    }
    this.alert = this.alertService.show({message});
  }

  public alertError(err: any) {
    if (this.alert) {
      this.alertService.onClose(this.alert.alertId);
      this.alert = undefined;
    }
    console.error(err);
    this.alertService.error(JSON.stringify(err));
  }

  public disconnect() {
    if (this.contracts.game) {
      this.contracts.game.stopWatching();
    }
    this.apiService.disconnectSSE();
    this.isConnected = false;
    this.isRegistered = false;
    this.isRegistering = false;
    this._game = undefined;
    this.playingStatus = '';
    this.creationStatus = eGameCreationStatus.NONE;
    this.contracts = {
      game: undefined,
      token: undefined,
      assets: undefined
    };
    this.balances = new Map();
    this._turns = [];
    this._players = [];
    this.playersPosition = new Map<string, number>();
    this.playersAssets = new Map<string, ISpace[]>();
  }

  public getAllSessions(): Observable<any[]> {
    return this.apiService.get<any[]>(`game`);
  }

  public iAmNextPlayer() {
    return this.nextPlayer && this.nextPlayer === this.tezosService.account.account_id;
  }

  public iAmPlaying() {
    return this.currentPlayer && this.currentPlayer === this.tezosService.account.account_id;
  }

  public getPlayerPosition(player: string): number {
    if (this.playersPosition.has(player)) {
      return this.playersPosition.get(player);
    }
    return -1;
  }

  public get turns() {
    return this._turns;
  }

}
