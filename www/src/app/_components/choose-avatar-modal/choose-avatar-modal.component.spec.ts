import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ChooseAvatarModalComponent } from './choose-avatar-modal.component';

describe('ChooseAvatarModalComponent', () => {
  let component: ChooseAvatarModalComponent;
  let fixture: ComponentFixture<ChooseAvatarModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ChooseAvatarModalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChooseAvatarModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
