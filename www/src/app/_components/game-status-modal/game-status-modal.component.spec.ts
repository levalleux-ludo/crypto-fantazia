import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GameStatusModalComponent } from './game-status-modal.component';

describe('GameStatusModalComponent', () => {
  let component: GameStatusModalComponent;
  let fixture: ComponentFixture<GameStatusModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GameStatusModalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GameStatusModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
