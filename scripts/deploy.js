const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy InvoiceNFT
  const InvoiceNFT = await hre.ethers.getContractFactory("InvoiceNFT");
  const invoiceNFT = await InvoiceNFT.deploy();
  await invoiceNFT.deployed();
  console.log("InvoiceNFT deployed to:", invoiceNFT.address);

  // Deploy RiskOracle
  const RiskOracle = await hre.ethers.getContractFactory("RiskOracle");
  const riskOracle = await RiskOracle.deploy();
  await riskOracle.deployed();
  console.log("RiskOracle deployed to:", riskOracle.address);

  // Deploy InvoiceFinancing
  const InvoiceFinancing = await hre.ethers.getContractFactory("InvoiceFinancing");
  const invoiceFinancing = await InvoiceFinancing.deploy(invoiceNFT.address);
  await invoiceFinancing.deployed();
  console.log("InvoiceFinancing deployed to:", invoiceFinancing.address);

  // Save contract addresses to a file for frontend use
  const fs = require("fs");
  const addresses = {
    invoiceNFT: invoiceNFT.address,
    riskOracle: riskOracle.address,
    invoiceFinancing: invoiceFinancing.address,
    network: "localhost"
  };

  fs.writeFileSync(
    "./frontend/contract-addresses.json",
    JSON.stringify(addresses, null, 2)
  );

  console.log("Contract addresses saved to frontend/contract-addresses.json");

  // Transfer ownership of InvoiceNFT to InvoiceFinancing for auto-financing marking
  // (Optional - if you want the financing contract to automatically mark invoices as financed)
  console.log("Setup completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });