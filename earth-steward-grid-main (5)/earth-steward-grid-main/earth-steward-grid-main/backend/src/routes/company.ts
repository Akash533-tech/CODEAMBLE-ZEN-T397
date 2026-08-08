import { Router } from 'express';
import * as companyController from '../controllers/company.controller';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT, requireRole('company'));

router.get('/dashboard', companyController.getDashboard);
router.get('/dashboard/chart/purchases', companyController.getPurchaseChart);
router.get('/dashboard/chart/breakdown', companyController.getBreakdownChart);
router.get('/requests', companyController.getRequests);
router.get('/requests/:requestId', companyController.getRequestDetail);
router.get('/certificates', companyController.getCertificates);
router.get('/certificates/:certId', companyController.getCertificateDetail);
router.get('/certificates/:certId/download', companyController.downloadCertificate);
router.get('/certificates/:certId/verify', companyController.verifyCertificate);
router.post('/certificates/:certId/mint-nft', companyController.mintNFT);
router.get('/certificates/:certId/nft-status', companyController.getNFTStatus);
router.get('/transactions', companyController.getTransactions);
router.get('/transactions/export', companyController.exportTransactions);

export default router;
