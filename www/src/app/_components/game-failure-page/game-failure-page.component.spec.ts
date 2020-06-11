import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GameFailurePageComponent } from './game-failure-page.component';

describe('GameFailurePageComponent', () => {
  let component: GameFailurePageComponent;
  let fixture: ComponentFixture<GameFailurePageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GameFailurePageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GameFailurePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
