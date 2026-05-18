import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { RoleEntity } from './entities/role.entity';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';

/**
 * UserModule — manages user data and profile operations.
 *
 * Exports UserService so AuthModule can use it for auth operations.
 */
@Module({
  imports: [
    // Register UserEntity and RoleEntity repositories for this module scope
    TypeOrmModule.forFeature([UserEntity, RoleEntity]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
