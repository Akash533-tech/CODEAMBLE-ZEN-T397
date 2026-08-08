# 🌿 Carbon Ecosystem Platform

> **Comprehensive Carbon Measurement, Verification, Compliance, and Trading Solutions**  
> This repository hosts two complementary projects: **CarbonTrace** (MRV & Blockchain Verification) and **Earth Steward Grid** (Government Compliance, Marketplace & NFT Issuance).

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Repository Projects](#-repository-projects)
  - [1. 🌍 CarbonTrace Platform](#1--carbontrace-platform)
  - [2. 🍃 Earth Steward Grid Platform](#2--earth-steward-grid-platform)
- [Directory Structure](#-directory-structure)
- [Prerequisites](#-prerequisites)
- [Quick Start Guide](#-quick-start-guide)
  - [Running CarbonTrace](#running-carbontrace)
  - [Running Earth Steward Grid](#running-earth-steward-grid)
- [License](#-license)

---

## 🌿 Overview

The **Carbon Ecosystem Platform** combines transparent off-chain cryptographic hash-chains, on-chain Ethereum Sepolia Web3 NFT certificate minting, satellite-based MRV analytics, and enterprise compliance tools into a unified repository.

Key capabilities include:
- **MRV & Satellite Land Verification**: Land registry tracking, ISRO Bhuvan API integration, and sequestration metrics.
- **Government Compliance Auditing**: Credit request approvals, company allowance capping, and public compliance counters.
- **Enterprise & Peer-to-Peer Marketplace**: Dynamic listing and trading of metric tons of $tCO_2e$ credits.
- **Blockchain NFT Certificates**: Minting ERC-721 certificates backed by Pinata IPFS metadata storage.
- **Fiat Payments & AI Assistant**: Integrated Razorpay payment gateway and AI policy assistant.

---

## 📂 Repository Projects

### 1. 🌍 CarbonTrace Platform (`./CarbonTrace-main`)

**CarbonTrace** is an end-to-end MRV (Measurement, Reporting, and Verification) system designed to track afforestation projects, calculate biomass sequestration, and register verified land parcels on Ethereum Sepolia smart contracts.

#### Tech Stack & Components:
* **Backend**: Node.js, Express, PostgreSQL, Ethers.js, Pinata IPFS
* **Frontend**: React 18, Vite, Tailwind CSS, Recharts, Leaflet maps
* **Smart Contracts**: `LandRegistry.sol`, `CarbonCreditManager.sol` on Sepolia Testnet
* **Containerization**: Docker & Docker Compose setup included

---

### 2. 🍃 Earth Steward Grid Platform (`./earth-steward-grid-main (5)/earth-steward-grid-main/earth-steward-grid-main`)

**Earth Steward Grid** is a modern government carbon registry, enterprise compliance dashboard, and Web3 certificate issuing system.

#### Key Features:
* **Government Portal**: Carbon allowance caps, audit requests, and hash-chain ledger verification.
* **Enterprise Portal**: Portfolio analytics, carbon credit retirement, and NFT certificate generation.
* **Carbon Marketplace**: Peer-to-peer credit trading and purchasing with Razorpay payment processing.
* **AI Compliance Assistant**: OpenAI/HuggingFace powered AI policy chatbot.
* **Smart Contracts**: Hardhat environment with `CarbonCertificate.sol` (ERC-721).

---

## 📁 Directory Structure

```
.
├── README.md                              # Main workspace documentation
├── CarbonTrace-main/                      # CarbonTrace MRV & Land Registry project
│   ├── backend/                           # Express REST API & Database migrations
│   ├── website-a/                         # React Vite Frontend application
│   ├── contracts/                         # Hardhat Smart Contracts (LandRegistry, CarbonCreditManager)
│   └── docker-compose.yml                 # Docker service orchestration
└── earth-steward-grid-main (5)/           # Earth Steward Grid Compliance & Trading platform
    └── earth-steward-grid-main/
        └── earth-steward-grid-main/
            ├── backend/                   # Express + TypeScript REST API Server
            ├── blockchain/                # Hardhat ERC-721 Smart Contracts
            └── src/                       # React + TypeScript Vite Frontend
```

---

## ⚙️ Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm** / **yarn** / **bun**
- **PostgreSQL**: `v14.0` or higher
- **Git**

---

## 🚀 Quick Start Guide

### Running CarbonTrace

```bash
cd CarbonTrace-main

# Start backend
cd backend
npm install
npm run dev

# Start frontend (in a new terminal)
cd ../website-a
npm install
npm run dev
```

---

### Running Earth Steward Grid

```bash
cd "earth-steward-grid-main (5)/earth-steward-grid-main/earth-steward-grid-main"

# Start backend server
cd backend
npm install
npm run migrate
npm run dev

# Start frontend application (in a new terminal)
cd ..
npm install
npm run dev
```

---

## 📜 License

Distributed under the MIT License.
