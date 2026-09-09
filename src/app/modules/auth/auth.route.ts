import { Role } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import validateRequest from '../../middlewares/validateRequest.js';
import { AuthValidation } from './auth.validation.js';
import auth from '../../middlewares/auth.middleware.js';
import { AuthController } from './auth.controller.js';

const ALL_ROLES = [Role.ADMIN, Role.LEARNER];

async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/login',
    { preHandler: [validateRequest(AuthValidation.login)] },
    AuthController.loginUser
  );

  fastify.post('/refresh-token', AuthController.refreshToken);

  fastify.post(
    '/change-password',
    {
      preHandler: [auth(...ALL_ROLES), validateRequest(AuthValidation.changePassword)],
    },
    AuthController.changePassword
  );

  fastify.get('/me', { preHandler: [auth(...ALL_ROLES)] }, AuthController.getMe);

  fastify.post('/logout', AuthController.logout);
}

export default authRoutes;