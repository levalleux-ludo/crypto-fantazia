import { Component, OnInit, OnDestroy } from '@angular/core';
import { ConnectionService } from 'src/app/_services/connection.service';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { WaiterService } from 'src/app/_services/waiter.service';

@Component({
  selector: 'app-connection-page',
  templateUrl: './connection-page.component.html',
  styleUrls: ['./connection-page.component.scss']
})
export class ConnectionPageComponent implements OnInit, OnDestroy {

  form: FormGroup;
  isConnecting = false;
  waiterTask: string;

  constructor(
    private connectionService: ConnectionService,
    private fb: FormBuilder,
    private waiterService: WaiterService
  ) { }

  ngOnDestroy(): void {
    if (this.waiterTask) {
      this.waiterService.removeTask(this.waiterTask);
    }
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      username: new FormControl('', Validators.required),
      rememberMe: new FormControl(false)
    });
  }

  createSession() {
    this.waiterTask = this.waiterService.addTask();
    this.isConnecting = true;
    this.connectionService.connect(this.form.value);
  }

  connectSession() {
    this.waiterTask = this.waiterService.addTask();
    this.isConnecting = true;
    this.connectionService.connect(this.form.value);
  }

  isValid() {
    return this.form.valid;
  }

}
