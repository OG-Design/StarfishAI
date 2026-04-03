import { Test, TestingModule } from '@nestjs/testing';
import { FilestorageController } from './filestorage.controller';

describe('FilestorageController', () => {
  let controller: FilestorageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilestorageController],
    }).compile();

    controller = module.get<FilestorageController>(FilestorageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
