// backend/test_stellar_auth.js
const StellarSdk = require("stellar-sdk");
const axios = require("axios");

const API_URL = "http://localhost:3001";

async function runTest() {
    console.log("🚀 Starting Stellar SEP-10 & SEP-12 Integration Tests...");
    
    // 1. Generate simulated client wallet
    console.log("\n1. Generating client Stellar keypair...");
    const clientKeypair = StellarSdk.Keypair.random();
    const clientPublicKey = clientKeypair.publicKey();
    const clientSecret = clientKeypair.secret();
    console.log(`   Client Public Key: ${clientPublicKey}`);
    console.log(`   Client Secret Seed: ${clientSecret.substring(0, 5)}...`);

    // 2. Request SEP-10 challenge transaction
    console.log(`\n2. Requesting SEP-10 challenge from ${API_URL}/sep10...`);
    let challengeData;
    try {
        const response = await axios.get(`${API_URL}/sep10`, {
            params: { account: clientPublicKey }
        });
        challengeData = response.data;
        console.log("   Challenge XDR received successfully.");
    } catch (err) {
        console.error("❌ Failed to get challenge:", err.response ? err.response.data : err.message);
        process.exit(1);
    }

    const { challenge, network_passphrase } = challengeData;

    // 3. Cryptographically sign challenge transaction on client-side
    console.log("\n3. Decoding and signing challenge transaction on the client...");
    let signedXdr;
    try {
        const tx = new StellarSdk.Transaction(challenge, network_passphrase);
        tx.sign(clientKeypair);
        signedXdr = tx.toXDR();
        console.log("   Successfully signed challenge transaction.");
    } catch (err) {
        console.error("❌ Failed to sign challenge:", err.message);
        process.exit(1);
    }

    // 4. Submit signed challenge to POST /sep10 for JWT exchange
    console.log("\n4. Submitting signed challenge back to anchor at POST /sep10...");
    let jwtToken;
    try {
        const response = await axios.post(`${API_URL}/sep10`, {
            transaction: signedXdr
        });
        jwtToken = response.data.token;
        console.log("   Authentication Successful! JWT token issued by anchor:");
        console.log(`   JWT: ${jwtToken.substring(0, 40)}...`);
    } catch (err) {
        console.error("❌ Authentication verification failed:", err.response ? err.response.data : err.message);
        process.exit(1);
    }

    // 5. Submit customer compliance profile to PUT /sep12/customer
    console.log("\n5. Submitting KYC profile details to PUT /sep12/customer...");
    try {
        const response = await axios.put(
            `${API_URL}/sep12/customer`,
            {
                first_name: "Jane",
                last_name: "Doe",
                email: "jane.doe@example.com",
                phone_number: "+15550199"
            },
            {
                headers: {
                    "Authorization": `Bearer ${jwtToken}`,
                    "x-simulated-account": clientPublicKey
                }
            }
        );
        console.log("   KYC Profile Registered! Response status:", response.data.status);
    } catch (err) {
        console.error("❌ KYC registration failed:", err.response ? err.response.data : err.message);
        process.exit(1);
    }

    // 6. Retrieve customer compliance profile from GET /sep12/customer
    console.log("\n6. Checking registered profile details from GET /sep12/customer...");
    try {
        const response = await axios.get(
            `${API_URL}/sep12/customer`,
            {
                headers: {
                    "Authorization": `Bearer ${jwtToken}`,
                    "x-simulated-account": clientPublicKey
                }
            }
        );
        const data = response.data;
        console.log("   Successfully retrieved customer profile.");
        console.log(`   Status: ${data.status}`);
        console.log(`   Registered Name: ${data.provided_fields.first_name} ${data.provided_fields.last_name}`);
        console.log(`   Registered Email: ${data.provided_fields.email}`);
    } catch (err) {
        console.error("❌ Profile check failed:", err.response ? err.response.data : err.message);
        process.exit(1);
    }

    console.log("\n🎉 End-to-end integration test completed successfully!");
    console.log("✅ Stellar Wallet Connection, SEP-10 WebAuth, and SEP-12 compliance pipelines are fully functional!\n");
}

runTest();
