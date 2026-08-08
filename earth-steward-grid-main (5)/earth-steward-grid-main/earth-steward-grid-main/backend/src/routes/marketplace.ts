import { Router } from 'express';
import * as marketplaceController from '../controllers/marketplace.controller';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { uploadSingle } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { MarketplaceQuerySchema } from '../types';

const router = Router();

router.get('/listings', validate(MarketplaceQuerySchema, 'query'), marketplaceController.getListings);
router.get('/listings/:landId', marketplaceController.getListingDetail);
router.get('/listings/:landId/price-calculate', marketplaceController.calculatePrice);
router.post('/request', authenticateJWT, requireRole('company'), uploadSingle('authorization_letter'), marketplaceController.submitRequest);

export default router;
