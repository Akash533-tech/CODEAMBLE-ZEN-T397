import { z } from 'zod';

// ==================== DB ENTITY TYPES ====================

export interface Company {
  id: string;
  cin: string;
  name: string;
  registered_address?: string;
  contact_email: string;
  contact_phone?: string;
  gstin?: string;
  pan?: string;
  is_verified: boolean;
  verification_document_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface GovernmentOfficer {
  id: string;
  officer_id: string;
  name: string;
  designation?: string;
  department?: string;
  role: 'admin' | 'reviewer' | 'viewer';
  created_at: Date;
}

export interface LandParcel {
  id: string;
  land_id: string;
  state: string;
  district: string;
  village?: string;
  taluka?: string;
  area_hectares: number;
  land_type: 'forest' | 'agricultural' | 'wetland' | 'grassland';
  permitted_species: string[];
  plantation_guidelines?: string;
  polygon_coordinates?: any;
  total_credits_generated: number;
  credits_available: number;
  credits_issued: number;
  ndvi_score?: number;
  greenery_increase_percent?: number;
  ndvi_last_checked?: Date;
  satbara_document_url?: string;
  status: 'active' | 'inactive' | 'under_review';
  blockchain_block_id?: string;
  price_per_credit: number;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseRequest {
  id: string;
  request_id: string;
  company_id: string;
  land_parcel_id: string;
  credits_requested: number;
  duration_years: number;
  intended_use?: string;
  authorization_letter_url?: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'payment_pending' | 'payment_verified' | 'completed';
  reviewer_id?: string;
  review_notes?: string;
  rejection_reason?: string;
  price_per_credit?: number;
  total_amount?: number;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  created_at: Date;
  updated_at: Date;
  reviewed_at?: Date;
  paid_at?: Date;
}

export interface Certificate {
  id: string;
  certificate_id: string;
  company_id: string;
  purchase_request_id: string;
  land_parcel_id: string;
  credits_issued: number;
  valid_from: Date;
  valid_to: Date;
  status: 'active' | 'expired' | 'revoked';
  pdf_url?: string;
  blockchain_tx_hash?: string;
  issued_by?: string;
  issued_at: Date;
  qr_code_data?: string;
  revocation_reason?: string;
}

export interface Transaction {
  id: string;
  transaction_id: string;
  company_id: string;
  purchase_request_id?: string;
  certificate_id?: string;
  credits: number;
  amount_inr: number;
  payment_method?: string;
  razorpay_payment_id?: string;
  status: 'success' | 'failed' | 'pending' | 'refunded';
  created_at: Date;
}

export interface LedgerBlock {
  block_index: number;
  block_hash: string;
  previous_hash: string;
  land_id: string;
  credits_delta: number;
  event_type: 'generated' | 'issued' | 'revoked';
  certificate_id?: string;
  company_cin?: string;
  timestamp: Date;
  nonce: number;
  data: any;
}

export interface Notification {
  id: string;
  recipient_type: 'company' | 'officer';
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: any;
  created_at: Date;
}

// ==================== JWT PAYLOAD ====================
export interface JWTPayload {
  id: string;
  type: 'company' | 'officer';
  cin?: string;
  officer_id?: string;
  role?: string;
}

// ==================== ZOD SCHEMAS ====================

export const CompanyRegisterSchema = z.object({
  cin: z.string().min(21).max(21),
  name: z.string().min(2),
  contact_email: z.string().email(),
  contact_phone: z.string().optional(),
  password: z.string().min(8),
  registered_address: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
});

export const CompanyLoginSchema = z.object({
  cin: z.string().min(1),
  password: z.string().min(1),
});

export const GovLoginSchema = z.object({
  officer_id: z.string().min(1),
  password: z.string().min(1),
});

export const RefreshTokenSchema = z.object({
  refresh_token: z.string().min(1),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const MarketplaceQuerySchema = z.object({
  state: z.string().optional(),
  land_type: z.enum(['forest', 'agricultural', 'wetland', 'grassland']).optional(),
  min_credits: z.coerce.number().optional(),
  max_credits: z.coerce.number().optional(),
  min_price: z.coerce.number().optional(),
  max_price: z.coerce.number().optional(),
  duration: z.coerce.number().optional(),
  sort: z.enum(['price_asc', 'price_desc', 'availability', 'area']).optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(9),
  search: z.string().optional(),
});

export const UpdateRequestStatusSchema = z.object({
  status: z.enum(['under_review', 'approved', 'rejected', 'payment_verified', 'completed']),
  notes: z.string().optional(),
  rejection_reason: z.string().optional(),
  price_per_credit: z.number().positive().optional(),
});

export const BulkUpdateSchema = z.object({
  request_ids: z.array(z.string()).min(1),
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
  price_per_credit: z.number().positive().optional(),
});

export const IssueCertificateSchema = z.object({
  purchase_request_id: z.string().uuid(),
  valid_from: z.string(),
  valid_to: z.string(),
});

export const RevokeCertificateSchema = z.object({
  reason: z.string().min(5),
});

export const CreateOrderSchema = z.object({
  purchase_request_id: z.string().min(1), // allow UUID or request_id strings like REQ-2026-XXXXX
});

export const VerifyPaymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export const UpdateLandCreditsSchema = z.object({
  credits_to_add: z.number().int().positive(),
  ndvi_score: z.number().min(0).max(1),
  rationale: z.string().optional(),
});

export const CreateLandSchema = z.object({
  land_id: z.string().min(5),
  state: z.string(),
  district: z.string(),
  village: z.string().optional(),
  taluka: z.string().optional(),
  area_hectares: z.number().positive(),
  land_type: z.enum(['forest', 'agricultural', 'wetland', 'grassland']),
  permitted_species: z.array(z.string()).optional(),
  plantation_guidelines: z.string().optional(),
  price_per_credit: z.number().positive().default(750),
});

export const ChatMessageSchema = z.object({
  session_token: z.string(),
  message: z.string().min(1).max(2000),
});
