import { Injectable, EventEmitter, NgZone } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, interval, Subject } from 'rxjs';
import { GameContract } from '../../../../tezos/src/game.contract';
import { TokenContract } from '../../../../tezos/src/token.contract';
import { IGame } from '../../../../api/src/db/game.model';
import { ConnectionService } from './connection.service';
import { AbstractContract } from '../../../../tezos/src/abstract.contract';
import { AlertService } from './alert.service';
import { TezosService } from './tezos.service';
import { WaiterService } from './waiter.service';
import { KeyStore } from '../../../../tezos/node_modules/conseiljs/dist';
import { fadeSlide } from '@clr/angular';

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
  TOKEN = 'TOKEN'
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

  _game = undefined;

  contracts: {
    game: GameContract | undefined,
    token: TokenContract | undefined
  } = {
    game: undefined,
    token: undefined
  };

  onStatusChange: EventEmitter<string> = new EventEmitter();

  constructor(
    private apiService: ApiService,
    private connectionService: ConnectionService,
    private alertService: AlertService,
    private tezosService: TezosService,
    private waiterService: WaiterService,
    private ngZone: NgZone
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

  get game(): IGame {
    return this._game;
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

  async getContract<T>(contractType: eContractType): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this._game && contractType === eContractType.GAME && this._game.contractAddresses.game) {
        GameContract.retrieve(this._game.contractAddresses.game).then((contract) => {
          resolve(contract as unknown as T);
        }).catch(err => reject(err));
      } else if (this._game && contractType === eContractType.TOKEN && this._game.contractAddresses.token) {
        TokenContract.retrieve(this._game.contractAddresses.token).then((contract) => {
          resolve(contract as unknown as T);
        }).catch(err => reject(err));
      } else {
        reject();
      }
    });
  }

  async createSession(): Promise<any> {
    this.disconnect();
    return new Promise((resolve, reject) => {
      const creator = this.tezosService.account.account_id;
      this.apiService.post<IGame>('game/create', { creator }).subscribe(async (game) => {
        await this.updateStatus(game);
        resolve(game);
      }, async (err) => {
        await this.updateStatus(undefined);
        reject(err);
      });
    });
  }

  async connectSession(sessionId: string): Promise<any> {
    this.disconnect();
    return new Promise((resolve, reject) => {
      this.apiService.get<IGame>(`game/${sessionId}`).subscribe(async (game) => {
        await this.updateStatus(game);
        resolve(game);
      }, async (err) => {
        await this.updateStatus(undefined);
        reject(err);
      });
    });
  }

  registerWhenPossible() {
    // if game contract is created, then register current player
    if (this.contracts.game) {
      this.isRegistering = true;
      this.contracts.game.isRegistered(this.tezosService.account.account_id).then((isRegistered) => {
        if (isRegistered) {
          this.isRegistering = false;
          this.isRegistered = true;
        } else {
          this.showAlert('Game Contract has been created. Now registering current player ...');
          this.contracts.game.register(this.tezosService.keyStore, 123456789, 'xxxxxxxx').then(() => {
            this.showAlert('registering completed');
          });
        }
      }).catch(err => this.alertService.error(JSON.stringify(err)));
    }
  }

  async checkPlayingStatus() {
    if (this.contracts.game) {
      await this.contracts.game.getStatus().then((status) => {
        switch (status) {
          case 'created': {
            this.creationStatus = eGameCreationStatus.READY;
            break;
          }
          case 'started': {
            this.creationStatus = eGameCreationStatus.PLAYING;
            break;
          }
          case 'frozen': {
            this.creationStatus = eGameCreationStatus.PLAYING;
            break;
          }
          case 'ended': {
            this.creationStatus = eGameCreationStatus.ENDED;
            break;
          }
        }

      }).catch(err => this.alertService.error(JSON.stringify(err)));
    }
  }

  async updatePlayers() {
    if (this.contracts.game) {
      await this.contracts.game.getPlayers().then((players) => {
        this._players = players;
        if (this.players.includes(this.tezosService.account.account_id)) {
          this.isRegistered = true;
        }
      }).catch(err => this.alertService.error(JSON.stringify(err)));
    }
  }

  async updateStatus(game: IGame) {
    if (game) {
      this._game = game;
      this.isConnected = true;
      if (this._game.status === 'in_creation') {
        // get creation progress status
        this.creationStatus = eGameCreationStatus.IN_CREATION;
      } else if (this._game.status === 'created') {
        await this.checkContracts();
      }
      await this.updateFromGameContract();
      // await this.updatePlayers();
      if (!this.isRegistering && !this.isRegistered) {
        this.registerWhenPossible();
      }
    } else {
      this.disconnect();
    }
  }

  async updateFromGameContract() {
    if (this.contracts.game) {
      await this.contracts.game.update();
      const storage = this.contracts.game._storage;
      this._players = storage.playersSet;
      if (this._players.includes(this.tezosService.account.account_id)) {
        this.isRegistered = true;
      }
      this.playingStatus = storage.status;
      switch (storage.status) {
        case 'created': {
          this.creationStatus = eGameCreationStatus.READY;
          break;
        }
        case 'started': {
          this.creationStatus = eGameCreationStatus.PLAYING;
          break;
        }
        case 'frozen': {
          this.creationStatus = eGameCreationStatus.PLAYING;
          break;
        }
        case 'ended': {
          this.creationStatus = eGameCreationStatus.ENDED;
          break;
        }
      }
      this.nextPlayer = storage.nextPlayer;
      this.gameCreator = storage.creator;
    }
  }

  async checkContracts() {
    const promises = [];
    if (!this.contracts.game) {
      const p = await this.getContract<GameContract>(eContractType.GAME).then((gameContract) => {
        this.contracts.game = gameContract;
        console.log('start watching game contract');
        // this.contracts.game.startWatching(5000, (storage) => {

        // });
      }).catch(err => { /* fail is acceptable meaning that contract is not created yet */ });
      promises.push(p);
    }
    if (!this.contracts.token) {
      const p = await this.getContract<TokenContract>(eContractType.GAME).then((tokenContract) => {
        this.contracts.token = tokenContract;
      }).catch(err => { /* fail is acceptable meaning that contract is not created yet */ });
      promises.push(p);
    }
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }

  async callContract(
    method: (keyStore: KeyStore) => Promise<{txHash: string, onConfirmed: Promise<number>}>,
    onSent: (txHash: string) => void,
    onSuccess: (txHash: string, blockId: number) => void
  ) {
    const waiterTask = this.waiterService.addTask();
    method(this.tezosService.keyStore).then((resultOperation) => {
      resultOperation.onConfirmed.then(
        (blockId) => {
          onSuccess(resultOperation.txHash, blockId);
        }
      ).catch(
        err => this.alertService.error(err)
      ).finally(
        () => this.waiterService.removeTask(waiterTask)
      );
      onSent(resultOperation.txHash);
    }).catch(
      err => {
        this.alertService.error(err);
        this.waiterService.removeTask(waiterTask);
      }
    );
  }

  async start() {
    if (this.contracts.game) {
      this.callContract(
        (ks) => this.contracts.game.start(ks),
        (txHash) => {
          this.showAlert(`game start requested (txHash:${txHash}) ...`);
        },
        (txHash, blockId) => {
          this.showAlert(`game successfully started (txHash:${txHash}, blockId:${blockId})`);
          this.updateFromGameContract();
        }
      );
    }
  }

  async freeze() {
    if (this.contracts.game) {
      this.callContract(
        (ks) => this.contracts.game.freeze(ks),
        (txHash) => {
          this.showAlert(`game freeze requested (txHash:${txHash}) ...`);
        },
        (txHash, blockId) => {
          this.showAlert(`game successfully frozen (txHash:${txHash}, blockId:${blockId})`);
          this.updateFromGameContract();
        }
      );
    }
  }

  async resume() {
    if (this.contracts.game) {
      this.callContract(
        (ks) => this.contracts.game.resume(ks),
        (txHash) => {
          this.showAlert(`game resuming requested (txHash:${txHash}) ...`);
        },
        (txHash, blockId) => {
          this.showAlert(`game successfully resumed (txHash:${txHash}, blockId:${blockId})`);
          this.updateFromGameContract();
        }
      );
    }
  }

  async end() {
    if (this.contracts.game) {
      this.callContract(
        (ks) => this.contracts.game.end(ks),
        (txHash) => {
          this.showAlert(`game ending requested (txHash:${txHash}) ...`);
        },
        (txHash, blockId) => {
          this.showAlert(`game successfully ended (txHash:${txHash}, blockId:${blockId})`);
          this.updateFromGameContract();
        }
      );
    }
  }

  showAlert(message: string) {
    if (this.alert) {
      this.alertService.onClose(this.alert.alertId);
      this.alert = undefined;
    }
    this.alert = this.alertService.show({message});
  }

  alertError(err: any) {
    if (this.alert) {
      this.alertService.onClose(this.alert.alertId);
      this.alert = undefined;
    }
    this.alert = this.alertService.error(err);
  }

  disconnect() {
    if (this.contracts.game) {
      this.contracts.game.stopWatching();
    }
    this.isConnected = false;
    this.isRegistered = false;
    this.isRegistering = false;
    this._game = undefined;
    this.playingStatus = '';
    this.creationStatus = eGameCreationStatus.NONE;
    this.contracts = {
      game: undefined,
      token: undefined
    };
  }

  getAllSessions(): Observable<any[]> {
    return this.apiService.get<any[]>(`game`);
  }

  iAmNextPlayer() {
    return this.nextPlayer && this.nextPlayer === this.tezosService.account.account_id;
  }

}
