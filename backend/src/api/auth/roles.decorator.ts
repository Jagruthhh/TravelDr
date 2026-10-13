import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../domain';

export const ROLES_KEY = 'roles';

/**
 * Decorator attaching required role permissions to routes/controllers.
 * Example: @Roles(UserRole.ADMIN, UserRole.HELPLINE_AGENT)
 */
export const Roles = (...roles: (UserRole | string)[]) =>
  SetMetadata(ROLES_KEY, roles);
