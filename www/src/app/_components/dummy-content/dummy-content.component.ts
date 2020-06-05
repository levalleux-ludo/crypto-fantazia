import { Component, OnInit } from '@angular/core';
import { AlertService, IAlertType } from 'src/app/_services/alert.service';
import { ProgressBarService } from 'src/app/_services/progress-bar.service';
import { ModalService } from 'src/app/_services/modal.service';
import { ModalExampleComponent } from '../modal-example/modal-example.component';

@Component({
  selector: 'app-dummy-content',
  templateUrl: './dummy-content.component.html',
  styleUrls: ['./dummy-content.component.scss']
})
export class DummyContentComponent implements OnInit {

  constructor(
    private alertService: AlertService,
    private progressBarService: ProgressBarService,
    private modalService: ModalService
  ) { }

  ngOnInit(): void {
  }

  openPopup() {
    this.modalService.showModal(ModalExampleComponent);
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
