import { Component, OnInit, Directive, TemplateRef, ContentChildren, QueryList, ViewChildren, ElementRef, AfterViewInit, ViewChild, Input, AfterContentInit, Output, EventEmitter } from '@angular/core';
import { AnimationPlayer, style, AnimationFactory, AnimationBuilder, animate } from '@angular/animations';
import { CarouselItemDirective } from './carousel-item.directive';
import { CarouselItemElementDirective } from './carousel-item-element.directive';

@Component({
  selector: 'app-carousel',
  exportAs: 'app-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss']
})
export class CarouselComponent implements AfterViewInit, OnInit, AfterContentInit {

  @ContentChildren(CarouselItemDirective) items: QueryList<CarouselItemDirective>;

  @ViewChildren(CarouselItemElementDirective) private itemsDirectives: QueryList<CarouselItemElementDirective>;

  @ViewChildren(CarouselItemElementDirective, { read: ElementRef }) private itemsElements: QueryList<ElementRef>;

  carouselWrapperStyle = {};
  @ViewChild('carousel') private carousel: ElementRef;
  @Input() timing = '400ms ease-in-out';
  @Input() showControls = true;
  @Input() containerWidth = 800;
  @Input() containerHeight = 300;
  @Input() blockScaleFactor = 0.5;
  @Input() offsetBefore = 0;
  private player: AnimationPlayer;
  @Input() itemWidth: number = 200;
  targetSlide;

  @Output() step = new EventEmitter<number>();
  private position = 0;
  private nbVisibleBlocksBefore;
  private nbVisibleBlocksAfter;
  constructor(
    private builder: AnimationBuilder,
    private elementRef: ElementRef
  ) { }

  private get currentSlide() {
    return this.position + this.nbVisibleBlocksBefore;
  }
  ngAfterContentInit(): void {
      this.nbVisibleBlocksBefore = Math.floor(1 + (this.offsetBefore) / (this.itemWidth));
      console.log('nbVisibleBlocksBefore', this.nbVisibleBlocksBefore);
      this.nbVisibleBlocksAfter = Math.floor(
        1 + (this.containerWidth - this.itemWidth - this.offsetBefore) / (this.itemWidth)
      );
      console.log('nbVisibleBlocksAfter', this.nbVisibleBlocksAfter);
      this.carouselWrapperStyle = {
        width: `${this.containerWidth}px`,
        height: `${this.containerHeight}px`
      };
  }
  ngOnInit(): void {
    console.log('OnInit this.items.length', this.items?.length);
  }

  ngAfterViewInit() {
    this.carousel.nativeElement.style['padding-top'] = `${(this.containerHeight - this.itemWidth)}px`;
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
    console.log(`current slide ${this.currentSlide} block : (${this.itemsElements.length > 0 ? this.itemsDirectives.toArray()[this.currentSlide].itemId : '-'})`);
    for (let i = 0; i < this.itemsElements.length; i++) {
      // console.log(`element ${i}, item:${this.itemsDirectives.toArray()[i].itemId}`);
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
      // console.log(`i=${i}, translateX=${translateX}, scale=${scale}`);

      animation = this.builder.build([
        animate(this.timing, style({ transform: `scale(${scale}) translateX(${translateX}px)` }))]);
      const player = animation.create(this.itemsElements.toArray()[i].nativeElement.firstChild);
      player.play();

    }

  }

  next(onDone?: () => void) {
    let backToBeginning = false;
    if ( this.position === this.items.length ) {
      backToBeginning = true;

    }

    console.log(`next currentslide:${this.currentSlide}`);
    this.position = (this.position + 1 ) % this.items.length;
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
    this.step.emit(this.position);
  }

  computeOffset() {
    return this.currentSlide * this.itemWidth - this.offsetBefore;
  }

  translate(duration, offset, onDone?) {
    // console.log(`translate(${offset})`);
    const animation = this.builder.build([
      animate(duration, style({ transform: `translateX(-${offset}px)` }))]);
    const player = animation.create(this.carousel.nativeElement);
    if (onDone) {
      player.onDone(onDone);
    }
    player.play();
  }

  prev() {
    if ( this.position === 0 ) {
      this.position = this.items.length - 1;
    } else {
      this.position = this.position - 1;
    }
    const offset = this.currentSlide * this.itemWidth;
    this.updateSizes();
    const myAnimation: AnimationFactory = this.buildAnimation(offset);
    this.player = myAnimation.create(this.carousel.nativeElement);
    this.player.play();
    this.step.emit(this.itemsDirectives.toArray()[this.currentSlide].itemId);
  }

  onNextDone = (onDone?: (position: number) => void) => {
    if (this.targetSlide !== this.currentSlide) {
      this.next(() => this.onNextDone(onDone));
    } else {
      if (onDone) {
        onDone(this.position);
      }
    }
  }

  goto(position: number, onDone?: (position: number) => void) {
    this.targetSlide = this.nbVisibleBlocksBefore + position;
    console.log(`goto(${position}) current slide:${this.currentSlide} --> target slide:${this.targetSlide}`);
    this.onNextDone(onDone);

  }

  setCurrentPosition(position: number) {
    this.position = position;
    this.updateSizes();
    const offset = this.currentSlide * this.itemWidth;
    this.translate(0, offset);
  }

  getBlockIdBefore(idx) {
    return idx + this.items.length - this.nbVisibleBlocksBefore;
  }

  getBlockIdAfter(idx) {
    return idx;
  }


}

