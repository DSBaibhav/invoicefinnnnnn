let web3;
let accounts = [];
let currentAccount;
let invoiceNFTContract;
let financingContract;
let riskOracleContract;

// Backend API URL
const API_URL = 'http://localhost:3001';

// Contract ABIs will be loaded from artifacts
let invoiceNFTABI = [];
let financingABI = [];
let riskOracleABI = [];

// Contract addresses will be loaded from JSON file
let contractAddresses = {};

async function init() {
    console.log('Initializing dApp...');
    
    // Load contract addresses
    try {
        const response = await fetch('contract-addresses.json');
        contractAddresses = await response.json();
        
        if (contractAddresses.invoiceNFT) {
            document.getElementById('invoiceNFTAddress').textContent = contractAddresses.invoiceNFT;
            document.getElementById('financingAddress').textContent = contractAddresses.invoiceFinancing;
            document.getElementById('oracleAddress').textContent = contractAddresses.riskOracle;
            document.getElementById('networkName').textContent = contractAddresses.network;
        }
    } catch (error) {
        console.log('Contract addresses not loaded:', error);
    }
    
    // Load contract ABIs
    try {
        const invoiceNFTArtifact = await fetch('../artifacts/contracts/InvoiceNFT.sol/InvoiceNFT.json');
        const invoiceNFTData = await invoiceNFTArtifact.json();
        invoiceNFTABI = invoiceNFTData.abi;
        
        const financingArtifact = await fetch('../artifacts/contracts/InvoiceFinancing.sol/InvoiceFinancing.json');
        const financingData = await financingArtifact.json();
        financingABI = financingData.abi;
        
        const riskOracleArtifact = await fetch('../artifacts/contracts/RiskOracle.sol/RiskOracle.json');
        const riskOracleData = await riskOracleArtifact.json();
        riskOracleABI = riskOracleData.abi;
    } catch (error) {
        console.log('Error loading ABIs:', error);
    }
    
    // Check if MetaMask is installed
    if (typeof window.ethereum !== 'undefined') {
        web3 = new Web3(window.ethereum);
        setupEventListeners();
        
        // Try auto-connect
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                currentAccount = accounts[0];
                updateWalletInfo();
                initializeContracts();
                loadData();
            }
        } catch (error) {
            console.log('Auto-connect failed:', error);
        }
    } else {
        alert('Please install MetaMask to use this dApp!');
    }
}

function setupEventListeners() {
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('mintForm').addEventListener('submit', mintInvoice);
    document.getElementById('investForm').addEventListener('submit', submitInvestment);
    
    // Document upload event
    document.getElementById('invoiceDocument').addEventListener('change', handleDocumentUpload);
    
    // Risk check event
    document.getElementById('checkRiskBtn').addEventListener('click', calculateRiskScore);
}

async function connectWallet() {
    try {
        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        currentAccount = accounts[0];
        
        updateWalletInfo();
        initializeContracts();
        loadData();
        
    } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Error connecting wallet: ' + error.message);
    }
}

function updateWalletInfo() {
    const walletInfo = document.getElementById('walletInfo');
    const walletAddress = document.getElementById('walletAddress');
    const status = document.getElementById('status');
    
    if (currentAccount) {
        walletInfo.style.display = 'block';
        walletAddress.textContent = currentAccount.substring(0, 6) + '...' + currentAccount.substring(38);
        status.textContent = 'Connected';
        status.className = 'badge bg-success';
        
        // Get balance
        web3.eth.getBalance(currentAccount).then(balance => {
            document.getElementById('balance').textContent = 
                web3.utils.fromWei(balance, 'ether').substring(0, 6) + ' ETH';
        });
    }
}

function initializeContracts() {
    if (!web3 || !contractAddresses.invoiceNFT) {
        console.log('Waiting for contract addresses...');
        return;
    }
    
    invoiceNFTContract = new web3.eth.Contract(invoiceNFTABI, contractAddresses.invoiceNFT);
    financingContract = new web3.eth.Contract(financingABI, contractAddresses.invoiceFinancing);
    
    if (contractAddresses.riskOracle) {
        riskOracleContract = new web3.eth.Contract(riskOracleABI, contractAddresses.riskOracle);
    }
    
    console.log('Contracts initialized');
}

async function loadData() {
    if (!invoiceNFTContract) return;
    
    // Load available invoices
    await loadAvailableInvoices();
    
    // Load portfolio if connected
    if (currentAccount) {
        await loadPortfolio();
    }
    
    // Load platform stats from backend
    await loadPlatformStats();
}

async function mintInvoice(event) {
    event.preventDefault();
    
    if (!invoiceNFTContract || !currentAccount) {
        alert('Please connect wallet first');
        return;
    }
    
    const buyerAddress = document.getElementById('buyerAddress').value;
    const invoiceAmount = document.getElementById('invoiceAmount').value;
    const dueDate = new Date(document.getElementById('dueDate').value);
    const description = document.getElementById('invoiceDescription').value;
    
    // Basic validation
    if (!web3.utils.isAddress(buyerAddress)) {
        alert('Please enter a valid Ethereum address for buyer');
        return;
    }
    
    if (invoiceAmount <= 0) {
        alert('Please enter a valid invoice amount');
        return;
    }
    
    if (dueDate <= new Date()) {
        alert('Due date must be in the future');
        return;
    }
    
    try {
        const amountInWei = web3.utils.toWei(invoiceAmount, 'ether');
        const dueTimestamp = Math.floor(dueDate.getTime() / 1000);
        
        // For demo, use a simple IPFS URI
        const tokenURI = 'ipfs://Qm' + Math.random().toString(36).substring(2) + '/' + description.replace(/[^a-z0-9]/gi, '-');
        
        // Show loading
        const mintBtn = event.target.querySelector('button[type="submit"]');
        const originalText = mintBtn.textContent;
        mintBtn.textContent = 'Minting...';
        mintBtn.disabled = true;
        
        // Estimate gas
        const gasEstimate = await invoiceNFTContract.methods
            .mintInvoice(buyerAddress, amountInWei, dueTimestamp, tokenURI)
            .estimateGas({ from: currentAccount });
        
        // Send transaction
        const result = await invoiceNFTContract.methods
            .mintInvoice(buyerAddress, amountInWei, dueTimestamp, tokenURI)
            .send({ 
                from: currentAccount,
                gas: Math.floor(gasEstimate * 1.2)
            });
        
        alert('Invoice NFT minted successfully! Transaction: ' + result.transactionHash);
        
        // Reset form
        document.getElementById('mintForm').reset();
        
        // Reload data
        loadData();
        
    } catch (error) {
        console.error('Error minting invoice:', error);
        alert('Error: ' + error.message);
    } finally {
        // Reset button
        if (mintBtn) {
            mintBtn.textContent = originalText;
            mintBtn.disabled = false;
        }
    }
}

async function handleDocumentUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const uploadStatus = document.getElementById('uploadStatus');
    uploadStatus.innerHTML = '<div class="alert alert-info">Uploading document...</div>';
    
    const formData = new FormData();
    formData.append('invoice', file);
    
    try {
        const response = await fetch(`${API_URL}/api/upload`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            uploadStatus.innerHTML = `
                <div class="alert alert-success">
                    <strong>Document uploaded successfully!</strong><br>
                    File: ${result.file.originalname}<br>
                    Size: ${(result.file.size / 1024).toFixed(2)} KB<br>
                    <a href="${result.file.url}" target="_blank">View Document</a>
                </div>
            `;
        } else {
            uploadStatus.innerHTML = `<div class="alert alert-danger">Upload failed: ${result.error}</div>`;
        }
    } catch (error) {
        uploadStatus.innerHTML = `<div class="alert alert-danger">Upload error: ${error.message}</div>`;
    }
}

async function calculateRiskScore() {
    const msmeAddress = document.getElementById('riskMsmeAddress').value;
    const buyerAddress = document.getElementById('riskBuyerAddress').value;
    const invoiceAmount = document.getElementById('riskInvoiceAmount').value;
    const dueDate = document.getElementById('riskDueDate').value;
    
    if (!msmeAddress || !buyerAddress || !invoiceAmount || !dueDate) {
        alert('Please fill all risk assessment fields');
        return;
    }
    
    const riskResult = document.getElementById('riskResult');
    riskResult.innerHTML = '<div class="alert alert-info">Calculating risk score...</div>';
    
    try {
        const response = await fetch(`${API_URL}/api/risk-score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                msmeDetails: { address: msmeAddress },
                buyerDetails: { address: buyerAddress },
                invoiceAmount: parseFloat(invoiceAmount),
                dueDate: new Date(dueDate).toISOString()
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            riskResult.innerHTML = `
                <div class="alert alert-${result.color}">
                    <h5>Risk Assessment Result</h5>
                    <p><strong>Risk Score:</strong> ${result.riskScore}/100</p>
                    <p><strong>Risk Level:</strong> 
                        <span class="badge bg-${result.color}">${result.riskLevel}</span>
                    </p>
                    <p><strong>Recommendations:</strong></p>
                    <ul>
                        ${result.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else {
            riskResult.innerHTML = `<div class="alert alert-danger">Risk calculation failed: ${result.error}</div>`;
        }
    } catch (error) {
        riskResult.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
}

async function loadAvailableInvoices() {
    if (!invoiceNFTContract) return;
    
    try {
        // Get total token count
        const totalSupply = await invoiceNFTContract.methods.totalSupply().call();
        
        const invoicesList = document.getElementById('invoicesList');
        invoicesList.innerHTML = '';
        
        if (totalSupply == 0) {
            invoicesList.innerHTML = '<div class="alert alert-info">No invoices available for financing yet.</div>';
            return;
        }
        
        // For demo, show last 10 invoices
        const start = Math.max(0, totalSupply - 10);
        
        for (let i = start; i < totalSupply; i++) {
            try {
                const invoice = await invoiceNFTContract.methods.getInvoiceDetails(i).call();
                
                // Check if already financed
                let isFinanced = false;
                try {
                    isFinanced = await financingContract.methods.invoiceFinanced(i).call();
                } catch (e) {}
                
                if (!invoice.isSettled) {
                    const invoiceCard = createInvoiceCard(i, invoice, isFinanced);
                    invoicesList.appendChild(invoiceCard);
                }
            } catch (error) {
                console.log('Error loading invoice', i, error);
            }
        }
        
    } catch (error) {
        console.error('Error loading invoices:', error);
        document.getElementById('invoicesList').innerHTML = 
            '<div class="alert alert-warning">Error loading invoices. Make sure contracts are deployed.</div>';
    }
}

function createInvoiceCard(tokenId, invoice, isFinanced) {
    const div = document.createElement('div');
    div.className = 'invoice-card ' + (isFinanced ? 'funded' : '');
    
    const dueDate = new Date(invoice.dueDate * 1000);
    const amount = web3.utils.fromWei(invoice.invoiceAmount, 'ether');
    const now = new Date();
    const isOverdue = dueDate < now;
    
    div.innerHTML = \`
        <div class="d-flex justify-content-between align-items-start">
            <div>
                <h6>Invoice #\${tokenId}</h6>
                <p class="mb-1"><strong>Amount:</strong> \${amount} ETH</p>
                <p class="mb-1"><strong>Due:</strong> \${dueDate.toLocaleDateString()} 
                    \${isOverdue ? '<span class="badge bg-danger ms-2">OVERDUE</span>' : ''}
                </p>
                <p class="mb-1"><strong>MSME:</strong> \${invoice.msmeAddress.substring(0, 8)}...</p>
                <p class="mb-1"><strong>Buyer:</strong> \${invoice.buyerAddress.substring(0, 8)}...</p>
                <p class="mb-1"><strong>Risk Score:</strong> \${invoice.riskScore || 'Not assessed'}</p>
            </div>
            <div class="text-end">
                <span class="badge \${isFinanced ? 'bg-warning' : 'bg-success'}">
                    \${isFinanced ? 'Funded' : 'Available'}
                </span>
                <br>
                \${!isFinanced ? \`
                    <button class="btn btn-sm btn-primary mt-2" onclick="openInvestModal(\${tokenId}, '\${amount}', '\${invoice.msmeAddress}')">
                        Invest
                    </button>
                \` : \`
                    <button class="btn btn-sm btn-secondary mt-2" disabled>
                        Already Funded
                    </button>
                \`}
            </div>
        </div>
    \`;
    
    return div;
}

function openInvestModal(tokenId, amount, msmeAddress) {
    document.getElementById('modalInvoiceId').textContent = tokenId;
    document.getElementById('modalInvoiceAmount').textContent = amount;
    document.getElementById('modalInvoiceMSME').textContent = msmeAddress.substring(0, 8) + '...';
    
    const modal = new bootstrap.Modal(document.getElementById('investModal'));
    modal.show();
}

async function submitInvestment(event) {
    event.preventDefault();
    
    if (!financingContract || !currentAccount) {
        alert('Please connect wallet first');
        return;
    }
    
    const tokenId = document.getElementById('modalInvoiceId').textContent;
    const financingAmount = document.getElementById('financingAmount').value;
    const interestRate = document.getElementById('interestRate').value;
    
    if (!financingAmount || !interestRate) {
        alert('Please enter both financing amount and interest rate');
        return;
    }
    
    try {
        const amountInWei = web3.utils.toWei(financingAmount, 'ether');
        
        // Show loading
        const investBtn = event.target.querySelector('button[type="submit"]');
        const originalText = investBtn.textContent;
        investBtn.textContent = 'Processing...';
        investBtn.disabled = true;
        
        const result = await financingContract.methods
            .offerFinancing(tokenId, amountInWei, interestRate)
            .send({ 
                from: currentAccount,
                value: amountInWei
            });
        
        alert('Investment offer submitted! Transaction: ' + result.transactionHash);
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('investModal')).hide();
        
        // Reset form
        document.getElementById('investForm').reset();
        
        // Reload data
        loadData();
        
    } catch (error) {
        console.error('Error submitting investment:', error);
        alert('Error: ' + error.message);
    } finally {
        // Reset button
        if (investBtn) {
            investBtn.textContent = originalText;
            investBtn.disabled = false;
        }
    }
}

async function loadPortfolio() {
    if (!financingContract || !currentAccount) return;
    
    try {
        // Get MSME invoices
        const myInvoicesDiv = document.getElementById('myInvoices');
        const myInvestmentsDiv = document.getElementById('myInvestments');
        
        // Clear previous content
        myInvoicesDiv.innerHTML = '<p>Loading...</p>';
        myInvestmentsDiv.innerHTML = '<p>Loading...</p>';
        
        // Get invoices where user is MSME
        try {
            const msmeInvoices = await financingContract.methods.getMSMEInvoices(currentAccount).call();
            
            if (msmeInvoices.length > 0) {
                let html = '<div class="list-group">';
                
                for (const tokenId of msmeInvoices) {
                    const invoice = await invoiceNFTContract.methods.getInvoiceDetails(tokenId).call();
                    const amount = web3.utils.fromWei(invoice.invoiceAmount, 'ether');
                    const dueDate = new Date(invoice.dueDate * 1000);
                    
                    html += \`
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <strong>Invoice #\${tokenId}</strong><br>
                                    Amount: \${amount} ETH<br>
                                    Due: \${dueDate.toLocaleDateString()}
                                </div>
                                <div>
                                    <span class="badge \${invoice.isSettled ? 'bg-success' : invoice.isFinanced ? 'bg-warning' : 'bg-info'}">
                                        \${invoice.isSettled ? 'Settled' : invoice.isFinanced ? 'Financed' : 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    \`;
                }
                
                html += '</div>';
                myInvoicesDiv.innerHTML = html;
            } else {
                myInvoicesDiv.innerHTML = '<p class="text-muted">No invoices created yet.</p>';
            }
        } catch (error) {
            myInvoicesDiv.innerHTML = '<p class="text-muted">Unable to load invoices.</p>';
        }
        
        // Get investor portfolio
        try {
            const investments = await financingContract.methods.getInvestorPortfolio(currentAccount).call();
            
            if (investments.length > 0) {
                let html = '<div class="list-group">';
                
                for (const tokenId of investments) {
                    const invoice = await invoiceNFTContract.methods.getInvoiceDetails(tokenId).call();
                    const amount = web3.utils.fromWei(invoice.invoiceAmount, 'ether');
                    
                    // Try to get financing details
                    let financingDetails = '';
                    try {
                        const offers = await financingContract.methods.getOffers(tokenId).call();
                        for (const offer of offers) {
                            if (offer.investor.toLowerCase() === currentAccount.toLowerCase() && offer.accepted) {
                                financingDetails = \`Financed: \${web3.utils.fromWei(offer.financingAmount, 'ether')} ETH at \${offer.interestRate}%\`;
                                break;
                            }
                        }
                    } catch (e) {}
                    
                    html += \`
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <strong>Invoice #\${tokenId}</strong><br>
                                    Invoice Amount: \${amount} ETH<br>
                                    \${financingDetails ? financingDetails : 'Offer pending'}
                                </div>
                                <div>
                                    <span class="badge \${invoice.isSettled ? 'bg-success' : 'bg-warning'}">
                                        \${invoice.isSettled ? 'Repaid' : 'Active'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    \`;
                }
                
                html += '</div>';
                myInvestmentsDiv.innerHTML = html;
            } else {
                myInvestmentsDiv.innerHTML = '<p class="text-muted">No investments yet.</p>';
            }
        } catch (error) {
            myInvestmentsDiv.innerHTML = '<p class="text-muted">Unable to load investments.</p>';
        }
        
    } catch (error) {
        console.error('Error loading portfolio:', error);
    }
}

async function loadPlatformStats() {
    try {
        const response = await fetch(\`\${API_URL}/api/stats\`);
        const stats = await response.json();
        
        const statsDiv = document.getElementById('platformStats');
        if (statsDiv) {
            statsDiv.innerHTML = \`
                <div class="row">
                    <div class="col-md-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h3>\${stats.totalInvoices}</h3>
                                <p class="text-muted">Total Invoices</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h3>\${stats.totalFinanced}</h3>
                                <p class="text-muted">Financed</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h3>\${stats.defaultRate}</h3>
                                <p class="text-muted">Default Rate</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center">
                            <div class="card-body">
                                <h3>\${stats.activeInvestors}</h3>
                                <p class="text-muted">Active Investors</p>
                            </div>
                        </div>
                    </div>
                </div>
            \`;
        }
    } catch (error) {
        console.log('Could not load platform stats:', error);
    }
}

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.list-group-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName + 'Section').style.display = 'block';
    
    // Activate corresponding nav item
    event.target.classList.add('active');
}

// Listen for account changes
if (window.ethereum) {
    window.ethereum.on('accountsChanged', (newAccounts) => {
        if (newAccounts.length === 0) {
            // User disconnected wallet
            location.reload();
        } else {
            currentAccount = newAccounts[0];
            updateWalletInfo();
            loadData();
        }
    });
    
    window.ethereum.on('chainChanged', () => {
        location.reload();
    });
}

// Initialize when page loads
window.addEventListener('load', init);
