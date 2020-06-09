import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FantaSymbolComponent } from './fanta-symbol.component';

describe('FantaSymbolComponent', () => {
  let component: FantaSymbolComponent;
  let fixture: ComponentFixture<FantaSymbolComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FantaSymbolComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FantaSymbolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
