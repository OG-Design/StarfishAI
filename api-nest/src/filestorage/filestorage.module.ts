import { Module } from '@nestjs/common';
import { FilestorageService } from './filestorage.service';
import { FilestorageController } from './filestorage.controller';

@Module({
  providers: [FilestorageService],
  controllers: [FilestorageController],
  exports: [FilestorageService]
})
export class FilestorageModule {}
