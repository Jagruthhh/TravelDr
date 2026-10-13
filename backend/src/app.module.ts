/**
 * Root application module.
 * Imports the ApiModule which groups all HTTP-facing controllers.
 */
import { Module } from '@nestjs/common';
import { ApiModule } from './api/api.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { ServicesModule } from './services/services.module';

@Module({
  imports: [ApiModule, RepositoriesModule, ServicesModule],
})
export class AppModule {}
