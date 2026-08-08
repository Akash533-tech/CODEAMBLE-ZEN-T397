import { Router } from 'express';
import * as chatbotController from '../controllers/chatbot.controller';

const router = Router();
router.post('/session', chatbotController.createSession);
router.post('/message', chatbotController.sendMessage);
router.get('/faqs', chatbotController.getFaqs);
export default router;
