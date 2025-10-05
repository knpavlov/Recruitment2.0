import { AuthService } from './auth.service.js';
import { accountsService } from '../accounts/accounts.module.js';
import { AccessCodesRepository } from './accessCodes.repository.js';
import { SessionsRepository } from './sessions.repository.js';

const codesRepository = new AccessCodesRepository();
const sessionsRepository = new SessionsRepository();
export const authService = new AuthService(accountsService, codesRepository, sessionsRepository);
