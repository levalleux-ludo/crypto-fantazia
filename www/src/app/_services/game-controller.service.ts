import { Injectable } from '@angular/core';
import { GameService } from './game.service';
import { ApiService } from './api.service';
import { AlertService } from './alert.service';
import { TezosService } from './tezos.service';
import { WaiterService } from './waiter.service';
import { KeyStore } from '../../../../tezos/node_modules/conseiljs/dist';

@Injectable({
  providedIn: 'root'
})
export class GameControllerService {

  waiterTask: string;
  rollDicesResult;

  constructor(
    private gameService: GameService,
    private apiService: ApiService,
    private alertService: AlertService,
    private tezosService: TezosService,
    private waiterService: WaiterService
  ) { }


  public async start() {
    const sessionId = this.gameService.game.sessionId;
    this.waiterTask = this.waiterService.addTask();
    this.apiService.post<{txHash: string}>(`game/${sessionId}/start`, {}).subscribe(async ({txHash}) => {
      this.gameService.showAlert(`Game starting request in progress ... (txHash:${txHash})`);
      // DO no remove the this.waiterTask now, because the tx is not confirmed at the moment.
      // When confirmed, the GAME changes state, then the waiterTask will be removed
    }, err => {
      this.gameService.alertError(err);
      this.waiterService.removeTask(this.waiterTask);
      this.waiterTask = undefined;
    });
  }

  public async reset() {
    const sessionId = this.gameService.game.sessionId;
    this.waiterTask = this.waiterService.addTask();
    this.apiService.post<{txHash: string}>(`game/${sessionId}/reset`, {}).subscribe(async ({txHash}) => {
      this.gameService.showAlert(`Game reset request in progress ... (txHash:${txHash})`);
      // DO no remove the this.waiterTask now, because the tx is not confirmed at the moment.
      // When confirmed, the GAME changes state, then the waiterTask will be removed
    }, err => {
      this.gameService.alertError(err);
    });
  }

  public async freeze() {
    if (this.gameService.contracts.game) {
      this.callContract(
        (ks) => this.gameService.contracts.game.freeze(ks),
        (txHash) => {
          this.gameService.showAlert(`game freeze requested (txHash:${txHash}) ...`);
        },
        (txHash, blockId) => {
          this.gameService.showAlert(`game successfully frozen (txHash:${txHash}, blockId:${blockId})`);
          this.gameService.updateFromGameContract();
        }
      );
    }
  }

  public async resume() {
    if (this.gameService.contracts.game) {
      this.callContract(
        (ks) => this.gameService.contracts.game.resume(ks),
        (txHash) => {
          this.gameService.showAlert(`game resuming requested (txHash:${txHash}) ...`);
        },
        (txHash, blockId) => {
          this.gameService.showAlert(`game successfully resumed (txHash:${txHash}, blockId:${blockId})`);
          this.gameService.updateFromGameContract();
        }
      );
    }
  }

  public async end() {
    if (this.gameService.contracts.game) {
      this.callContract(
        (ks) => this.gameService.contracts.game.end(ks),
        (txHash) => {
          this.gameService.showAlert(`game ending requested (txHash:${txHash}) ...`);
        },
        (txHash, blockId) => {
          this.gameService.showAlert(`game successfully ended (txHash:${txHash}, blockId:${blockId})`);
          this.gameService.updateFromGameContract();
        }
      );
    }
  }

  public async rollTheDices(): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const sessionId = this.gameService.game.sessionId;
      const player = this.tezosService.account.account_id;
      this.waiterTask = this.waiterService.addTask();
      this.apiService.get<any>(`game/${sessionId}/rollDices/${player}`).subscribe(async (rollResult) => {
        console.log(`Roll Results: payload:${JSON.stringify(rollResult.payload)}, signature:${rollResult.signature}`)
        // TODO: store rollResult.payload and rollResult.signature for later use when sending play request to game contract
        this.rollDicesResult = rollResult;
        this.waiterService.removeTask(this.waiterTask);
        this.waiterTask = undefined;
        resolve(rollResult);
      }, err => {
        this.gameService.alertError(err);
        this.waiterService.removeTask(this.waiterTask);
        this.waiterTask = undefined;
        reject();
      });
    });
  }

  public async play() {
    // call contract with rollDicesResult and option chosen by user
    // TODO: the payload should include a contractCall structure to be realized by the smart contract,
    // for instance: {options = ["BUY", "IGNORE"], assetId, dices, cardId, newPosition} --> signature
    this.rollDicesResult = undefined;
  }

  private async callContract(
    method: (keyStore: KeyStore) => Promise<{txHash: string, onConfirmed: Promise<number>}>,
    onSent: (txHash: string) => void,
    onSuccess: (txHash: string, blockId: number) => void
  ) {
    this.waiterTask = this.waiterService.addTask();
    method(this.tezosService.keyStore).then((resultOperation) => {
      resultOperation.onConfirmed.then(
        (blockId) => {
          onSuccess(resultOperation.txHash, blockId);
        }
      ).catch(
        err => this.alertService.error(err)
      ).finally(
        () => {
          this.waiterService.removeTask(this.waiterTask);
          this.waiterTask = undefined;
        }
      );
      onSent(resultOperation.txHash);
    }).catch(
      err => {
        this.alertService.error(err);
        this.waiterService.removeTask(this.waiterTask);
        this.waiterTask = undefined;
      }
    );
  }

}
