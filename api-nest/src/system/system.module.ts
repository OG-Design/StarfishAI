import { Module, DynamicModule } from '@nestjs/common';
import { SystemService } from './system.service';
import { SystemController } from './system.controller';

export class SystemModule {
  static register(): DynamicModule {
    const usedAsRemote = process.env.USED_AS_REMOTE === 'true';
    return {
      module: SystemModule,
      controllers: usedAsRemote ? [] : [SystemController],
      providers: usedAsRemote ? [] : [SystemService],
      exports: usedAsRemote ? [] : [SystemService],
    };
  }
}
