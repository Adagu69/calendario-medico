import { SGHUser } from './sgh-types';

declare global {
  namespace Express {
    export interface Request {
      user?: SGHUser;
    }
  }
}