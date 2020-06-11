import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { GameService } from './game.service';
import { eLocalStorageDataKey } from 'src/constants';

export interface ConnectionData {
  username: string;
  rememberMe: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ConnectionService {

  isConnected = false;
  isConnecting = false;
  username = '';
  rememberMe = false;
  connected = new Subject<ConnectionData>();
  constructor(
    // private gameService: GameService
  ) {
    const stored = localStorage.getItem(eLocalStorageDataKey.USERNAME);
    if (stored) {
      this.username = stored;
      this.rememberMe = true;
    }
  }

  async connect(data: ConnectionData): Promise<ConnectionData> {
    this.isConnecting = true;
    return new Promise((resolve, reject) => {
        this.username = data.username;
        this.rememberMe = data.rememberMe;
        if (this.rememberMe) {
          localStorage.setItem(eLocalStorageDataKey.USERNAME, data.username);
        } else {
          localStorage.removeItem(eLocalStorageDataKey.USERNAME);
        }
        this.isConnected = true;
        this.isConnecting = false;
        this.connected.next(data);
        resolve(data);
    });
  }

  disconnect() {
    this.username = '';
    this.isConnected = false;
    this.isConnecting = false;
    this.rememberMe = false;
    localStorage.removeItem(eLocalStorageDataKey.USERNAME);
    this.connected.next({
      username: this.username,
      rememberMe: this.rememberMe
    });
  }

  waitConnected$(): Subject<ConnectionData> {
    return this.connected;
  }

}
