import { Role } from '../../../common/enums/role.enum';

/**
 * JWT Payload — data encoded inside access tokens.
 * Keep minimal: only IDs and role (no PII like email in access tokens).
 */
export interface JwtPayload {
  /** User's UUID (subject) */
  sub: string;

  /** User's email */
  email: string;

  /** Role for authorization guards */
  role: Role;
}
