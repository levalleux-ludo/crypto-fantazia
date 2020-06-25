import { Component, OnInit, Input, Output, EventEmitter, ViewChild, AfterViewInit } from '@angular/core';
import { CarouselComponent } from '../carousel/carousel.component';

@Component({
  selector: 'app-choose-avatar',
  templateUrl: './choose-avatar.component.html',
  styleUrls: ['./choose-avatar.component.scss']
})
export class ChooseAvatarComponent implements OnInit, AfterViewInit {

  avatars = [
    'camel',
    'rocket',
    'diamond',
    'crypto-chip',
    'nobody'
  ];

  @ViewChild('carousel', {static: false})
  carousel: CarouselComponent;

  _selectedAvatar = 'nobody';
  @Input()
  get selectedAvatar() {
    return this._selectedAvatar;
  }
  set selectedAvatar(value: string) {
    this._selectedAvatar = value;
    this.carousel?.setCurrentPosition(this.avatars.indexOf(this._selectedAvatar));
    this.selectedAvatarChange.emit(this._selectedAvatar);
  }
  @Output()
  selectedAvatarChange = new EventEmitter<string>();

  constructor() { }
  ngAfterViewInit(): void {
    this.carousel.setCurrentPosition(this.avatars.indexOf(this._selectedAvatar));
  }

  ngOnInit(): void {

  }

}
