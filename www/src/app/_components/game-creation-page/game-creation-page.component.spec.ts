import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GameCreationPageComponent } from './game-creation-page.component';

describe('GameCreationPageComponent', () => {
  let component: GameCreationPageComponent;
  let fixture: ComponentFixture<GameCreationPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GameCreationPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GameCreationPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
