import { Router } from 'express';
import * as govController from '../controllers/gov.controller';
import { authenticateJWT, requireRole, requireOfficerRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { UpdateRequestStatusSchema, BulkUpdateSchema, IssueCertificateSchema, RevokeCertificateSchema, UpdateLandCreditsSchema, CreateLandSchema } from '../types';

const router = Router();
router.use(authenticateJWT, requireRole('officer'));

// Dashboard
router.get('/dashboard', govController.getDashboard);
router.get('/dashboard/chart/trend', govController.getTrendChart);
router.get('/dashboard/chart/revenue', govController.getRevenueChart);
router.get('/dashboard/activity', govController.getActivity);
router.get('/dashboard/alerts', govController.getAlerts);

// Requests
router.get('/requests', govController.getRequests);
router.get('/requests/:requestId', govController.getRequestDetail);
router.patch('/requests/:requestId/status', requireOfficerRole(['admin', 'reviewer']), validate(UpdateRequestStatusSchema), govController.updateRequestStatus);
router.post('/requests/bulk-update', requireOfficerRole(['admin', 'reviewer']), validate(BulkUpdateSchema), govController.bulkUpdateRequests);

// Certificates
router.post('/certificates/issue', requireOfficerRole(['admin', 'reviewer']), validate(IssueCertificateSchema), govController.issueCertificate);
router.get('/certificates', govController.getCertificates);
router.patch('/certificates/:certId/revoke', requireOfficerRole(['admin']), validate(RevokeCertificateSchema), govController.revokeCertificate);

// Land parcels
router.get('/lands', govController.getLands);
router.post('/lands', validate(CreateLandSchema), govController.createLand);
router.patch('/lands/:landId/update-credits', requireOfficerRole(['admin']), validate(UpdateLandCreditsSchema), govController.updateLandCredits);

export default router;
