import { Router } from 'express';
import * as notificationsController from '../controllers/notifications.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();
router.use(authenticateJWT);
router.get('/', notificationsController.getNotifications);
router.patch('/:id/read', notificationsController.markRead);
router.patch('/read-all', notificationsController.markAllRead);

export default router;
