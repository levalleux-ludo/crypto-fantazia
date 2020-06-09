import { TestBed } from '@angular/core/testing';

import { TezosService } from './tezos.service';

describe('TezosService', () => {
  let service: TezosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TezosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
