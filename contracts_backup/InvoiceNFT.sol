// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// For OpenZeppelin v4.x
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract InvoiceNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    
    struct InvoiceDetails {
        address msmeAddress;
        address buyerAddress;
        uint256 invoiceAmount;
        uint256 dueDate;
        uint256 financingAmount;
        uint256 interestRate;
        uint256 riskScore;
        bool isFinanced;
        bool isSettled;
        address investor;
        string invoiceURI;
    }
    
    mapping(uint256 => InvoiceDetails) public invoiceDetails;
    
    event InvoiceMinted(uint256 tokenId, address indexed msme, uint256 amount);
    event InvoiceFinanced(uint256 tokenId, address indexed investor, uint256 financingAmount);
    event InvoiceSettled(uint256 tokenId, uint256 settlementAmount);
    
    constructor() ERC721("InvoiceNFT", "INV") {}
    
    function mintInvoice(
        address buyer,
        uint256 invoiceAmount,
        uint256 dueDate,
        string memory tokenURI
    ) external returns (uint256) {
        require(invoiceAmount > 0, "Amount must be > 0");
        require(dueDate > block.timestamp, "Due date must be in future");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        invoiceDetails[tokenId] = InvoiceDetails({
            msmeAddress: msg.sender,
            buyerAddress: buyer,
            invoiceAmount: invoiceAmount,
            dueDate: dueDate,
            financingAmount: 0,
            interestRate: 0,
            riskScore: 0,
            isFinanced: false,
            isSettled: false,
            investor: address(0),
            invoiceURI: tokenURI
        });
        
        emit InvoiceMinted(tokenId, msg.sender, invoiceAmount);
        return tokenId;
    }
    
    // FIXED: Added totalSupply function
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter.current();
    }
    
    function getInvoiceDetails(uint256 tokenId) external view returns (
        address msmeAddress,
        address buyerAddress,
        uint256 invoiceAmount,
        uint256 dueDate,
        uint256 financingAmount,
        uint256 interestRate,
        uint256 riskScore,
        bool isFinanced,
        bool isSettled,
        address investor,
        string memory invoiceURI
    ) {
        InvoiceDetails memory details = invoiceDetails[tokenId];
        return (
            details.msmeAddress,
            details.buyerAddress,
            details.invoiceAmount,
            details.dueDate,
            details.financingAmount,
            details.interestRate,
            details.riskScore,
            details.isFinanced,
            details.isSettled,
            details.investor,
            details.invoiceURI
        );
    }
    
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

