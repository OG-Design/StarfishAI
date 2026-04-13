import { Test, TestingModule } from '@nestjs/testing';
import { Sitesettings } from './sitesettings';

describe('Sitesettings', () => {
  let provider: Sitesettings;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Sitesettings],
    }).compile();

    provider = module.get<Sitesettings>(Sitesettings);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
