import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ChooseSessionDialogComponent } from './choose-session-dialog.component';

describe('ChooseSessionDialogComponent', () => {
  let component: ChooseSessionDialogComponent;
  let fixture: ComponentFixture<ChooseSessionDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ChooseSessionDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChooseSessionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
