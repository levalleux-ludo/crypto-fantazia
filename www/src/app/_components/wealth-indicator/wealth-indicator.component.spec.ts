import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WealthIndicatorComponent } from './wealth-indicator.component';

describe('WealthIndicatorComponent', () => {
  let component: WealthIndicatorComponent;
  let fixture: ComponentFixture<WealthIndicatorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WealthIndicatorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WealthIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
