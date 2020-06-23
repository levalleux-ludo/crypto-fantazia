import { Component, OnInit, Directive, TemplateRef, ContentChildren, QueryList, ViewChildren, ElementRef, AfterViewInit, ViewChild, Input, AfterContentInit, Output, EventEmitter } from '@angular/core';
import { AnimationPlayer, style, AnimationFactory, AnimationBuilder, animate } from '@angular/animations';
import { CarouselItemDirective } from './carousel-item.directive';
import { CarouselItemElementDirective } from './carousel-item-element.directive';

@Component({
  selector: 'app-carousel',
  exportAs: 'app-carousel',
  templateUrl: './carousel.component.html',
//   template: `
//   <p>Hello</p>
// <section class="carousel-wrapper" [ngStyle]="carouselWrapperStyle">
//     <ul class="carousel-inner" #carousel>
//         <li *ngFor="let item of items;" class="app-carousel-item">
//             <ng-container [ngTemplateOutlet]="item.tpl"></ng-container>
//         </li>
//     </ul>
// </section>

// <div *ngIf="showControls" style="margin-top: 1em">
//     <button (click)="next()">Next</button>
//     <button (click)="prev()">Previous</button>
// </div>`,
  styleUrls: ['./carousel.component.scss']
//   styles: [`
//   ul {
//     list-style: none;
//     margin: 0;
//     padding: 0;
//     width: 6000px;
//   }

//   .carousel-wrapper {
//     overflow: hidden;
//   }

//   .carousel-inner {
//     display: flex;
//   }

// `]
})
export class CarouselComponent implements AfterViewInit, OnInit, AfterContentInit {

  @ContentChildren(CarouselItemDirective) items: QueryList<CarouselItemDirective>;

  @ViewChildren(CarouselItemElementDirective) private itemsDirectives: QueryList<CarouselItemElementDirective>;

  @ViewChildren(CarouselItemElementDirective, { read: ElementRef }) private itemsElements: QueryList<ElementRef>;

  carouselWrapperStyle = {};
  @ViewChild('carousel') private carousel: ElementRef;
  @Input() timing = '100ms ease-in-out';
  @Input() showControls = true;
  @Input() containerWidth = 800;
  @Input() containerHeight = 300;
  @Input() blockScaleFactor = 0.5;
  @Input() offsetBefore = 0;
  private player: AnimationPlayer;
  @Input() itemWidth: number = 200;

  @Output() step = new EventEmitter<number>();
  private currentSlide = 0;
  // private initialOffsetX = 0;
  private nbVisibleBlocksBefore;
  private nbVisibleBlocksAfter;
  constructor(
    private builder: AnimationBuilder,
    private elementRef: ElementRef
  ) { }
  ngAfterContentInit(): void {
    // console.log('ngAfterContentInit this.items.length', this.items?.length);
    // // For some reason only here I need to add setTimeout, in my local env it's working without this.
    // setTimeout(() => {
      // this.itemWidth = this.itemsElements.first.nativeElement.getBoundingClientRect().width;
      // this.initialOffsetX = this.itemWidth / 2;
      this.nbVisibleBlocksBefore = Math.floor(1 + (this.offsetBefore) / (this.itemWidth));
      console.log('nbVisibleBlocksBefore', this.nbVisibleBlocksBefore);
      this.nbVisibleBlocksAfter = Math.floor(
        1 + (this.containerWidth - this.itemWidth - this.offsetBefore) / (this.itemWidth)
      );
      console.log('nbVisibleBlocksAfter', this.nbVisibleBlocksAfter);
      this.carouselWrapperStyle = {
        width: `${this.containerWidth}px`,
        // height: `${this.containerHeight}px`
      };
    // });
  }
  ngOnInit(): void {
    console.log('OnInit this.items.length', this.items?.length);
  }

  ngAfterViewInit() {
    this.carousel.nativeElement.style['padding-top'] = `${(this.containerHeight - this.itemWidth)}px`;
    this.currentSlide = this.nbVisibleBlocksBefore;
    this.updateSizes();
    this.translate(0, this.computeOffset());
  }

  public get itemsBefore(): any[] {
    return this.items.toArray().slice(this.items.length - this.nbVisibleBlocksBefore);
  }

  public get itemsAfter(): any[] {
    return this.items.toArray().slice(0, this.nbVisibleBlocksAfter);
  }

  private buildAnimation( offset ) {
    return this.builder.build([
      animate(this.timing, style({ transform: `translateX(-${offset}px)` }))
    ]);
  }

  updateSizes(overflow = false) {
    console.log(`updateSizes(${overflow})`);
    // const currentItemElement = this.itemsElements.toArray()[this.currentSlide];
    console.log(`current slide ${this.currentSlide} block : (${this.itemsDirectives.toArray()[this.currentSlide].itemId})`);
    for (let i = 0; i < this.itemsElements.length; i++) {
      console.log(`element ${i}, item:${this.itemsDirectives.toArray()[i].itemId}`);
      let animation: AnimationFactory;
      let translateX;
      let scale;
      const threshold = this.nbVisibleBlocksBefore + this.currentSlide - 1;
      if (i < threshold) {
        translateX = 0;
        scale = 1.0;
      } else if (i === threshold) {
        translateX = this.itemWidth * 1.5 / 8;
        scale = 1.5;
      } else if (i < threshold + this.items.length) {
        translateX = this.itemWidth / 2;
        scale = 1.0;
      } else if (i === threshold + this.items.length) {
        translateX = this.itemWidth * ( 4.2 / 8 );
        scale = 1.5;
      } else {
        translateX = this.itemWidth;
        scale = 1.0;
      }
      console.log(`i=${i}, translateX=${translateX}, scale=${scale}`);

      animation = this.builder.build([
        animate(this.timing, style({ transform: `scale(${scale}) translateX(${translateX}px)` }))]);
      const player = animation.create(this.itemsElements.toArray()[i].nativeElement.firstChild);
      player.play();

      // if (bigs.includes(i)) {
      //   // itemElement.nativeElement.firstChild.style.width = `${this.itemWidth}px`;
      //   // itemElement.nativeElement.firstChild.style.height = `${this.itemWidth}px`;
      //   animation = this.builder.build([
      //     animate(this.timing, style({ transform: `scale(1.5)` }))]);
      // } else {
      //   // itemElement.nativeElement.firstChild.style.width = `${this.itemWidth * 0.75}px`;
      //   // itemElement.nativeElement.firstChild.style.height = `${this.itemWidth * 0.75}px`;
      //   // const translateX = (this.itemWidth / 2) * ((this.currentSlide + this.items.length) - i) - (this.itemWidth / 4);
      //   const translateX =  ? this.itemWidth / 4 : -this.itemWidth / 4;
      //   animation = this.builder.build([
      //     // animate(this.timing, style({ transform: `scale(0.5) translateX(${translateX}px)` }))]);
      //     animate(this.timing, style({ transform: `translateX(${translateX}px)` }))]);
      // }
      // const player = animation.create(this.itemsElements.toArray()[i].nativeElement.firstChild);
      // player.play();
    }
    // for (let itemElement of this.itemsElements) {
    //   let animation: AnimationFactory;
    //   if (itemElement === currentItemElement) {
    //     // itemElement.nativeElement.firstChild.style.width = `${this.itemWidth}px`;
    //     // itemElement.nativeElement.firstChild.style.height = `${this.itemWidth}px`;
    //     animation = this.builder.build([
    //       animate(this.timing, style({ transform: `unset` }))]);
    //   } else {
    //     // itemElement.nativeElement.firstChild.style.width = `${this.itemWidth * 0.75}px`;
    //     // itemElement.nativeElement.firstChild.style.height = `${this.itemWidth * 0.75}px`;
    //     animation = this.builder.build([
    //       animate(this.timing, style({ transform: `scale(0.5)` }))]);
    //   }
    //   const player = animation.create(itemElement.nativeElement.firstChild);
    //   player.play();
    // }
  }

  next(onDone?: () => void) {
    let backToBeginning = false;
    if ( this.currentSlide === this.items.length ) {
      backToBeginning = true;


      // this.currentSlide = this.items.length + (this.currentSlide + 1) % this.items.length;
      // this.updateSizes([this.currentSlide, this.currentSlide + this.items.length]);
      // // this.carousel.nativeElement.style.transform = `unset`;
      // const offset = (this.items.length + this.currentSlide) * this.itemWidth - this.initialOffsetX;
      // const animation = this.builder.build([
      //   animate(this.timing, style({ transform: `translateX(-${offset}px)` }))
      // ]);
      // this.player = animation.create(this.carousel.nativeElement);
      // this.player.onDone(() => {
      //   // reset
      //   const offset = this.currentSlide * this.itemWidth - this.initialOffsetX;
      //   this.carousel.nativeElement.style.transform = `translateX(-${offset}px)`;
      //   const animation = this.builder.build([
      //     animate(0, style({ transform: `translateX(-${offset}px)` }))
      //   ]);
      //   this.player = animation.create(this.carousel.nativeElement);
      //   this.player.play();
      // });
      // this.player.play();
      // return;
    }

    console.log(`next currentslide:${this.currentSlide}`);
    this.currentSlide = this.nbVisibleBlocksBefore + (this.currentSlide - this.nbVisibleBlocksBefore + 1) % this.items.length;
    console.log(`new slide:${this.currentSlide}`);
    // this.currentSlide = (this.currentSlide + 1) % this.items.length;

    this.updateSizes(backToBeginning);

    const offset = this.computeOffset();
    if (backToBeginning) {
      this.translate(
        this.timing,
        offset + this.itemWidth * (this.items.length + 0.5),
        () => {
          this.translate(0, offset, onDone);
      });
    } else {
      this.translate(
        this.timing,
        offset,
        onDone
      );
    }
    this.step.emit(this.itemsDirectives.toArray()[this.currentSlide].itemId);
    // this.carousel.nativeElement.style.transform = `translateX(-${offset}px)`;
    // const myAnimation: AnimationFactory = this.buildAnimation(offset);

  }

  computeOffset() {
    return this.currentSlide * this.itemWidth - this.offsetBefore;
  }

  translate(duration, offset, onDone?) {
    console.log(`translate(${offset})`);
    const animation = this.builder.build([
      animate(duration, style({ transform: `translateX(-${offset}px)` }))]);
    const player = animation.create(this.carousel.nativeElement);
    if (onDone) {
      player.onDone(onDone);
    }
    player.play();
  }

  prev() {
    if ( this.currentSlide === 0 ) { return; }

    this.currentSlide = ((this.currentSlide - 1) + this.items.length) % this.items.length;
    const offset = this.currentSlide * this.itemWidth;
    this.updateSizes();

    const myAnimation: AnimationFactory = this.buildAnimation(offset);

    this.player = myAnimation.create(this.carousel.nativeElement);
    this.player.play();
  }

  targetSlide;
  onNextDone = (onDone?: (position: number) => void) => {
    if (this.targetSlide !== this.currentSlide) {
      this.next(() => this.onNextDone(onDone));
    } else {
      if (onDone) {
        onDone(this.currentSlide - this.nbVisibleBlocksBefore);
      }
    }
  }

  goto(position: number, onDone?: (position: number) => void) {
    this.targetSlide = this.nbVisibleBlocksBefore + position;
    console.log(`goto(${position}) current slide:${this.currentSlide} --> target slide:${this.targetSlide}`);
    this.onNextDone(onDone);
    // while (newSlide !== this.currentSlide) {
    // }
    // this.updateSizes([this.currentSlide]);

    // const offset = this.currentSlide * this.itemWidth - this.initialOffsetX;
    // // this.carousel.nativeElement.style.transform = `translateX(-${offset}px)`;
    // const myAnimation: AnimationFactory = this.buildAnimation(offset);

    // this.player = myAnimation.create(this.carousel.nativeElement);
    // if (this.currentSlide === 2 * this.itemWidth) {
    //   this.player.onDone(() => {
    //     // reset
    //     const animation = this.builder.build([
    //       animate(0, style({ transform: `translateX(-${this.currentSlide * this.itemWidth - this.initialOffsetX}px)` }))
    //     ]);
    //     this.player = animation.create(this.carousel.nativeElement);
    //     this.player.play();
    //   });
    // }
    // this.player.play();
  }

  getBlockIdBefore(idx) {
    return idx + this.items.length - this.nbVisibleBlocksBefore;
  }

  getBlockIdAfter(idx) {
    return idx;
  }


}

