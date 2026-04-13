import { Test, TestingModule } from '@nestjs/testing';
import { SitesettingsService } from './sitesettings.service';

describe('SitesettingsService', () => {
  let service: SitesettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SitesettingsService],
    }).compile();

    service = module.get<SitesettingsService>(SitesettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
