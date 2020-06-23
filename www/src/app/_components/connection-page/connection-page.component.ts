import { Component, OnInit, OnDestroy, ElementRef, AfterViewInit } from '@angular/core';
import { ConnectionService } from 'src/app/_services/connection.service';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { WaiterService } from 'src/app/_services/waiter.service';
import { GameService } from 'src/app/_services/game.service';
import { AlertService } from 'src/app/_services/alert.service';
import { TezosService } from 'src/app/_services/tezos.service';
import { eLocalStorageDataKey } from 'src/constants';
import { ModalService } from 'src/app/_services/modal.service';
import { ChooseSessionDialogComponent } from '../choose-session-dialog/choose-session-dialog.component';
import { take } from 'rxjs/operators';
import { exec } from 'child_process';

@Component({
  selector: 'app-connection-page',
  templateUrl: './connection-page.component.html',
  styleUrls: ['./connection-page.component.scss']
})
export class ConnectionPageComponent implements OnInit, OnDestroy, AfterViewInit {

  form: FormGroup;
  isConnecting = false;
  waiterTask: string;

  constructor(
    public connectionService: ConnectionService,
    private fb: FormBuilder,
    private waiterService: WaiterService,
    private gameService: GameService,
    private alertService: AlertService,
    private tezosService: TezosService,
    private modalService: ModalService,
    private elementRef: ElementRef
  ) { }
  ngAfterViewInit(): void {
    // this.elementRef.nativeElement.style.setProperty('--background-image', '../../../assets/crypto-fantasia.png');
 }

  ngOnDestroy(): void {
    if (this.waiterTask) {
      this.waiterService.removeTask(this.waiterTask);
    }
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      username: new FormControl(this.connectionService.username, Validators.required),
      rememberMe: new FormControl(this.connectionService.rememberMe)
    });
  }

  // storeUsername() {
  //   if (this.form.controls.rememberMe.value) {
  //     localStorage.setItem(eLocalStorageDataKey.USERNAME, this.form.controls.username.value);
  //   } else {
  //     localStorage.removeItem(eLocalStorageDataKey.USERNAME);
  //   }
  // }

  submit(newSession: boolean) {
    this.isConnecting = true;
    this.waiterTask = this.waiterService.addTask();
    this.connectionService.connect(this.form.value).then((connectionData) => {
      if (newSession) {
        this.gameService.createSession().then((game) => {
          this.alertService.show({message: `game session with Id ${game.sessionId} is being created. This may take several minutes.`});
          this.isConnecting = false;
        }).catch(err => {
          this.alertService.error(JSON.stringify(err));
          this.isConnecting = false;
        });
      } else {
        this.modalService.showModal(ChooseSessionDialogComponent).then((sessionId) => {
          if (!sessionId) {
            this.waiterService.removeTask(this.waiterTask);
            this.isConnecting = false;
          } else {
              this.gameService.connectSession(sessionId).then((game) => {
                this.alertService.show({message: 'connected game with sessionId:' + game.sessionId});
                this.isConnecting = false;
              }, err => {
                this.alertService.error(JSON.stringify(err));
                this.isConnecting = false;
              });
          }
        }).catch(err => {
          this.waiterService.removeTask(this.waiterTask);
          this.isConnecting = false;
          this.alertService.error(JSON.stringify(err));
        });

      }
    }).catch(err => {
      this.waiterService.removeTask(this.waiterTask);
      this.isConnecting = false;
      this.alertService.error(JSON.stringify(err));
    });
  }

  // createSession() {
  //   this.waiterTask = this.waiterService.addTask();
  //   // this.storeUsername();
  //   // this.isConnecting = true;
  //   this.connectionService.connect(this.form.value).then((connectionData) => {
  //     this.gameService.createSession(connectionData.username).subscribe((game) => {
  //       this.alertService.show({message: 'game session created with Id:' + game.sessionId});
  //       this.gameService.isConnected = true;
  //       this.gameService.game = game;
  //       const subscription = this.gameService.onStatusChange.subscribe((newStatus) => {
  //         if (newStatus === 'created') {
  //           if (!this.gameService.contract) {
  //             throw new Error('Game contract is not set');
  //           }
  //           this.gameService.contract.register(this.tezosService.keyStore, 123456789, 'ljlqksjflkqsfqs').then(() => {
  //             this.alertService.show({message: 'Successfully registered to the game contract'});
  //           }).catch(err => this.alertService.error(JSON.stringify(err)));
  //         }
  //       });
  //     }, err => {
  //       this.alertService.error(JSON.stringify(err));
  //     });
  //   });
  // }

  // connectSession() {
  //   this.waiterTask = this.waiterService.addTask();
  //   // this.storeUsername();
  //   // this.isConnecting = true;
  //   this.modalService.showModal(ChooseSessionDialogComponent).pipe(take(1)).subscribe((sessionId) => {
  //     if (!sessionId) {
  //       this.waiterService.removeTask(this.waiterTask);
  //       // this.isConnecting = false;
  //     } else {
  //       this.connectionService.connect(this.form.value).then((connectionData) => {
  //         const subscription = this.gameService.connectSession(sessionId, connectionData.username).subscribe((game) => {
  //           subscription.unsubscribe(); // be sure we subscribe onyl once at a time
  //           this.alertService.show({message: 'connected game with sessionId:' + game.sessionId});
  //           this.gameService.isConnected = true;
  //           this.gameService.game = game;
  //         }, err => {
  //           this.alertService.error(JSON.stringify(err));
  //         });
  //       }).catch(err => {
  //         this.waiterService.removeTask(this.waiterTask);
  //         // this.isConnecting = false;
  //         this.alertService.error(JSON.stringify(err));
  //       });
  //     }
  //   }, err => {
  //     this.waiterService.removeTask(this.waiterTask);
  //     this.isConnecting = false;
  //     this.alertService.error(JSON.stringify(err));
  //   });
  //   // this.connectionService.connect(this.form.value);
  // }

  isValid() {
    return this.form.valid && this.tezosService.isConnected;
  }

}
