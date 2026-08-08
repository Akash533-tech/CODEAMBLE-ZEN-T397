# 🌍 Earth Steward Grid

> **Decentralized Carbon Credit & Compliance Platform**  
> An end-to-end government carbon credit registry, compliance auditing tool, marketplace, and Web3 NFT certificate issuing system.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
  - [🏛️ Government & Regulator Portal](#️-government--regulator-portal)
  - [🏢 Enterprise Company Portal](#-enterprise-company-portal)
  - [🛒 Carbon Marketplace](#-carbon-marketplace)
  - [🔗 Blockchain & Web3 Integration](#-blockchain--web3-integration)
  - [💳 Payment Gateway & AI Assistant](#-payment-gateway--ai-assistant)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Prerequisites](#-prerequisites)
- [Environment Setup](#-environment-setup)
- [Installation & Running Locally](#-installation--running-locally)
  - [1. Database Setup](#1-database-setup)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
  - [4. Blockchain Setup (Optional / Smart Contract Deployment)](#4-blockchain-setup-optional--smart-contract-deployment)
- [API Reference](#-api-reference)
- [Smart Contracts](#-smart-contracts)
- [Contributing & License](#-contributing--license)

---

## 🌿 Overview

**Earth Steward Grid** is a modern carbon market ecosystem designed to eliminate double-counting, enhance transparency, and accelerate carbon compliance for enterprises and government authorities.

By combining an **off-chain high-performance PostgreSQL hash-chain ledger**, **on-chain ERC-721 NFT minting on Sepolia Ethereum testnet**, **Razorpay fiat payment processing**, and an **OpenAI-powered AI Compliance Assistant**, Earth Steward Grid offers a unified platform for managing emission allowances, carbon credit issuance, trading, and verification.

---

## ✨ Key Features

### 🏛️ Government & Regulator Portal
* **Carbon Allowance Issuance**: Allocate verified carbon credit caps to registered enterprise entities.
* **Verification & Approval Engine**: Review compliance requests, audit attached environmental impact documents, and approve/reject issuance requests.
* **Immutable Audit Ledger**: Inspect real-time cryptographic hash-chain blocks verifying every credit minting, transfer, and retirement event.
* **Public Compliance Counter**: Live metrics on total CO₂ offset, active credits, and participating enterprises.

### 🏢 Enterprise Company Portal
* **Real-time Portfolio Analytics**: Dashboard displaying active credit balance, retired credits, pending verification requests, and compliance rating.
* **Credit Retirement**: Permanently retire credits to offset carbon footprint with verifiable proof.
* **Document & IPFS Storage**: Upload verification documents backed by Pinata IPFS metadata storage.
* **NFT Certificate Generation**: Automatically receive on-chain Web3 NFT certificates upon verified credit retirement/issuance.

### 🛒 Carbon Marketplace
* **Peer-to-Peer & Market Listings**: Companies can list excess carbon credits for sale at dynamic pricing per metric ton ($/tCO₂e).
* **Instant Purchase & Transfer**: Seamlessly purchase listed carbon credits with automated balance updates and ledger synchronization.

### 🔗 Blockchain & Web3 Integration
* **Solidity ERC-721 Smart Contract**: Deployed on Sepolia Ethereum testnet (`CarbonCertificate.sol`).
* **Cryptographic Block Ledger**: Off-chain block ledger with SHA-256 genesis-to-tip hash linking to prevent tampering.
* **Pinata IPFS Metadata**: Decentralized storage for certificate metadata, images, and audit trail attributes.

### 💳 Payment Gateway & AI Assistant
* **Razorpay Integration**: Native payment gateway integration supporting orders, verification signatures, and secure webhooks.
* **AI Policy Assistant**: Integrated OpenAI chatbot providing real-time answers regarding carbon compliance guidelines, trading policies, and platform usage.

---

## 🏗️ System Architecture

```
                               ┌───────────────────────────┐
                               │     React 18 Frontend     │
                               │ (Vite + Tailwind + UI)    │
                               └─────────────┬─────────────┘
                                             │ HTTP / REST APIs
                                             ▼
                               ┌───────────────────────────┐
                               │   Express TypeScript API  │
                               │     (Node.js Backend)     │
                               └──────┬──────┬──────┬──────┘
                                      │      │      │
             ┌────────────────────────┘      │      └────────────────────────┐
             ▼                               ▼                               ▼
  ┌────────────────────┐          ┌────────────────────┐          ┌────────────────────┐
  │ PostgreSQL Database│          │  Sepolia Ethereum  │          │    External APIs   │
  │ (Hash Chain Ledger)│          │ (ERC-721 NFT Smart │          │ (Razorpay, OpenAI, │
  └────────────────────┘          │     Contract)      │          │    Pinata IPFS)    │
                                  └────────────────────┘          └────────────────────┘
```

---

## 🛠️ Tech Stack

### **Frontend**
* **Framework**: React 18, Vite, TypeScript
* **Styling**: Tailwind CSS, Radix UI (shadcn/ui design system), Lucide Icons
* **State & Query**: Zustand, TanStack React Query v5
* **Web3 & Charts**: Ethers.js v6, Recharts

### **Backend**
* **Runtime**: Node.js, Express, TypeScript (`ts-node-dev`)
* **Database**: PostgreSQL (`pg` pool connection)
* **Security & Auth**: JWT authentication with refresh tokens, Helmet, CORS, Express Rate Limiter, Zod validation
* **Integrations**: Ethers.js v6, Razorpay SDK, OpenAI API, Pinata IPFS SDK, Node Cron

### **Blockchain**
* **Smart Contract Language**: Solidity `0.8.24` (EVM Cancun / OpenZeppelin v5)
* **Framework**: Hardhat, Ethers.js, TypeChain
* **Network**: Ethereum Sepolia Testnet

---

## 📂 Project Directory Structure

```
earth-steward-grid/
├── backend/                       # Express + TypeScript REST API Server
│   ├── src/
│   │   ├── controllers/           # Auth, Company, Gov, Marketplace, Payment, Ledger, Chatbot
│   │   ├── db/                    # PostgreSQL migrations, schema, seed data, connection pool
│   │   ├── jobs/                  # Background Cron jobs (e.g. daily certificate expiry check)
│   │   ├── middleware/            # Rate limiting, JWT authentication, Zod validation
│   │   ├── routes/                # REST API route endpoints
│   │   ├── services/              # Hash-chain integrity, Sepolia NFT minting, Pinata IPFS
│   │   └── index.ts               # Server entry point
│   ├── .env.example               # Backend environment variables template
│   └── package.json
├── blockchain/                    # Hardhat environment & Web3 Smart Contracts
│   ├── contracts/                 # CarbonCertificate.sol (ERC-721 contract)
│   ├── scripts/                   # Deployment and testing scripts
│   ├── hardhat.config.ts          # Hardhat configuration (Solidity compiler & Sepolia network)
│   └── package.json
├── src/                           # React Frontend (Vite)
│   ├── components/                # Reusable UI components (Navbar, Modals, Cards, Charts)
│   ├── pages/                     # Application pages
│   │   ├── company/               # Company Dashboard, Marketplace, Certificates, Transactions
│   │   ├── gov/                   # Government Portal, Requests, Ledger Audit, Compliance
│   │   ├── LandingPage.tsx        # Hero landing page
│   │   └── PublicCounter.tsx      # Public transparent carbon metrics
│   ├── services/                  # API client services
│   ├── stores/                    # Zustand global state management
│   ├── App.tsx                    # Main router setup
│   └── main.tsx                   # React app entrypoint
├── package.json                   # Root/Frontend package.json
└── README.md                      # Project documentation
```

---

## ⚙️ Prerequisites

Before installing and running the project, ensure you have the following installed on your machine:

* **Node.js**: `v18.0.0` or higher
* **npm** or **bun** / **yarn**
* **PostgreSQL**: `v14.0` or higher (running locally or accessible via URL)

---

## 🔑 Environment Setup

### 1. Backend Environment Variables (`backend/.env`)

Create a `.env` file in the `backend/` directory with the following variables:

```env
PORT=4000
DATABASE_URL=postgres://postgres:password@127.0.0.1:5432/carbon_market

JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key

# Razorpay Config
RAZORPAY_KEY_ID=rzp_test_YourKeyId
RAZORPAY_KEY_SECRET=rzp_test_YourKeySecret

# OpenAI API Key (For AI Assistant)
OPENAI_API_KEY=your_openai_api_key

# Frontend URL (CORS Configuration)
FRONTEND_URL=http://localhost:5173

# Ethereum Sepolia Testnet Config
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
ETH_PRIVATE_KEY=your_wallet_private_key
CONTRACT_ADDRESS=0xBb30a555d41dD89677A38F65Dc39864530793D9c
NFT_CONTRACT_ADDRESS=0x33D705189436f5dF9C43Afe3366ECf36Af973db0

# Pinata IPFS JWT Token (Optional - falls back to Base64 data URI if empty)
PINATA_JWT=your_pinata_jwt_token
```

### 2. Blockchain Environment Variables (`blockchain/.env`)

Create a `.env` file in the `blockchain/` directory:

```env
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
ETH_PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

---

## 🚀 Installation & Running Locally

### 1. Database Setup

Ensure PostgreSQL is running and create the database:

```bash
createdb carbon_market
```

Run database migrations to initialize tables:

```bash
cd backend
npm run migrate
```

*(Optional) Seed sample data:*
```bash
npm run seed
```

---

### 2. Backend Setup

From the root directory:

```bash
cd backend
npm install
npm run dev
```

The backend API server will start on **http://localhost:4000**.  
Verify health by visiting **http://localhost:4000/api/health**.

---

### 3. Frontend Setup

From the root directory:

```bash
# In the root folder
npm install
npm run dev
```

The frontend Vite server will start on **http://localhost:5173** (or port `5174`).

---

### 4. Blockchain Setup (Optional / Smart Contract Deployment)

To compile and deploy the `CarbonCertificate.sol` contract to Sepolia:

```bash
cd blockchain
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network sepolia
```

Update the deployed contract address in your `backend/.env` file under `NFT_CONTRACT_ADDRESS`.

---

## 📡 API Reference

Here is a summary of the core REST API endpoints:

| Endpoint | Method | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `/api/auth/register` | `POST` | Register new enterprise/company | ❌ |
| `/api/auth/login` | `POST` | Authenticate user & obtain JWT tokens | ❌ |
| `/api/company/profile` | `GET` | Get current company profile & metrics | ✅ |
| `/api/company/request-credits` | `POST` | Submit credit verification request to gov | ✅ |
| `/api/company/retire-credits` | `POST` | Retire carbon credits and mint NFT certificate | ✅ |
| `/api/marketplace/listings` | `GET` | Fetch active carbon credit market listings | ❌ |
| `/api/marketplace/buy` | `POST` | Purchase listed carbon credits | ✅ |
| `/api/gov/requests` | `GET` | View pending company credit issuance requests | ✅ (Gov) |
| `/api/gov/approve-request` | `POST` | Approve credit request & mint credits | ✅ (Gov) |
| `/api/ledger/blocks` | `GET` | Retrieve block ledger chain audit data | ❌ |
| `/api/ledger/verify` | `GET` | Validate block hash-chain cryptographic integrity | ❌ |
| `/api/payment/create-order` | `POST` | Generate Razorpay payment order | ✅ |
| `/api/chatbot/query` | `POST` | Ask OpenAI AI Policy Assistant | ❌ |

---

## 📜 Smart Contracts

The project utilizes `CarbonCertificate.sol` located at `blockchain/contracts/CarbonCertificate.sol`.

* **Standard**: ERC-721 (Non-Fungible Token)
* **Metadata**: Dynamic token URI containing Pinata IPFS hash pointing to carbon credit metrics, issuer signature, tons offset, and timestamp.
* **Network**: Ethereum Sepolia Testnet

---

## 🤝 Contributing & License

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Distributed under the MIT License. See `LICENSE` for more information.
