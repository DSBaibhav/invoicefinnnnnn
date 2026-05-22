// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RiskOracle {
    mapping(address => uint256) public creditScores;
    mapping(uint256 => uint256) public invoiceRiskScores;
    
    event CreditScoreUpdated(address indexed entity, uint256 score);
    event RiskScoreCalculated(uint256 indexed invoiceId, uint256 score);
    
    // In production, this would connect to Chainlink or other oracle
    // For demo, we'll use mock data
    
    function setCreditScore(address entity, uint256 score) external {
        require(score <= 1000, "Score must be <= 1000");
        creditScores[entity] = score;
        emit CreditScoreUpdated(entity, score);
    }
    
    function calculateInvoiceRisk(
        address msme,
        address buyer,
        uint256 invoiceAmount,
        uint256 dueDate
    ) external returns (uint256) {
        // Simplified risk calculation
        uint256 msmeScore = creditScores[msme];
        uint256 buyerScore = creditScores[buyer];
        
        // If scores not set, use default
        if (msmeScore == 0) msmeScore = 500;
        if (buyerScore == 0) buyerScore = 600;
        
        uint256 timeFactor = (dueDate - block.timestamp) > 30 days ? 100 : 50;
        uint256 amountFactor = invoiceAmount > 100 ether ? 100 : 200;
        
        uint256 riskScore = (msmeScore * 3 + buyerScore * 7) / 10 - timeFactor + amountFactor;
        
        // Cap between 300-900
        if (riskScore < 300) riskScore = 300;
        if (riskScore > 900) riskScore = 900;
        
        return riskScore;
    }
    
    function setInvoiceRiskScore(uint256 invoiceId, uint256 score) external {
        invoiceRiskScores[invoiceId] = score;
        emit RiskScoreCalculated(invoiceId, score);
    }
    
    function getRiskScore(uint256 invoiceId) external view returns (uint256) {
        return invoiceRiskScores[invoiceId];
    }
}

