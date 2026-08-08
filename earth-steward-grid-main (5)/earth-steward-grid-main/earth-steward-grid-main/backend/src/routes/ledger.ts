import { Router } from 'express';
import * as ledgerController from '../controllers/ledger.controller';

const router = Router();
router.get('/', ledgerController.getLedger);
router.get('/total', ledgerController.getTotal);
router.get('/public-stats', ledgerController.getPublicStats); // New endpoint for PublicCounter
router.get('/validate-chain', ledgerController.validateChainEndpoint);
router.get('/block/:blockIndex', ledgerController.getBlock);

export default router;
