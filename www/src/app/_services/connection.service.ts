import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { GameService } from './game.service';

export interface ConnectionData {
  username: string;
  rememberMe: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ConnectionService {

  isConnected = false;
  username = '';
  connected = new Subject<ConnectionData>();
  constructor(
    private gameService: GameService
  ) { }

  async connect(data: ConnectionData): Promise<ConnectionData> {
    return new Promise((resolve, reject) => {
        this.username = data.username;
        this.isConnected = true;
        this.connected.next(data);
        resolve(data);
    });
  }

  disconnect() {
    this.username = '';
    this.isConnected = false;
    this.gameService.isConnected = false;
    this.gameService.game = undefined;
  }

  waitConnected$(): Subject<ConnectionData> {
    return this.connected;
  }

}
