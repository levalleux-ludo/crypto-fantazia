import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { FileInput } from 'ngx-material-file-input';
import { KeyStore } from 'conseiljs';
import { TezosService } from 'src/app/_services/tezos.service';

@Component({
  selector: 'app-tezos-connect',
  templateUrl: './tezos-connect.component.html',
  styleUrls: ['./tezos-connect.component.scss']
})
export class TezosConnectComponent implements OnInit {

  formDoc: FormGroup;

  constructor(
    private _fb: FormBuilder,
    public tezosService: TezosService
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
      this.tezosService.connect(val.files[0]);
    });

    this.tezosService.initialize();

  }


  logout() {
    this.formDoc.setValue({walletFile: ''}, {onlySelf: true, emitEvent: false});
    this.tezosService.logout();
  }


}
