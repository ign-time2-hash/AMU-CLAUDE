import { UserRole } from '@amu/db';

declare global {
  namespace Express {
    interface Request {
      actor?: {
        username: string;
        name: string;
        role: UserRole;
      };
    }
  }
}

export {};
