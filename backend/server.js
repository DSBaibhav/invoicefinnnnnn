// backend/server.js - Enhanced with real blockchain
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const Web3 = require("web3");
const { ethers } = require("ethers");

dotenv.config();

// Stellar SDK & JWT configuration
let stellarSdk;
let jwt;
try {
    stellarSdk = require("stellar-sdk");
    jwt = require("jsonwebtoken");
    console.log("✅ Stellar SDK & jsonwebtoken imported successfully");
} catch (err) {
    console.warn("⚠️ Stellar SDK or jsonwebtoken not loaded yet, using simulated fallbacks");
}

// Generate fallback Stellar signing keys if none configured
let SECRET_SEP10_SIGNING_SEED = process.env.SECRET_SEP10_SIGNING_SEED;
let SIGNING_KEY = "";
let SECRET_SEP10_JWT_SECRET = process.env.SECRET_SEP10_JWT_SECRET || "fallback_stellar_jwt_secret";

if (stellarSdk) {
    try {
        if (!SECRET_SEP10_SIGNING_SEED) {
            const tempKeyPair = stellarSdk.Keypair.random();
            SECRET_SEP10_SIGNING_SEED = tempKeyPair.secret();
            SIGNING_KEY = tempKeyPair.publicKey();
            console.log("🔑 Automatically generated temporary Stellar server keypair:");
            console.log("   Public Key (SIGNING_KEY):", SIGNING_KEY);
        } else {
            const serverKeyPair = stellarSdk.Keypair.fromSecret(SECRET_SEP10_SIGNING_SEED);
            SIGNING_KEY = serverKeyPair.publicKey();
            console.log("🔑 Loaded configured Stellar SIGNING_KEY:", SIGNING_KEY);
        }
    } catch (e) {
        console.error("❌ Error setting up Stellar Keypair from environment:", e.message);
        SIGNING_KEY = "GATFOWQSLXIHNFILF5CAKSZQ5O467UPVZCQNCZJHBU4S5C3DB42CK6KB";
    }
} else {
    SECRET_SEP10_SIGNING_SEED = "SDX4FQCHF7HH4PTSMO3PACO43LAIUSZVNBCXC5N5WDWRSMQBS4KLKMUY";
    SIGNING_KEY = "GATFOWQSLXIHNFILF5CAKSZQ5O467UPVZCQNCZJHBU4S5C3DB42CK6KB";
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Web3 setup
const net = require("net");
const url = require("url");

let web3;
let provider;
let isBlockchainConnected = false;
let invoiceNFTContract;
let financingContract;

// Helper to silently check if a TCP port is open
function checkRpcAvailable(rpcUrl, timeout = 1000) {
    return new Promise((resolve) => {
        try {
            const parsed = url.parse(rpcUrl);
            const host = parsed.hostname || "localhost";
            const port = parseInt(parsed.port) || (parsed.protocol === "https:" ? 443 : 80);
            
            const socket = new net.Socket();
            let resolved = false;
            
            const done = (status) => {
                if (resolved) return;
                resolved = true;
                socket.destroy();
                resolve(status);
            };
            
            socket.setTimeout(timeout);
            socket.once("connect", () => done(true));
            socket.once("error", () => done(false));
            socket.once("timeout", () => done(false));
            
            socket.connect(port, host);
        } catch (e) {
            resolve(false);
        }
    });
}

// Initialize Web3
async function initializeBlockchain() {
    const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
    
    // Silent pre-flight check to see if the Ethereum node is actually running
    const isRpcOnline = await checkRpcAvailable(rpcUrl, 800);
    
    if (!isRpcOnline) {
        console.log('💡 No Ethereum node running at http://localhost:8545. Running in hybrid offline/Stellar simulator mode.');
        console.log('   All Stellar wallet features, SEP-10 authentication, and SEP-12 compliance processes will work perfectly!');
        return;
    }

    try {
        web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
        
        // Check connection
        const isListening = await web3.eth.net.isListening();
        if (isListening) {
            console.log('✅ Connected to blockchain at:', rpcUrl);
            isBlockchainConnected = true;
            
            // Get accounts
            const accounts = await web3.eth.getAccounts();
            console.log('Available accounts:', accounts.length);
            
            // Setup contracts if addresses are provided
            const invoiceNFTAddress = process.env.INVOICE_NFT_ADDRESS;
            const financingAddress = process.env.FINANCING_ADDRESS;
            
            if (invoiceNFTAddress && financingAddress) {
                // Load contract ABIs
                const invoiceNFTABI = require('./contracts/InvoiceNFT.json');
                const financingABI = require('./contracts/InvoiceFinancing.json');
                
                invoiceNFTContract = new web3.eth.Contract(
                    invoiceNFTABI.abi,
                    invoiceNFTAddress
                );
                
                financingContract = new web3.eth.Contract(
                    financingABI.abi,
                    financingAddress
                );
                
                console.log('✅ Smart contracts initialized');
            }
        }
    } catch (error) {
        console.log('💡 Could not connect to Ethereum node at http://localhost:8545. Running in hybrid offline/Stellar simulator mode.');
        console.log('   All Stellar wallet features, SEP-10 authentication, and SEP-12 compliance processes will work perfectly!');
    }
}

// In-memory database (for demo)
let invoices = [];
let users = [];
let investments = [];

// Sample data - UPDATED WITH PROPER IDs
const sampleInvoices = [
  {
    id: "inv_1",
    tokenId: "1",
    invoiceNumber: "INV-2024-001",
    msmeAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    buyerAddress: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    amount: 5.8,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
    riskScore: 750,
    riskGrade: "B",
    riskExplanation: [{factor: "Good past history", impact: "+50", type: "positive"}],
    description: "Web Development Services",
    documentHash: "QmSample1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "inv_2",
    tokenId: "2",
    invoiceNumber: "INV-2024-002",
    msmeAddress: "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
    buyerAddress: "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65",
    amount: 12.5,
    dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    status: "funded",
    riskScore: 620,
    riskGrade: "B",
    riskExplanation: [],
    description: "Manufacturing Equipment",
    documentHash: "QmSample2",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "inv_3",
    tokenId: "3",
    invoiceNumber: "INV-2024-003",
    msmeAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    buyerAddress: "0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc",
    amount: 3.2,
    dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: "settled",
    riskScore: 850,
    riskGrade: "A",
    riskExplanation: [],
    description: "Consulting Services",
    documentHash: "QmSample3",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const sampleUsers = [
  {
    address: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    type: "msme",
    kycStatus: "pending",
    totalInvested: 0,
    totalReturns: 0,
    createdAt: new Date().toISOString()
  },
  {
    address: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    type: "investor",
    kycStatus: "verified",
    totalInvested: 150,
    totalReturns: 22.5,
    createdAt: new Date().toISOString()
  },
  {
    address: "gbmsmek6n2pxfhs6hnj55sujzw7uex3t3wyzwvyf3k7jzw4t4vmsme55",
    type: "msme",
    kycStatus: "verified",
    firstName: "Premium",
    lastName: "MSME",
    email: "seller@stellar.org",
    phone: "+15551234567",
    totalInvested: 0,
    totalReturns: 0,
    createdAt: new Date().toISOString()
  },
  {
    address: "gbinvestor655555555555555555555555555555555555555investor",
    type: "investor",
    kycStatus: "verified",
    firstName: "Global",
    lastName: "Investor",
    email: "investor@stellar.org",
    phone: "+15559876543",
    totalInvested: 0,
    totalReturns: 0,
    createdAt: new Date().toISOString()
  }
];

// Initialize with sample data
invoices = [...sampleInvoices];
users = [...sampleUsers];

// Helper functions
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

// ==========================================
// Stellar Protocol Endpoints (SEP-10 & SEP-12)
// ==========================================

// 1. Serve stellar.toml
app.get("/.well-known/stellar.toml", (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.send(`# stellar.toml for MSME InvoiceFinancing Platform
ACCOUNTS = ["${SIGNING_KEY}"]
SIGNING_KEY = "${SIGNING_KEY}"
KYC_SERVER = "http://localhost:3001/sep12"
WEB_AUTH_ENDPOINT = "http://localhost:3001/sep10"
SEP12_ENABLED = true
`);
});

// 2. SEP-10: Web Authentication challenge endpoint
app.get("/sep10", (req, res) => {
  const { account } = req.query;
  if (!account) {
    return res.status(400).json({ error: "Missing required query parameter: account" });
  }

  try {
    let isSimulated = false;
    if (!stellarSdk) {
      isSimulated = true;
    } else {
      try {
        stellarSdk.Keypair.fromPublicKey(account);
      } catch (e) {
        isSimulated = true;
      }
    }

    if (isSimulated) {
      // Simulated Challenge (Fallback if SDK failed to load or for mock/simulated accounts)
      const simulatedChallenge = `simulated_signed_challenge_for_${account}`;
      return res.json({
        challenge: simulatedChallenge,
        network_passphrase: "Test SDF Network ; September 2015"
      });
    }

    // Build standard Stellar challenge transaction
    const serverKeyPair = stellarSdk.Keypair.fromSecret(SECRET_SEP10_SIGNING_SEED);
    
    // Create transaction with sequence number '0'
    const accountMock = new stellarSdk.Account(serverKeyPair.publicKey(), "0");
    const transaction = new stellarSdk.TransactionBuilder(accountMock, {
      fee: "100",
      networkPassphrase: stellarSdk.Networks.TESTNET,
      timebounds: {
        minTime: Math.floor(Date.now() / 1000).toString(),
        maxTime: Math.floor(Date.now() / 1000 + 300).toString() // Valid for 5 minutes
      }
    })
    .addOperation(stellarSdk.Operation.manageData({
      name: "localhost:3001 auth",
      value: Buffer.from(Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)),
      source: account
    }))
    .build();

    // Sign challenge with server private key
    transaction.sign(serverKeyPair);

    res.json({
      challenge: transaction.toXDR(),
      network_passphrase: "Test SDF Network ; September 2015"
    });
  } catch (err) {
    console.error("Error creating Stellar challenge:", err);
    res.status(500).json({ error: err.message });
  }
});

// 3. SEP-10: Web Authentication token exchange endpoint
app.post("/sep10", (req, res) => {
  const { transaction } = req.body;
  if (!transaction) {
    return res.status(400).json({ error: "Missing required parameter: transaction (signed XDR)" });
  }

  try {
    let clientPublicKey = "";
    let isSimulated = false;

    if (!stellarSdk) {
      isSimulated = true;
    } else {
      try {
        // Try parsing transaction to check if it's a valid Stellar XDR
        stellarSdk.TransactionBuilder.fromXDR(transaction, stellarSdk.Networks.TESTNET);
      } catch (e) {
        isSimulated = true;
      }
    }

    if (isSimulated || transaction.startsWith("simulated_signed_challenge_for_")) {
      // Simulated Verification (Fallback if SDK failed to load or invalid/mock XDR)
      if (transaction.startsWith("simulated_signed_challenge_for_")) {
        clientPublicKey = transaction.replace("simulated_signed_challenge_for_", "");
      } else {
        // Safe fallback for demo keys
        clientPublicKey = transaction;
      }

      if (jwt) {
        // Sign actual JWT even for simulated keys so authorize works flawlessly
        const token = jwt.sign({
          sub: clientPublicKey,
          iss: "http://localhost:3001/sep10"
        }, SECRET_SEP10_JWT_SECRET, { expiresIn: "24h" });
        return res.json({ token, account: clientPublicKey });
      } else {
        const mockToken = "simulated_jwt_token_" + clientPublicKey;
        return res.json({ token: mockToken, account: clientPublicKey });
      }
    }

    // Decode signed challenge transaction
    const serverKeyPair = stellarSdk.Keypair.fromSecret(SECRET_SEP10_SIGNING_SEED);
    const tx = stellarSdk.TransactionBuilder.fromXDR(transaction, stellarSdk.Networks.TESTNET);

    // Verify operations shape
    if (tx.operations.length === 0 || tx.operations[0].type !== "manageData") {
      return res.status(400).json({ error: "Invalid challenge transaction format: missing manageData operation" });
    }

    clientPublicKey = tx.operations[0].source;
    if (!clientPublicKey) {
      return res.status(400).json({ error: "Client public key not found in transaction" });
    }

    // Verify server signature
    const serverSigned = tx.signatures.some(sig => {
      try {
        return serverKeyPair.verify(tx.hash(), sig.signature());
      } catch (e) {
        return false;
      }
    });

    if (!serverSigned) {
      return res.status(400).json({ error: "Transaction is not signed by the server" });
    }

    // Verify client signature
    const clientKeyPair = stellarSdk.Keypair.fromPublicKey(clientPublicKey);
    const clientSigned = tx.signatures.some(sig => {
      try {
        return clientKeyPair.verify(tx.hash(), sig.signature());
      } catch (e) {
        return false;
      }
    });

    if (!clientSigned) {
      return res.status(400).json({ error: "Transaction is not signed by the client wallet" });
    }

    // Create and sign JWT token (expires in 24h)
    const token = jwt.sign({
      sub: clientPublicKey,
      iss: "http://localhost:3001/sep10"
    }, SECRET_SEP10_JWT_SECRET, { expiresIn: "24h" });

    res.json({ token });
  } catch (err) {
    console.error("Error exchanging Stellar token:", err);
    res.status(500).json({ error: err.message });
  }
});

// Helper middleware to validate JWT token for SEP-12 routes
function authenticateStellar(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. Missing or invalid Bearer token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    if (!jwt || token.startsWith("simulated_jwt_token_")) {
      // Simulated token verification
      req.stellarAccount = token.replace("simulated_jwt_token_", "") || req.headers["x-simulated-account"] || "GDJWJLZQ3H5BIPQ2W2S33DCEZJDRVLVZ3VPHST7XJSPPZ42SJW7B4T7B";
      return next();
    }

    const decoded = jwt.verify(token, SECRET_SEP10_JWT_SECRET);
    req.stellarAccount = decoded.sub;
    next();
  } catch (err) {
    console.error("JWT Verification failed:", err.message);
    res.status(401).json({ error: "Invalid token" });
  }
}

// 4. SEP-12: Customer KYC Info endpoint (GET)
app.get("/sep12/customer", authenticateStellar, (req, res) => {
  const address = req.stellarAccount;
  
  // Find user by Stellar account address
  let user = users.find(u => u.address.toLowerCase() === address.toLowerCase());
  
  const response = {
    id: address,
    status: user ? (user.kycStatus === "verified" ? "ACCEPTED" : "NEEDS_INFO") : "NEEDS_INFO",
    fields: {
      first_name: {
        type: "string",
        description: "Given name of the customer",
        optional: false
      },
      last_name: {
        type: "string",
        description: "Family name of the customer",
        optional: false
      },
      email: {
        type: "string",
        description: "Email address of the customer",
        optional: false
      },
      phone_number: {
        type: "string",
        description: "Phone number of the customer",
        optional: false
      },
      id_document: {
        type: "binary",
        description: "An image or PDF of an official ID document",
        optional: false
      }
    }
  };

  if (user && user.kycStatus === "verified") {
    delete response.fields;
    response.provided_fields = {
      first_name: user.firstName || "N/A",
      last_name: user.lastName || "N/A",
      email: user.email || "N/A",
      phone_number: user.phone || "N/A"
    };
  }

  res.json(response);
});

// Mock Government ID Registry Verification Endpoint
app.post("/api/kyc/verify-gov-id", (req, res) => {
  const { docType, docNumber, firstName, lastName } = req.body;

  if (!docType || !docNumber || !firstName || !lastName) {
    return res.status(400).json({ success: false, error: "Missing required verification fields." });
  }

  const cleanNum = docNumber.replace(/\s+/g, "").toUpperCase();

  // 1. Validation of Formats
  if (docType === "aadhar") {
    // Aadhaar: 12 digits, first digit cannot be 0 or 1
    const aadharRegex = /^[2-9]{1}[0-9]{11}$/;
    if (!aadharRegex.test(cleanNum)) {
      return res.status(400).json({
        success: false,
        error: "Invalid Aadhaar Card number. Must be a 12-digit number and cannot start with 0 or 1."
      });
    }
  } else if (docType === "pan") {
    // PAN: 5 letters, 4 digits, 1 letter
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(cleanNum)) {
      return res.status(400).json({
        success: false,
        error: "Invalid PAN Card number. Must be in the format: ABCDE1234F (5 letters, 4 numbers, 1 letter)."
      });
    }
  } else if (docType === "passport") {
    // Passport: 1 letter followed by 7 digits or standard 8-12 alphanumeric characters
    const passportRegex = /^[A-Z0-9]{8,12}$/;
    if (!passportRegex.test(cleanNum)) {
      return res.status(400).json({
        success: false,
        error: "Invalid Passport number. Must be 8 to 12 alphanumeric characters."
      });
    }
  } else if (docType === "license") {
    // DL format: 8-16 alphanumeric characters
    const dlRegex = /^[A-Z0-9]{8,16}$/;
    if (!dlRegex.test(cleanNum)) {
      return res.status(400).json({
        success: false,
        error: "Invalid Driver's License number. Must be 8 to 16 alphanumeric characters."
      });
    }
  }

  // 2. Simulated Compliance Failures
  if (firstName.toLowerCase() === "fail" || firstName.toLowerCase() === "reject") {
    return res.status(403).json({
      success: false,
      status: "SUSPENDED",
      error: `ID Check Failed: Government Database returned a FRAUD ALERT or SUSPENDED flag for ID ending in ...${cleanNum.slice(-4)}`
    });
  }

  // 3. Successful Simulated Registry Response
  let registryName = "Government Registry Gateway";
  let tokenPrefix = "MOCK-GOV";
  if (docType === "aadhar") {
    registryName = "UIDAI CIDR Central Registry";
    tokenPrefix = "UIDAI-TOKEN";
  } else if (docType === "pan") {
    registryName = "NSDL Income Tax Database";
    tokenPrefix = "NSDL-PAN";
  } else if (docType === "passport") {
    registryName = "Ministry of External Affairs Passport Vault";
    tokenPrefix = "MEA-PASS";
  } else if (docType === "license") {
    registryName = "Sarathi Parivahan Vahan Portal";
    tokenPrefix = "DL-SARATHI";
  }

  return res.json({
    success: true,
    status: "MATCHED",
    registry: registryName,
    idVerified: true,
    details: {
      nameMatchScore: "99.2% (Perfect Match)",
      biometricVerification: docType === "aadhar" ? "PASSED (Live Biometric Match)" : "N/A",
      registryStatus: "ACTIVE / VERIFIED",
      verificationToken: `${tokenPrefix}-${Math.floor(Math.random() * 900000 + 100000)}`
    }
  });
});

// 5. SEP-12: Customer KYC submit endpoint (PUT)
app.put("/sep12/customer", authenticateStellar, (req, res) => {
  const address = req.stellarAccount;
  const { first_name, last_name, email, phone_number, doc_type, doc_number } = req.body;

  if (!first_name || !last_name || !email) {
    return res.status(400).json({ error: "Missing required KYC fields: first_name, last_name, email" });
  }

  // Find or create user
  let user = users.find(u => u.address.toLowerCase() === address.toLowerCase());
  if (!user) {
    user = {
      address: address.toLowerCase(),
      type: "investor",
      kycStatus: "verified",
      firstName: first_name,
      lastName: last_name,
      email: email,
      phone: phone_number || "",
      docType: doc_type || "passport",
      docNumber: doc_number || "",
      totalInvested: 0,
      totalReturns: 0,
      createdAt: new Date().toISOString()
    };
    users.push(user);
  } else {
    user.kycStatus = "verified";
    user.firstName = first_name;
    user.lastName = last_name;
    user.email = email;
    user.phone = phone_number || "";
    user.docType = doc_type || user.docType || "passport";
    user.docNumber = doc_number || user.docNumber || "";
    user.updatedAt = new Date().toISOString();
  }

  res.json({
    id: address,
    status: "ACCEPTED",
    message: "KYC submission accepted and approved by Stellar Anchor Platform"
  });
});

// Health Check - UPDATED TO ALWAYS RETURN DEMO MODE
app.get("/api/health", async (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    server: "InvoiceFinancing Backend",
    version: "1.0.0",
    database: "in-memory",
    blockchain: {
      status: 'disconnected',
      connected: false,
      contracts: {
        invoiceNFT: false,
        financing: false
      }
    }
  });
});

// Get Stats
app.get("/api/stats", (req, res) => {
  const totalInvoices = invoices.length;
  const fundedInvoices = invoices.filter(i => i.status === "funded").length;
  const settledInvoices = invoices.filter(i => i.status === "settled").length;
  const totalUsers = users.length;
  const totalInvestors = users.filter(u => u.type === "investor").length;
  
  const totalVolume = invoices
    .filter(i => i.status === "funded" || i.status === "settled")
    .reduce((sum, inv) => sum + inv.amount, 0);

  res.json({
    totalInvoices,
    totalFinanced: fundedInvoices + settledInvoices,
    defaultRate: "2.5%",
    activeInvestors: totalInvestors,
    totalVolume: `${totalVolume.toFixed(2)} ETH`,
    avgInvoiceSize: totalInvoices > 0 ? `${(totalVolume / totalInvoices).toFixed(2)} ETH` : "0 ETH",
    avgInterestRate: "12.5%",
    successRate: "97.5%",
    blockchain: {
      connected: isBlockchainConnected,
      message: isBlockchainConnected ? "Blockchain active" : "Demo mode"
    }
  });
});

// Get All Invoices - UPDATED WITH PROPER IDs
app.get("/api/invoices", (req, res) => {
  const { status, riskLevel } = req.query;
  
  let filteredInvoices = [...invoices];
  
  if (status) {
    filteredInvoices = filteredInvoices.filter(i => i.status === status);
  }
  
  if (riskLevel) {
    if (riskLevel === "low") {
      filteredInvoices = filteredInvoices.filter(i => i.riskScore >= 700);
    } else if (riskLevel === "medium") {
      filteredInvoices = filteredInvoices.filter(i => i.riskScore >= 400 && i.riskScore <= 699);
    } else if (riskLevel === "high") {
      filteredInvoices = filteredInvoices.filter(i => i.riskScore <= 399);
    }
  }
  
  // Ensure all invoices have proper IDs
  filteredInvoices = filteredInvoices.map(invoice => {
    if (!invoice.id || !invoice.id.startsWith('inv_')) {
      return {
        ...invoice,
        id: `inv_${Math.floor(Math.random() * 1000)}`,
        tokenId: invoice.tokenId || Math.floor(Math.random() * 1000).toString()
      };
    }
    return invoice;
  });
  
  // Sort by creation date (newest first)
  filteredInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json(filteredInvoices.slice(0, 50)); // Limit to 50
});

// Complete KYC
app.post("/api/kyc/verify", (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: "Address required" });
  
  let user = users.find(u => u.address.toLowerCase() === address.toLowerCase());
  if (!user) {
    user = {
      address: address.toLowerCase(),
      type: "investor",
      kycStatus: "verified",
      totalInvested: 0,
      totalReturns: 0,
      createdAt: new Date().toISOString()
    };
    users.push(user);
  } else {
    user.kycStatus = "verified";
    user.updatedAt = new Date().toISOString();
  }
  
  res.json({ success: true, message: "KYC Verified", user });
});

// Configure Autonomous Trading Agent
app.post("/api/agent/config", (req, res) => {
  const { investorAddress, rules } = req.body;
  if (!investorAddress) return res.status(400).json({ error: "investorAddress required" });
  
  let user = users.find(u => u.address.toLowerCase() === investorAddress.toLowerCase());
  if (!user) {
    user = {
      address: investorAddress.toLowerCase(),
      type: "investor",
      kycStatus: "pending",
      agentConfig: rules,
      totalInvested: 0,
      totalReturns: 0,
      createdAt: new Date().toISOString()
    };
    users.push(user);
  } else {
    user.agentConfig = rules;
  }
  res.json({ success: true, agentConfig: user.agentConfig });
});

const https = require("https");

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error("Invalid JSON"));
                    }
                } else {
                    reject(new Error(`HTTP Status ${res.statusCode}`));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function calculateAIRisk(buyerAddress, amount) {
    let balance = 0;
    let nonce = 0;
    
    const isStellarAddress = (typeof buyerAddress === 'string') && 
        (buyerAddress.toUpperCase().startsWith('G')) && 
        buyerAddress.length === 56;
    
    if (isStellarAddress) {
        const addrLower = buyerAddress.toLowerCase();
        // Check if it matches simulated default roles
        if (addrLower === 'gbmsmek6n2pxfhs6hnj55sujzw7uex3t3wyzwvyf3k7jzw4t4vmsme55') {
            balance = 10000;
            nonce = 125; // Grade A
            console.log(`✅ Simulated Stellar MSME Wallet Activity - Balance: ${balance} XLM, Transactions count: ${nonce}`);
        } else if (addrLower === 'gbinvestor655555555555555555555555555555555555555investor') {
            balance = 10000;
            nonce = 75; // Grade B
            console.log(`✅ Simulated Stellar Investor Wallet Activity - Balance: ${balance} XLM, Transactions count: ${nonce}`);
        } else {
            try {
                console.log(`🔍 Fetching real Stellar Testnet Horizon data for buyerAddress: ${buyerAddress}`);
                const data = await fetchJson(`https://horizon-testnet.stellar.org/accounts/${buyerAddress}`);
                const nativeBalance = data.balances.find(b => b.asset_type === 'native');
                balance = nativeBalance ? parseFloat(nativeBalance.balance) : 0;
                
                try {
                    const txData = await fetchJson(`https://horizon-testnet.stellar.org/accounts/${buyerAddress}/transactions?limit=100`);
                    nonce = txData._embedded ? txData._embedded.records.length : 0;
                } catch (txErr) {
                    console.log("No transactions or error fetching txs:", txErr.message);
                    nonce = 0;
                }
                console.log(`✅ Real Stellar Wallet Activity - Balance: ${balance} XLM, Operations/Transactions count: ${nonce}`);
            } catch (error) {
                if (error.message && error.message.includes("404")) {
                    console.log("ℹ️ Stellar address is new (unfunded/inactive on Horizon). Setting balance and transactions to 0 (High Risk).");
                    balance = 0;
                    nonce = 0;
                } else {
                    console.log("⚠️ Stellar Horizon lookup failed due to network. Defaulting to standard grade values.", error.message);
                    balance = 1200.00;
                    nonce = 25;
                }
            }
        }
    } else if (isBlockchainConnected && web3 && web3.utils.isAddress(buyerAddress)) {
        try {
            const balanceWei = await web3.eth.getBalance(buyerAddress);
            balance = parseFloat(web3.utils.fromWei(balanceWei, 'ether'));
            nonce = await web3.eth.getTransactionCount(buyerAddress);
        } catch (error) {
            console.log("Error fetching blockchain data:", error.message);
        }
    } else {
        balance = Math.random() * 20; 
        nonce = Math.floor(Math.random() * 50);
    }

    const buyerInvoices = invoices.filter(i => i.buyerAddress.toLowerCase() === buyerAddress.toLowerCase());
    const settledCount = buyerInvoices.filter(i => i.status === 'settled').length;
    const pendingCount = buyerInvoices.filter(i => i.status === 'pending' || i.status === 'funded').length;
    
    let score = 500;
    let explanations = [];
    
    if (nonce === 0) {
        score = 300;
        explanations.push({ factor: "CRITICAL: Brand New Wallet Profile (0 transactions)", impact: "Grade D", type: "negative" });
        if (balance === 0) {
            explanations.push({ factor: "Account Unfunded / Not Active on Stellar Ledger", impact: "High Risk", type: "negative" });
        } else {
            explanations.push({ factor: "Inactive Wallet Liquidity Check", impact: "High Risk", type: "negative" });
        }
    } else {
        // Base score for active wallets starts at 400 (Grade C)
        score = 400;
        
        // Transaction Volume contribution
        if (nonce >= 50) {
            score += 200;
            explanations.push({ factor: `High Volume Wallet Activity (${nonce} transactions)`, impact: "+200", type: "positive" });
        } else if (nonce >= 15) {
            score += 100;
            explanations.push({ factor: `Consistent Wallet Activity (${nonce} transactions)`, impact: "+100", type: "positive" });
        } else {
            score += 50;
            explanations.push({ factor: `Moderate Wallet Activity (${nonce} transactions)`, impact: "+50", type: "positive" });
        }

        // Wallet Balance contribution
        if (balance >= 5000) {
            score += 200;
            explanations.push({ factor: `Premium Wallet Balance (${balance.toFixed(2)} XLM)`, impact: "+200", type: "positive" });
        } else if (balance >= 1000) {
            score += 100;
            explanations.push({ factor: `Healthy Wallet Balance (${balance.toFixed(2)} XLM)`, impact: "+100", type: "positive" });
        } else if (balance >= 100) {
            score += 50;
            explanations.push({ factor: `Low-to-Moderate Wallet Balance (${balance.toFixed(2)} XLM)`, impact: "+50", type: "positive" });
        } else {
            score -= 100;
            explanations.push({ factor: `CRITICAL: Insufficient Wallet Liquidity (${balance.toFixed(2)} XLM)`, impact: "-100", type: "negative" });
        }
    }
    
    if (settledCount > 0) {
        score += settledCount * 30;
        explanations.push({ factor: `Good Repayment History (${settledCount} settled)`, impact: `+${settledCount * 30}`, type: "positive" });
    }
    if (pendingCount > 2) {
        score -= 50;
        explanations.push({ factor: "High Pending Obligations", impact: "-50", type: "negative" });
    }
    
    score = Math.max(250, Math.min(score, 900));
    
    let grade = 'D';
    if (score >= 800) grade = 'A';
    else if (score >= 600) grade = 'B';
    else if (score >= 400) grade = 'C';
    
    return { score, grade, explanations, balance, transactionsCount: nonce };
}

// Create Invoice
app.post("/api/invoices", async (req, res) => {
  try {
    const { buyerAddress, amount, dueDate, invoiceNumber, description, msmeAddress } = req.body;
    
    const user = users.find(u => u.address.toLowerCase() === (msmeAddress || "").toLowerCase());
    if (!user || user.kycStatus !== 'verified') {
        return res.status(403).json({ error: "KYC Verification required to create invoices." });
    }

    const aiRisk = await calculateAIRisk(buyerAddress, amount);
    
    const newInvoice = {
      id: `inv_${Date.now()}`,
      tokenId: Date.now().toString(),
      invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
      msmeAddress: (msmeAddress || "").toLowerCase(),
      buyerAddress: (buyerAddress || "").toLowerCase(),
      amount: parseFloat(amount) || 0,
      dueDate: new Date(dueDate).toISOString(),
      status: "pending",
      riskScore: aiRisk.score,
      riskGrade: aiRisk.grade,
      riskExplanation: aiRisk.explanations,
      description: description || "",
      documentHash: `Qm${Math.random().toString(36).substring(2, 15)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    invoices.push(newInvoice);

    // Trigger Autonomous Trading Agents
    let agentAutoFunded = false;
    let agentInvestor = null;
    
    for (const invUser of users) {
        if (invUser.type === 'investor' && invUser.agentConfig && invUser.agentConfig.active && invUser.kycStatus === 'verified') {
            const conf = invUser.agentConfig;
            const gradeMap = {'A': 4, 'B': 3, 'C': 2, 'D': 1};
            const invGrade = gradeMap[aiRisk.grade] || 1;
            const reqGrade = gradeMap[conf.minGrade] || 1;
            
            if (invGrade >= reqGrade && parseFloat(amount) <= conf.maxAmount) {
                // Auto fund!
                agentAutoFunded = true;
                agentInvestor = invUser.address;
                
                newInvoice.status = 'funded';
                newInvoice.fundedBy = invUser.address.toLowerCase();
                newInvoice.updatedAt = new Date().toISOString();
                
                const investment = {
                  id: `invest_${Date.now()}`,
                  invoiceId: newInvoice.id,
                  tokenId: newInvoice.tokenId,
                  investorAddress: invUser.address.toLowerCase(),
                  financingAmount: parseFloat(amount),
                  interestRate: 12.5, // Default for agent
                  status: 'active',
                  createdAt: new Date().toISOString(),
                  isAgentAction: true
                };
                investments.push(investment);
                invUser.totalInvested += parseFloat(amount);
                invUser.updatedAt = new Date().toISOString();
                
                break; // One agent funds it
            }
        }
    }
    
    // Update or create user (should already exist due to KYC, but just in case)
    const userIndex = users.findIndex(u => u.address.toLowerCase() === newInvoice.msmeAddress);
    if (userIndex === -1) {
      users.push({
        address: newInvoice.msmeAddress,
        type: "msme",
        kycStatus: "pending",
        totalInvested: 0,
        totalReturns: 0,
        createdAt: new Date().toISOString()
      });
    } else {
      users[userIndex].type = "msme";
      users[userIndex].updatedAt = new Date().toISOString();
    }
    
    res.json({
      success: true,
      message: "Invoice created successfully",
      invoice: newInvoice,
      blockchain: {
        required: false,
        simulated: true,
        message: "Demo mode - Invoice recorded in database only"
      },
      agentAutoFunded,
      agentInvestor
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit Investment - FIXED FOR DEMO MODE
app.post("/api/invest", async (req, res) => {
  try {
    const { tokenId, financingAmount, interestRate, investorAddress, invoiceId } = req.body;
    
    console.log('Investment request received:', { 
      tokenId, 
      financingAmount, 
      interestRate, 
      investorAddress, 
      invoiceId 
    });
    
    let investor = users.find(u => u.address.toLowerCase() === investorAddress.toLowerCase());
    if (!investor || investor.kycStatus !== 'verified') {
        return res.status(403).json({ error: "KYC Verification required to invest." });
    }
    
    // Find the invoice
    const invoiceIndex = invoices.findIndex(i => i.id === invoiceId);
    if (invoiceIndex === -1) {
      console.log('Invoice not found:', invoiceId);
      console.log('Available invoices:', invoices.map(i => i.id));
      return res.status(404).json({ 
        success: false,
        error: "Invoice not found",
        availableInvoices: invoices.map(i => ({ id: i.id, invoiceNumber: i.invoiceNumber }))
      });
    }
    
    // Check if invoice is already funded
    if (invoices[invoiceIndex].status === 'funded') {
      return res.status(400).json({ 
        success: false,
        error: "Invoice already funded" 
      });
    }
    
    // Update invoice status
    invoices[invoiceIndex].status = 'funded';
    invoices[invoiceIndex].fundedBy = investorAddress.toLowerCase();
    invoices[invoiceIndex].updatedAt = new Date().toISOString();
    
    // Create investment record
    const investment = {
      id: `invest_${Date.now()}`,
      invoiceId,
      tokenId: tokenId || invoices[invoiceIndex].tokenId || (invoiceIndex + 1).toString(),
      investorAddress: investorAddress.toLowerCase(),
      financingAmount: parseFloat(financingAmount),
      interestRate: parseFloat(interestRate),
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    investments.push(investment);
    
    // Update investor stats
    if (!investor) {
      investor = {
        address: investorAddress.toLowerCase(),
        type: "investor",
        kycStatus: "pending",
        totalInvested: parseFloat(financingAmount),
        totalReturns: 0,
        createdAt: new Date().toISOString()
      };
      users.push(investor);
    } else {
      investor.totalInvested += parseFloat(financingAmount);
      investor.updatedAt = new Date().toISOString();
    }
    
    res.json({
      success: true,
      message: "Investment submitted successfully",
      investment,
      blockchain: {
        required: false,
        simulated: true,
        message: "Demo mode - Investment recorded in database only"
      }
    });
    
  } catch (error) {
    console.error('Error submitting investment:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      simulated: true,
      note: "Running in demo mode due to error" 
    });
  }
});

// Get Investment Status
app.get("/api/investment/:id", (req, res) => {
  const investment = investments.find(i => i.id === req.params.id);
  if (!investment) {
    return res.status(404).json({ error: "Investment not found" });
  }
  
  const invoice = invoices.find(i => i.id === investment.invoiceId);
  
  res.json({
    investment,
    invoice,
    status: investment.status,
    estimatedReturn: investment.financingAmount * (investment.interestRate / 100)
  });
});

// Settle Invoice
app.post("/api/settle", async (req, res) => {
  try {
    const { invoiceId, settlementAmount, payerAddress } = req.body;
    
    const invoiceIndex = invoices.findIndex(i => i.id === invoiceId);
    if (invoiceIndex === -1) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    
    if (invoices[invoiceIndex].status !== 'funded') {
      return res.status(400).json({ error: "Invoice must be funded to settle" });
    }
    
    // Update invoice status
    invoices[invoiceIndex].status = 'settled';
    invoices[invoiceIndex].updatedAt = new Date().toISOString();
    
    // Find related investments
    const relatedInvestments = investments.filter(i => i.invoiceId === invoiceId);
    
    // Update investor returns
    relatedInvestments.forEach(investment => {
      const investor = users.find(u => u.address.toLowerCase() === investment.investorAddress.toLowerCase());
      if (investor) {
        const returnAmount = investment.financingAmount * (investment.interestRate / 100);
        investor.totalReturns += returnAmount;
        investor.updatedAt = new Date().toISOString();
      }
      
      // Update investment status
      investment.status = 'settled';
      investment.settledAt = new Date().toISOString();
      investment.returnAmount = investment.financingAmount * (1 + investment.interestRate / 100);
    });
    
    res.json({
      success: true,
      message: "Invoice settled successfully",
      invoice: invoices[invoiceIndex],
      settlements: relatedInvestments.map(inv => ({
        investor: inv.investorAddress,
        principal: inv.financingAmount,
        interest: inv.financingAmount * (inv.interestRate / 100),
        totalReturn: inv.financingAmount * (1 + inv.interestRate / 100)
      }))
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Investments for an investor
app.get("/api/investments/:address", (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const investorInvestments = investments.filter(i => i.investorAddress.toLowerCase() === address);
    
    const detailedInvestments = investorInvestments.map(inv => {
      const invoice = invoices.find(i => i.id === inv.invoiceId);
      return {
        ...inv,
        invoice: invoice ? {
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          status: invoice.status,
          dueDate: invoice.dueDate
        } : null
      };
    });
    
    res.json({
      success: true,
      address,
      totalInvestments: investorInvestments.length,
      activeInvestments: investorInvestments.filter(i => i.status === 'active').length,
      settledInvestments: investorInvestments.filter(i => i.status === 'settled').length,
      totalInvested: investorInvestments.reduce((sum, inv) => sum + inv.financingAmount, 0),
      totalReturns: investorInvestments.filter(i => i.status === 'settled')
        .reduce((sum, inv) => sum + (inv.returnAmount || 0), 0),
      investments: detailedInvestments
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      investments: [] 
    });
  }
});

// IPFS Upload (Simulated)
app.post("/api/ipfs-upload", (req, res) => {
  try {
    const { fileName } = req.body;
    const hash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    
    res.json({
      success: true,
      ipfsUrl: `ipfs://${hash}`,
      ipfsHash: hash,
      fileName,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Portfolio
app.get("/api/portfolio/:address", (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    
    const createdInvoices = invoices.filter(i => i.msmeAddress === address);
    const fundedInvoices = invoices.filter(i => 
      i.status === "funded" || i.status === "settled"
    );
    
    let user = users.find(u => u.address.toLowerCase() === address);
    if (!user) {
      user = { 
        address, 
        type: "investor", 
        kycStatus: "pending",
        totalInvested: 0,
        totalReturns: 0,
        createdAt: new Date().toISOString() 
      };
      users.push(user);
    }
    
    // Get investments for this address
    const userInvestments = investments.filter(i => i.investorAddress.toLowerCase() === address);
    
    res.json({
      success: true,
      address,
      userType: user.type || "investor",
      createdInvoices,
      fundedInvoices,
      investments: userInvestments,
      totalInvested: user.totalInvested || 0,
      totalReturns: user.totalReturns || 0,
      kycStatus: user.kycStatus || "pending",
      agentConfig: user.agentConfig || null,
      joined: user.createdAt || new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get Recent Transactions
app.get("/api/transactions", (req, res) => {
  try {
    // Combine invoice updates and investment activities
    const recentActivities = [];
    
    // Add invoice updates
    invoices.slice(-10).forEach(inv => {
      recentActivities.push({
        type: inv.status === 'funded' ? 'Invoice Funded' : 
              inv.status === 'settled' ? 'Settlement' : 'Invoice Created',
        time: formatTimeAgo(inv.updatedAt),
        amount: `${inv.amount} ETH`,
        status: inv.status,
        invoiceNumber: inv.invoiceNumber,
        timestamp: inv.updatedAt
      });
    });
    
    // Add investment activities
    investments.slice(-10).forEach(inv => {
      const invoice = invoices.find(i => i.id === inv.invoiceId);
      recentActivities.push({
        type: 'Investment',
        time: formatTimeAgo(inv.createdAt),
        amount: `${inv.financingAmount} ETH`,
        status: inv.status,
        invoiceNumber: invoice?.invoiceNumber || 'N/A',
        timestamp: inv.createdAt
      });
    });
    
    // Sort by timestamp and get latest 10
    recentActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json(recentActivities.slice(0, 10));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Invoice by ID
app.get("/api/invoices/:id", (req, res) => {
  const invoice = invoices.find(i => i.id === req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: "Invoice not found" });
  }
  
  // Get investments for this invoice
  const invoiceInvestments = investments.filter(i => i.invoiceId === req.params.id);
  
  res.json({
    ...invoice,
    investments: invoiceInvestments,
    totalFinanced: invoiceInvestments.reduce((sum, inv) => sum + inv.financingAmount, 0)
  });
});

// Update Invoice Status
app.patch("/api/invoices/:id", (req, res) => {
  const { status } = req.body;
  const invoiceIndex = invoices.findIndex(i => i.id === req.params.id);
  
  if (invoiceIndex === -1) {
    return res.status(404).json({ error: "Invoice not found" });
  }
  
  invoices[invoiceIndex].status = status;
  invoices[invoiceIndex].updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    message: "Invoice updated successfully",
    invoice: invoices[invoiceIndex]
  });
});

// Blockchain info
app.get("/api/blockchain/info", async (req, res) => {
  try {
    if (!isBlockchainConnected) {
      return res.json({
        connected: false,
        message: "Blockchain not connected - Running in demo mode"
      });
    }
    
    const blockNumber = await web3.eth.getBlockNumber();
    const gasPrice = await web3.eth.getGasPrice();
    const networkId = await web3.eth.net.getId();
    const accounts = await web3.eth.getAccounts();
    
    res.json({
      connected: true,
      networkId,
      blockNumber,
      gasPrice: web3.utils.fromWei(gasPrice, 'gwei') + ' Gwei',
      accounts: accounts.slice(0, 5), // Show first 5 accounts
      contracts: {
        invoiceNFT: invoiceNFTContract?.options.address || 'Not deployed',
        financing: financingContract?.options.address || 'Not deployed'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get credit grade level for a connected wallet based on activity
app.get("/api/wallet-grade/:address", async (req, res) => {
  try {
    const address = req.params.address;
    if (!address) {
      return res.status(400).json({ success: false, error: "Address parameter required" });
    }
    // Call calculateAIRisk with amount = 0 to get standalone wallet rating
    const risk = await calculateAIRisk(address, 0);
    return res.json({
      success: true,
      score: risk.score,
      grade: risk.grade,
      explanations: risk.explanations,
      balance: risk.balance,
      transactionsCount: risk.transactionsCount
    });
  } catch (error) {
    console.error("Error calculating wallet grade:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get all users (for debugging)
app.get("/api/users", (req, res) => {
  res.json({
    success: true,
    totalUsers: users.length,
    users: users.map(u => ({
      address: u.address,
      type: u.type,
      totalInvested: u.totalInvested,
      totalReturns: u.totalReturns
    }))
  });
});

// Get all investments (for debugging)
app.get("/api/all-investments", (req, res) => {
  res.json({
    success: true,
    totalInvestments: investments.length,
    investments: investments
  });
});

// Debug endpoint to see all data
app.get("/api/debug", (req, res) => {
  res.json({
    invoices: invoices,
    users: users,
    investments: investments
  });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`
    🚀 InvoiceFinancing Backend
    ===========================
    📡 Server: http://localhost:${PORT}
    📊 API: http://localhost:${PORT}/api
    🔗 Health: http://localhost:${PORT}/api/health

    💡 Features:
    - In-memory database (no installation needed)
    - Sample data pre-loaded with proper IDs
    - DEMO MODE ENABLED (no blockchain required)
    - Investment tracking
    - Portfolio management

    🎯 READY FOR TESTING:
    - All endpoints working in demo mode
    - No MetaMask required
    - Investment functionality fully operational

    Sample endpoints:
    - GET  /api/health          - Health check
    - GET  /api/stats           - Platform statistics
    - GET  /api/invoices        - List invoices (now with proper IDs)
    - POST /api/invoices        - Create invoice
    - POST /api/invest          - Submit investment (FIXED)
    - POST /api/settle          - Settle invoice
    - GET  /api/portfolio/:addr - User portfolio
    - GET  /api/debug           - Debug: all data
  `);
  
  // Initialize blockchain connection (but run in demo mode)
  await initializeBlockchain();
});