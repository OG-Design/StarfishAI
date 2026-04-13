import { Test, TestingModule } from '@nestjs/testing';
import { SitesettingsController } from './sitesettings.controller';

describe('SitesettingsController', () => {
  let controller: SitesettingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SitesettingsController],
    }).compile();

    controller = module.get<SitesettingsController>(SitesettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
