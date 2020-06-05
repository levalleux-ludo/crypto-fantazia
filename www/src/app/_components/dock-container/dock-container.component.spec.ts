import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DockContainerComponent } from './dock-container.component';

describe('DockContainerComponent', () => {
  let component: DockContainerComponent;
  let fixture: ComponentFixture<DockContainerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DockContainerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DockContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
