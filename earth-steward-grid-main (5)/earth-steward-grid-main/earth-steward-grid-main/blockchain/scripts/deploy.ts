import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log("=========================================");
  console.log("  CarbonCertificate NFT Deployment");
  console.log("=========================================");
  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Deployer wallet has 0 ETH. Please fund it with Sepolia ETH first.");
  }

  // Deploy the ERC-721 NFT contract
  const CarbonCertificate = await ethers.getContractFactory("CarbonCertificate");
  console.log("\nDeploying CarbonCertificate (ERC-721 NFT)...");
  const contract = await CarbonCertificate.deploy();
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("\n✅ CarbonCertificate deployed to:", address);
  console.log("\n=========================================");
  console.log("  Next Steps:");
  console.log("=========================================");
  console.log("1. Update backend/.env:");
  console.log("   NFT_CONTRACT_ADDRESS=" + address);
  console.log("2. Update frontend src/services/wallet.ts:");
  console.log("   NFT_CONTRACT_ADDRESS =", `'${address}'`);
  console.log("3. Verify on Etherscan (optional):");
  console.log("   npx hardhat verify --network sepolia", address);
  console.log("4. View on Etherscan:");
  console.log("   https://sepolia.etherscan.io/address/" + address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
