import { Injectable, EventEmitter } from '@angular/core';
import { Observable, Subject} from 'rxjs';

export enum IAlertType {
  INFO = "info",
  WARNING = "warning",
  SUCCESS = "success",
  DANGER = "danger"
}

export interface IAction {
  label: string;
  callback: () => void;
}

export interface IAlertConfig {
  clrAlertType?: IAlertType;
  message: string;
  clrAlertAppLevel?: boolean;
  clrAlertClosable?: boolean;
  actions?: {
    label: string;
    options: IAction[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  alertCount = 0;
  defaultAlertConfig: IAlertConfig = {
    clrAlertType: IAlertType.INFO,
    message: '',
    clrAlertAppLevel: false,
    clrAlertClosable: true,
    actions: undefined
  };
  alertsMap: Map<number, {alertId: number, config: IAlertConfig}> = new Map();
  // alerts: IterableIterator<{alertId: number, config: IAlertConfig}>;
  closeMap: Map<number, Subject<any>> = new Map();

  constructor() {
    // this.alerts = this.alertsMap.values();
  }

  get alerts(): Array<{alertId: number, config: IAlertConfig}> {
    return Array.from(this.alertsMap.values());
  }

  show(config: IAlertConfig): {alertId: number, onClose$: any} {
    this.alertCount++;
    const alertConfig = {...this.defaultAlertConfig, ...config};
    this.alertsMap.set(this.alertCount, {alertId: this.alertCount, config: alertConfig });
    const close = new Subject<any>();
    this.closeMap.set(this.alertCount, close);
    // this.alerts = this.alertsMap.values();
    return {alertId: this.alertCount, onClose$: close};
  }

  onClose(value: any): any {
   this.alertsMap.delete(value);
  //  this.alerts = this.alertsMap.values();
   const close = this.closeMap.get(value);
   this.closeMap.delete(value);
   close.next(value);
   close.complete();
  }
}
