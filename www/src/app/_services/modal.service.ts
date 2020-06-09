import { Injectable, Type, EventEmitter } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModalService {

  opened = false;
  componentClass = undefined;
  onShow: EventEmitter<Type<any>> = new EventEmitter();
  onClose: Subject<any> = new Subject();

  constructor() { }

  showModal(componentClass: Type<any>): Observable<any> {
    this.componentClass = componentClass;
    this.onShow.emit(this.componentClass);
    this.opened = true;
    return this.onClose.asObservable();
  }

  hideModal(value?: any) {
    this.opened = false;
    this.onClose.next(value);
  }
}
