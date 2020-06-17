import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SpaceDetailsModalComponent } from './space-details-modal.component';

describe('SpaceDetailsModalComponent', () => {
  let component: SpaceDetailsModalComponent;
  let fixture: ComponentFixture<SpaceDetailsModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SpaceDetailsModalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SpaceDetailsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
