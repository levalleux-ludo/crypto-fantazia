import { Injectable, Type, EventEmitter } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ModalService {

  opened = false;
  componentClass = undefined;
  onShow: EventEmitter<Type<any>> = new EventEmitter();

  constructor() { }

  showModal(componentClass: Type<any>) {
    this.componentClass = componentClass;
    this.onShow.emit(this.componentClass);
    this.opened = true;
  }

  hideModal() {
    this.opened = false;
  }
}
