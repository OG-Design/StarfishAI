import { Test, TestingModule } from '@nestjs/testing';
import { ChateventGateway } from './chatevent.gateway';

describe('ChateventGateway', () => {
  let gateway: ChateventGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChateventGateway],
    }).compile();

    gateway = module.get<ChateventGateway>(ChateventGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
