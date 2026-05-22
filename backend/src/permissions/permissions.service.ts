import { ForbiddenException, Injectable } from '@nestjs/common';

type Role = 'ADMIN' | 'MEMBER';
type Permission = 'canConnectApps' | 'canRunReadActions' | 'canRunWriteActions' | 'canDeleteData' | 'canManageTools';

const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: ['canConnectApps', 'canRunReadActions', 'canRunWriteActions', 'canDeleteData', 'canManageTools'],
  MEMBER: ['canRunReadActions'],
};

@Injectable()
export class PermissionsService {
  assert(role: Role | undefined, permission: Permission) {
    if (!role || !rolePermissions[role]?.includes(permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }
  }
}
