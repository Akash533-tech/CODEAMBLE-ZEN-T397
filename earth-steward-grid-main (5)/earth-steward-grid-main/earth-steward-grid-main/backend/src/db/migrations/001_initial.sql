-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMs
DO $$ BEGIN
  CREATE TYPE land_type_enum AS ENUM ('forest', 'agricultural', 'wetland', 'grassland');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE land_status_enum AS ENUM ('active', 'inactive', 'under_review');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE officer_role_enum AS ENUM ('admin', 'reviewer', 'viewer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE request_status_enum AS ENUM ('pending', 'under_review', 'approved', 'rejected', 'payment_pending', 'completed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE cert_status_enum AS ENUM ('active', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE txn_status_enum AS ENUM ('success', 'failed', 'pending', 'refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE ledger_event_enum AS ENUM ('generated', 'issued', 'revoked');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE recipient_type_enum AS ENUM ('company', 'officer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ==================== COMPANIES ====================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cin VARCHAR(21) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  registered_address TEXT,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(15),
  gstin VARCHAR(15),
  pan VARCHAR(10),
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  verification_document_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================== GOVERNMENT OFFICERS ====================
CREATE TABLE IF NOT EXISTS government_officers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  designation VARCHAR(255),
  department VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  role officer_role_enum DEFAULT 'reviewer',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== LAND PARCELS ====================
CREATE TABLE IF NOT EXISTS land_parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  land_id VARCHAR(50) UNIQUE NOT NULL,
  state VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  village VARCHAR(100),
  taluka VARCHAR(100),
  area_hectares DECIMAL(10,2) NOT NULL,
  land_type land_type_enum NOT NULL,
  permitted_species JSONB DEFAULT '[]',
  plantation_guidelines TEXT,
  polygon_coordinates JSONB,
  total_credits_generated INTEGER DEFAULT 0,
  credits_available INTEGER DEFAULT 0,
  credits_issued INTEGER DEFAULT 0,
  ndvi_score DECIMAL(6,4),
  greenery_increase_percent DECIMAL(5,2),
  ndvi_last_checked TIMESTAMP,
  satbara_document_url VARCHAR(500),
  status land_status_enum DEFAULT 'active',
  blockchain_block_id VARCHAR(255),
  price_per_credit DECIMAL(10,2) DEFAULT 750,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================== PURCHASE REQUESTS ====================
CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id VARCHAR(50) UNIQUE NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  land_parcel_id UUID NOT NULL REFERENCES land_parcels(id),
  credits_requested INTEGER NOT NULL,
  duration_years INTEGER NOT NULL,
  intended_use TEXT,
  authorization_letter_url VARCHAR(500),
  status request_status_enum DEFAULT 'pending',
  reviewer_id UUID REFERENCES government_officers(id),
  review_notes TEXT,
  rejection_reason TEXT,
  price_per_credit DECIMAL(10,2),
  total_amount DECIMAL(12,2),
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  payment_status payment_status_enum DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  paid_at TIMESTAMP
);

-- ==================== CERTIFICATES ====================
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id VARCHAR(50) UNIQUE NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id),
  land_parcel_id UUID NOT NULL REFERENCES land_parcels(id),
  credits_issued INTEGER NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  status cert_status_enum DEFAULT 'active',
  pdf_url VARCHAR(500),
  blockchain_tx_hash VARCHAR(255),
  issued_by UUID REFERENCES government_officers(id),
  issued_at TIMESTAMP DEFAULT NOW(),
  qr_code_data VARCHAR(500),
  revocation_reason TEXT
);

-- ==================== TRANSACTIONS ====================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(50) UNIQUE NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  purchase_request_id UUID REFERENCES purchase_requests(id),
  certificate_id UUID REFERENCES certificates(id),
  credits INTEGER NOT NULL,
  amount_inr DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50),
  razorpay_payment_id VARCHAR(255),
  status txn_status_enum DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== CARBON CREDIT LEDGER ====================
CREATE TABLE IF NOT EXISTS carbon_credit_ledger (
  block_index INTEGER PRIMARY KEY,
  block_hash VARCHAR(255) UNIQUE NOT NULL,
  previous_hash VARCHAR(255) NOT NULL,
  land_id VARCHAR(50),
  credits_delta INTEGER NOT NULL,
  event_type ledger_event_enum NOT NULL,
  certificate_id VARCHAR(50),
  company_cin VARCHAR(21),
  timestamp TIMESTAMP NOT NULL,
  nonce INTEGER NOT NULL,
  data JSONB NOT NULL
);

-- ==================== NDVI LOGS ====================
CREATE TABLE IF NOT EXISTS ndvi_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  land_parcel_id UUID NOT NULL REFERENCES land_parcels(id),
  ndvi_score_before DECIMAL(6,4),
  ndvi_score_after DECIMAL(6,4),
  greenery_increase_percent DECIMAL(5,2),
  credits_added INTEGER,
  checked_at TIMESTAMP DEFAULT NOW(),
  calculation_rationale TEXT
);

-- ==================== NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type recipient_type_enum NOT NULL,
  recipient_id UUID NOT NULL,
  type VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== CHATBOT SESSIONS ====================
CREATE TABLE IF NOT EXISTS chatbot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================== REFRESH TOKENS ====================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  user_type VARCHAR(20) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_purchase_requests_company ON purchase_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_certificates_company ON certificates(company_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_ledger_block_index ON carbon_credit_ledger(block_index);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_transactions_company ON transactions(company_id);
