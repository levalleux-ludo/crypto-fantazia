import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { FileInput } from 'ngx-material-file-input';
import { KeyStore } from 'conseiljs';
import { TezosService } from 'src/app/_services/tezos.service';
import { AlertService } from 'src/app/_services/alert.service';

@Component({
  selector: 'app-tezos-connect',
  templateUrl: './tezos-connect.component.html',
  styleUrls: ['./tezos-connect.component.scss']
})
export class TezosConnectComponent implements OnInit {

  formDoc: FormGroup;

  constructor(
    private _fb: FormBuilder,
    public tezosService: TezosService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.formDoc = this._fb.group({
      walletFile: [
        undefined,
        [Validators.required]
      ]
    });

    this.formDoc.get('walletFile').valueChanges.subscribe((val: FileInput) => {
      console.log('onchange', val);
      const alert = this.alertService.show({message: `Please wait for your Tezos account is activated ...`});
      this.tezosService.connect(val.files[0]).then(() => {
      }).catch((err) => {
        this.alertService.error(err);
      }).finally(() => {
        this.alertService.onClose(alert.alertId);
      })
    });

    this.tezosService.initialize();

  }


  logout() {
    this.formDoc.setValue({walletFile: ''}, {onlySelf: true, emitEvent: false});
    this.tezosService.logout();
  }


}
