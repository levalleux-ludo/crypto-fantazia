import { Component, OnInit, ViewChild, ComponentFactoryResolver, Input, Type } from '@angular/core';
import { ModalService } from 'src/app/_services/modal.service';
import { ModalDirective } from 'src/app/_directives/modal.directive';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent implements OnInit {

  @ViewChild(ModalDirective, {static: true})
  modalContent: ModalDirective;

  constructor(
    public modalService: ModalService,
    private componentFactoryResolver: ComponentFactoryResolver
  ) { }

  ngOnInit(): void {
    this.modalService.onShow.subscribe(({componentClass, argsMap}) => {
      const viewContainerRef = this.modalContent.viewContainerRef;
      viewContainerRef.clear();
      if (componentClass !== undefined) {
        const componentFactory = this.componentFactoryResolver.resolveComponentFactory(componentClass);
        const componentRef = viewContainerRef.createComponent(componentFactory);
        console.log('component created', componentRef);
        if (argsMap) {
          try {
            Object.assign(componentRef.instance as any, argsMap);
          } catch (err) {
            console.error(`Unable to assign argsMap to modal component instance: ${err}`);
          }
        }
      }
    });
  }

}
