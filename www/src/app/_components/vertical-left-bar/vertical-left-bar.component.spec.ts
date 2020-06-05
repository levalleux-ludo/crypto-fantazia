import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VerticalLeftBarComponent } from './vertical-left-bar.component';

describe('VerticalLeftBarComponent', () => {
  let component: VerticalLeftBarComponent;
  let fixture: ComponentFixture<VerticalLeftBarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VerticalLeftBarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VerticalLeftBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
