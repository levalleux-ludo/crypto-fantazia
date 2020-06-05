import { Component } from '@angular/core';
import { AlertService, IAlertType } from './_services/alert.service';
import {pipe} from 'rxjs';
import {take} from 'rxjs/operators';
import { ProgressBarService } from './_services/progress-bar.service';
import { ModalService } from './_services/modal.service';
import { ModalExampleComponent } from './_components/modal-example/modal-example.component';
import { ConnectionService } from './_services/connection.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'crypto-fantasia';

  constructor(
    public connectionService: ConnectionService
  ) {}

}
