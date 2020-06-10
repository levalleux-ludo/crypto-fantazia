import { Injectable, EventEmitter } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, interval } from 'rxjs';
import { tezosService } from '../../../../tezos/src/tezos.service';
import { GameContract } from '../../../../tezos/src/game.contract';
import { IGame } from '../../../../api/src/db/game.model';


@Injectable({
  providedIn: 'root'
})
export class GameService {

  isConnected = false;
  _players = [];

  _game = undefined;

  contract: GameContract;

  onStatusChange: EventEmitter<string> = new EventEmitter();

  constructor(
    private apiService: ApiService
  ) { }

  get players() {
    return this._players;
  }

  get game(): IGame {
    return this._game;
  }
  set game(value: IGame) {
    this._game = value;
    if (this._game.status === 'in_creation') {
      const interval = setInterval(() => {
        if (this._game.status !== 'in_creation') {
          clearInterval(interval);
          this.setContract().then(() => {
            this.onStatusChange.emit(this.game.status);
          });
        }
      }, 2000);
    } else {
      this.setContract();
    }
  }

  async setContract(): Promise<void> {
    const contract = await GameContract.retrieve(this._game.contractAddresses.game);
    if (this.contract && this.contract.isWatching) {
      this.contract.stopWatching();
    }
    this.contract = contract;
    this.contract.startWatching(2000);
  }

  createSession(username: string): Observable<IGame> {
    return this.apiService.post<IGame>('game/create', { creator: username });
  }

  connectSession(sessionId: string, username: string): Observable<IGame> {
    return this.apiService.get<IGame>(`game/${sessionId}`);
  }

  getAllSessions(): Observable<any[]> {
    return this.apiService.get<any[]>(`game`);
  }

  getPlayers() {
    this._players = ['alice', 'bob', 'charlie'];
    if (!this.game) {
      this._players = [];
      return;
    }
    tezosService.readContract(this.game.contractAddresses.game).then((storage) => {
      console.log('Read game contract', JSON.stringify(storage));
    });
  }

}
