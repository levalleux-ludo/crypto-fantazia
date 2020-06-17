import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerTreenodeComponent } from './player-treenode.component';

describe('PlayerTreenodeComponent', () => {
  let component: PlayerTreenodeComponent;
  let fixture: ComponentFixture<PlayerTreenodeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PlayerTreenodeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PlayerTreenodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
