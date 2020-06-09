import { Injectable } from '@angular/core';
import { tezosService, IdentityData } from '../../../../tezos/src/tezos.service';
import { KeyStore } from 'conseiljs';
import { eLocalStorageDataKey } from 'src/constants';
import { WaiterService } from './waiter.service';

export interface Account {
  balance: string;
  address: string;
}

@Injectable({
  providedIn: 'root'
})
export class TezosService {

  private _initialized = false;
  private _connected = false;
  private _account = undefined;
  private _networkInfo = undefined;

  constructor(
    private waiterService: WaiterService,
  ) { }

  public get isConnected(): boolean {
    return this._connected;
  }

  public get network(): string {
    return this._networkInfo ? this._networkInfo.network : '-';
  }

  public get account(): any {
    return this._account;
  }

  async initialize(): Promise<void> {
    const waiterTask = this.waiterService.addTask();
    try {
      const networks = await tezosService.getNetworks();
      if (networks.length === 0) {
        throw new Error('No Tezos network found');
      }
      this._networkInfo = networks[0];

      const localStoredWallet = localStorage.getItem(eLocalStorageDataKey.WALLET);
      if (localStoredWallet) {
        try {
          await this.submitWallet(JSON.parse(localStoredWallet));
          console.log("Wallet successfully restored from loaclStorage");
        } catch (err) {
          console.warn('Unable to restore wallet from localStorage ->  clear localStorage', err);
          localStorage.removeItem(eLocalStorageDataKey.WALLET);
        }
      }
      this._initialized = true;
    } finally {
      this.waiterService.removeTask(waiterTask);
    }
  }

  connect(walletFile: File): Promise<void> {
    return new Promise((resolve, reject) => {
      new Promise((resolve2, reject2) => {
        if (!this._initialized) {
          this.initialize().then(() => {
            resolve2();
          }).catch(err => reject2(err));
        } else {
          resolve2();
        }
      }).then(() => {
        const fileReader = new FileReader();
        fileReader.onload = (e) => {
          console.log('read file', fileReader.result);
          this.submitWallet(JSON.parse(fileReader.result as string)).then(() => {
            resolve();
          }).catch(err => reject(err));
        };
        fileReader.readAsText(walletFile);
      }).catch(err => reject(err));
    });
  }

  async submitWallet(wallet: IdentityData): Promise<void> {
    return new Promise((resolve, reject) => {
      tezosService.getAccountFromIdentity(wallet).then((keyStore) => {
        localStorage.setItem(eLocalStorageDataKey.WALLET, JSON.stringify(wallet));
        this.refreshInfo(keyStore);
        resolve();
      }).catch(err => reject(err));
    });
  }

  refreshInfo(keyStore: KeyStore) {
    if (keyStore) {
      tezosService.accountInfo(keyStore.publicKeyHash).then((accountInfos) => {
        if (accountInfos.length !== 1) {
          throw new Error(`No account info or more than one for address ${keyStore.publicKeyHash}: nb results:${accountInfos.length}`);
        }
        this._account = accountInfos[0];
        this._connected = true;
      });
    } else {
      this._connected = false;
      this._account = undefined;
    }
  }

  logout() {
    localStorage.removeItem(eLocalStorageDataKey.WALLET);
    this.refreshInfo(undefined);
  }


}
