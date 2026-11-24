import { Module } from '@nestjs/common';
import { JourneyService } from './journey.service.js';
import { MeController } from './me.controller.js';
import { UsersService } from './users.service.js';

@Module({
  controllers: [MeController],
  providers: [UsersService, JourneyService],
  exports: [UsersService],
})
export class UsersModule {}
