import { Directive, TemplateRef, Input } from '@angular/core';

@Directive({
  selector: '.app-carousel-item'
})
export class CarouselItemElementDirective {
  @Input() itemId = -1;
}
