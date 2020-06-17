import { Injectable, Type, EventEmitter } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModalService {

  opened = false;
  componentClass = undefined;
  onShow: EventEmitter<{componentClass: Type<any>, argsMap: any}> = new EventEmitter();
  onClose: Subject<any> = new Subject();

  constructor() { }

  showModal(componentClass: Type<any>, argsMap?: any): Promise<any> {
    this.componentClass = componentClass;
    this.onShow.emit({componentClass: this.componentClass, argsMap});
    this.opened = true;
    return new Promise((resolve, reject) => {
      const subscription = this.onClose.subscribe((value) => {
        subscription.unsubscribe();
        resolve(value);
      }, err => reject(err));
    });
  }

  hideModal(value?: any) {
    this.opened = false;
    this.onClose.next(value);
  }
}
