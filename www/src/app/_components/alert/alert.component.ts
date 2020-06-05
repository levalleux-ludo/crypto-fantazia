import { Component, OnInit } from '@angular/core';
import { AlertService } from 'src/app/_services/alert.service';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss']
})
export class AlertComponent implements OnInit {

  constructor(
    public alertService: AlertService
  ) { }

  ngOnInit(): void {
  }

  onClose(value: any): void {
    this.alertService.onClose(value);
  }

}
