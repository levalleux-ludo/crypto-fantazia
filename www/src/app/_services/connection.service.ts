import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

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
  constructor() { }

  async connect(data: ConnectionData): Promise<ConnectionData> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this.username = data.username;
        this.isConnected = true;
        this.connected.next(data);
        resolve(data);
      }, 5000);
    });
  }

  disconnect() {
    this.username = '';
    this.isConnected = false;
  }

  waitConnected$(): Subject<ConnectionData> {
    return this.connected;
  }

}
