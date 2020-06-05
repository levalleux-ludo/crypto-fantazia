import { Component } from '@angular/core';
import { AlertService, IAlertType } from './_services/alert.service';
import {pipe} from 'rxjs';
import {take} from 'rxjs/operators';
import { ProgressBarService } from './_services/progress-bar.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'crypto-fantasia';
  opened = false;

  constructor(
    private alertService: AlertService,
    private progressBarService: ProgressBarService
  ) {}

  openPopup() {
    this.opened = true;
  }

  alert(message: string) {
    const first = this.alertService.show({
      message: 'Hello this is an alert'
    });
    first.onClose$.subscribe( x=> {
      console.log('closed alert nb', x);
      const newAlert = this.alertService.show({
        message: 'Second Alert',
        clrAlertType: IAlertType.SUCCESS,
        actions: {
          label: 'Actions',
          options: [
            {
              label: 'Ignore',
              callback: () => {
                console.log('Ignored');
              }
            },
            {
              label: 'Show',
              callback: () => {
                this.openPopup();
              }
            }
          ]
        }
      });
      console.log('show newAlert nb: ', newAlert);
    });
  }

  download() {
    let currentVal = 0;
    this.progressBarService.showLooping();
    this.progressBarService.setProgress(currentVal, 100);
    const interval = setInterval(() => {
      currentVal += 5;
      this.progressBarService.setProgress(currentVal, 100);
      if (currentVal >= 50) {
        this.progressBarService.hideLooping();
      }
      if (currentVal >= 100) {
        this.progressBarService.hideProgress();
        clearInterval(interval);
      }
    }, 500);
  }
}
