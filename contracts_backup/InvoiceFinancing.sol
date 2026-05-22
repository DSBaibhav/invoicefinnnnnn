// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// For OpenZeppelin v4.9.6, ReentrancyGuard is in SECURITY folder (not utils)
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./InvoiceNFT.sol";

contract InvoiceFinancing is ReentrancyGuard {
    InvoiceNFT public invoiceNFT;
    
    struct FinancingOffer {
        uint256 tokenId;
        uint256 financingAmount;
        uint256 interestRate;
        address investor;
        bool accepted;
        uint256 timestamp;
    }
    
    struct PaymentSchedule {
        uint256 tokenId;
        uint256 principal;
        uint256 interest;
        uint256 totalDue;
        uint256 dueDate;
        bool paid;
    }
    
    mapping(uint256 => FinancingOffer[]) public offers;
    mapping(uint256 => bool) public invoiceFinanced;
    mapping(uint256 => PaymentSchedule) public paymentSchedules;
    mapping(address => uint256[]) public investorPortfolio;
    mapping(address => uint256[]) public msmeInvoices;
    
    event FinancingOffered(uint256 indexed tokenId, address investor, uint256 amount, uint256 interest);
    event FinancingAccepted(uint256 indexed tokenId, address investor, address msme);
    event PaymentSettled(uint256 indexed tokenId, address payer, uint256 amount);
    event PaymentDefault(uint256 indexed tokenId, address msme);
    
    constructor(address _invoiceNFTAddress) {
        invoiceNFT = InvoiceNFT(_invoiceNFTAddress);
    }
    
    function offerFinancing(
        uint256 tokenId,
        uint256 financingAmount,
        uint256 interestRate
    ) external payable nonReentrant {
        require(msg.value == financingAmount, "Send exact financing amount");
        require(!invoiceFinanced[tokenId], "Invoice already financed");
        
        // Get invoice details
        (address msmeAddress, , uint256 invoiceAmount, uint256 dueDate, , , , bool isFinanced, , , ) = 
            invoiceNFT.getInvoiceDetails(tokenId);
            
        require(!isFinanced, "Invoice already financed");
        require(financingAmount <= invoiceAmount, "Cannot finance more than invoice amount");
        require(dueDate > block.timestamp, "Invoice already due");
        
        offers[tokenId].push(FinancingOffer({
            tokenId: tokenId,
            financingAmount: financingAmount,
            interestRate: interestRate,
            investor: msg.sender,
            accepted: false,
            timestamp: block.timestamp
        }));
        
        investorPortfolio[msg.sender].push(tokenId);
        
        emit FinancingOffered(tokenId, msg.sender, financingAmount, interestRate);
    }
    
    function acceptFinancing(uint256 tokenId, uint256 offerIndex) external nonReentrant {
        require(offerIndex < offers[tokenId].length, "Invalid offer index");
        
        FinancingOffer storage offer = offers[tokenId][offerIndex];
        require(!offer.accepted, "Offer already accepted");
        
        // Get invoice details
        (address msmeAddress, , , uint256 dueDate, , , , , , , ) = 
            invoiceNFT.getInvoiceDetails(tokenId);
            
        require(msg.sender == msmeAddress, "Only MSME can accept");
        
        // Transfer funds to MSME
        payable(msmeAddress).transfer(offer.financingAmount);
        
        // Mark as financed
        invoiceFinanced[tokenId] = true;
        offer.accepted = true;
        
        // Create payment schedule
        uint256 totalInterest = (offer.financingAmount * offer.interestRate * (dueDate - block.timestamp)) / (365 days * 100);
        uint256 totalDue = offer.financingAmount + totalInterest;
        
        paymentSchedules[tokenId] = PaymentSchedule({
            tokenId: tokenId,
            principal: offer.financingAmount,
            interest: totalInterest,
            totalDue: totalDue,
            dueDate: dueDate,
            paid: false
        });
        
        msmeInvoices[msmeAddress].push(tokenId);
        
        emit FinancingAccepted(tokenId, offer.investor, msmeAddress);
    }
    
    function settlePayment(uint256 tokenId) external payable nonReentrant {
        require(invoiceFinanced[tokenId], "Invoice not financed");
        
        PaymentSchedule storage schedule = paymentSchedules[tokenId];
        require(!schedule.paid, "Already settled");
        require(msg.value >= schedule.totalDue, "Insufficient payment");
        
        // Find the investor who financed this
        FinancingOffer[] storage tokenOffers = offers[tokenId];
        address investor;
        for (uint i = 0; i < tokenOffers.length; i++) {
            if (tokenOffers[i].accepted) {
                investor = tokenOffers[i].investor;
                break;
            }
        }
        
        require(investor != address(0), "No investor found");
        
        // Transfer payment to investor
        payable(investor).transfer(schedule.totalDue);
        
        // Refund excess
        if (msg.value > schedule.totalDue) {
            payable(msg.sender).transfer(msg.value - schedule.totalDue);
        }
        
        schedule.paid = true;
        
        emit PaymentSettled(tokenId, msg.sender, schedule.totalDue);
    }
    
    function getOffers(uint256 tokenId) external view returns (FinancingOffer[] memory) {
        return offers[tokenId];
    }
    
    function getPaymentSchedule(uint256 tokenId) external view returns (PaymentSchedule memory) {
        return paymentSchedules[tokenId];
    }
    
    function getInvestorPortfolio(address investor) external view returns (uint256[] memory) {
        return investorPortfolio[investor];
    }
    
    function getMSMEInvoices(address msme) external view returns (uint256[] memory) {
        return msmeInvoices[msme];
    }
}



