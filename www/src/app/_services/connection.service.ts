import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { GameService } from './game.service';
import { eLocalStorageDataKey } from 'src/constants';
import { ApiService } from './api.service';
import { TezosService } from './tezos.service';
import { UserService } from './user.service';

export interface ConnectionData {
  username: string;
  rememberMe: boolean;
  avatar: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConnectionService {

  isConnected = false;
  isConnecting = false;
  username = '';
  rememberMe = false;
  avatar = '';
  connected = new Subject<ConnectionData>();
  constructor(
    private apiService: ApiService,
    private tezosService: TezosService,
    private userService: UserService
  ) {
    const stored = localStorage.getItem(eLocalStorageDataKey.USERNAME);
    if (stored) {
      this.username = stored;
      this.rememberMe = true;
    }
    const avatar = localStorage.getItem(eLocalStorageDataKey.AVATAR);
    if (avatar) {
      this.avatar = avatar;
      this.rememberMe = true;
    }
  }

  async connect(data: ConnectionData): Promise<ConnectionData> {
    this.isConnecting = true;
    return new Promise((resolve, reject) => {
        this.username = data.username;
        this.rememberMe = data.rememberMe;
        this.avatar = data.avatar;
        if (this.rememberMe) {
          localStorage.setItem(eLocalStorageDataKey.USERNAME, data.username);
          localStorage.setItem(eLocalStorageDataKey.AVATAR, data.avatar);
        } else {
          localStorage.removeItem(eLocalStorageDataKey.USERNAME);
          localStorage.removeItem(eLocalStorageDataKey.AVATAR);
        }
        this.isConnected = true;
        this.isConnecting = false;
        this.userService.connect(data.username, this.tezosService.account.account_id, data.avatar)
        .then(() => {
          this.connected.next(data);
          resolve(data);
        }).catch(err => reject(err));
    });
  }

  disconnect() {
    this.username = '';
    this.avatar = '';
    this.isConnected = false;
    this.isConnecting = false;
    this.rememberMe = false;
    localStorage.removeItem(eLocalStorageDataKey.USERNAME);
    localStorage.removeItem(eLocalStorageDataKey.AVATAR);
    this.connected.next({
      username: this.username,
      rememberMe: this.rememberMe,
      avatar: this.avatar
    });
  }

  waitConnected$(): Subject<ConnectionData> {
    return this.connected;
  }

}
