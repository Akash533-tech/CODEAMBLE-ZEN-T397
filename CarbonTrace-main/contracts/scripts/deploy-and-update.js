#!/usr/bin/env node
/**
 * CarbonTrace — Smart Contract Deploy + Auto-Update Script
 *
 * USAGE:
 *   DEPLOYER_PRIVATE_KEY=0x<your_funded_key> node deploy-and-update.js
 *
 * This script:
 *   1. Deploys LandRegistry + CarbonCreditManager to Sepolia
 *   2. Automatically updates all .env files with the new addresses
 *   3. Shows Etherscan links for both contracts
 *
 * Prerequisites:
 *   - Node.js installed
 *   - Sepolia ETH in your wallet (get from https://sepoliafaucet.com)
 *   - DEPLOYER_PRIVATE_KEY env var set (0x prefixed 32-byte hex key)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONTRACTS_DIR = __dirname;

// ─── Run Deploy ───────────────────────────────────────────────────────────────
console.log('🚀 CarbonTrace — Deploying to Sepolia...\n');

const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
if (!privateKey || privateKey === '0x0000000000000000000000000000000000000000000000000000000000000001') {
  console.error('❌ ERROR: Set DEPLOYER_PRIVATE_KEY env var with a funded Sepolia wallet');
  console.error('   Get Sepolia ETH: https://sepoliafaucet.com');
  console.error('   Example: DEPLOYER_PRIVATE_KEY=0x<your_key> node scripts/deploy-and-update.js');
  process.exit(1);
}

let deployOutput;
try {
  deployOutput = execSync(
    `DEPLOYER_PRIVATE_KEY="${privateKey}" SEPOLIA_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com" ./node_modules/.bin/hardhat run scripts/deploy.js --network sepolia`,
    { cwd: CONTRACTS_DIR, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
  console.log(deployOutput);
} catch (err) {
  console.error('❌ Deploy failed:', err.stdout || err.message);
  process.exit(1);
}

// ─── Parse addresses from output ─────────────────────────────────────────────
const lrMatch = deployOutput.match(/LAND_REGISTRY_ADDRESS=(\S+)/);
const ccmMatch = deployOutput.match(/CARBON_CREDIT_MANAGER_ADDRESS=(\S+)/);

if (!lrMatch || !ccmMatch) {
  console.error('❌ Could not parse contract addresses from deploy output');
  process.exit(1);
}

const landRegistryAddress = lrMatch[1];
const carbonCreditAddress = ccmMatch[1];

console.log('\n✅ Deployment successful!');
console.log(`   LandRegistry:         ${landRegistryAddress}`);
console.log(`   CarbonCreditManager:  ${carbonCreditAddress}`);
console.log(`\n🔍 Verify on Etherscan:`);
console.log(`   https://sepolia.etherscan.io/address/${landRegistryAddress}`);
console.log(`   https://sepolia.etherscan.io/address/${carbonCreditAddress}`);

// ─── Update .env files ────────────────────────────────────────────────────────

function updateEnvFile(envPath, updates) {
  if (!fs.existsSync(envPath)) {
    console.warn(`⚠️  Not found: ${envPath}`);
    return;
  }
  let content = fs.readFileSync(envPath, 'utf8');
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}\n`;
    }
  }
  fs.writeFileSync(envPath, content);
  console.log(`✅ Updated: ${envPath}`);
}

const contractAddresses = {
  LAND_REGISTRY_ADDRESS: landRegistryAddress,
  CARBON_CREDIT_MANAGER_ADDRESS: carbonCreditAddress,
};

updateEnvFile(path.join(ROOT, '.env'), contractAddresses);
updateEnvFile(path.join(ROOT, 'backend', '.env'), contractAddresses);

// Frontend .env uses VITE_ prefix
updateEnvFile(path.join(ROOT, 'website-a', '.env'), {
  VITE_LAND_REGISTRY_ADDRESS: landRegistryAddress,
  VITE_CARBON_CREDIT_MANAGER_ADDRESS: carbonCreditAddress,
});

console.log('\n🎉 All .env files updated! Restart your servers to apply changes.\n');
