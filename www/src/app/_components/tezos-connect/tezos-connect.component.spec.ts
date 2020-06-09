import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TezosConnectComponent } from './tezos-connect.component';

describe('TezosConnectComponent', () => {
  let component: TezosConnectComponent;
  let fixture: ComponentFixture<TezosConnectComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TezosConnectComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TezosConnectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
