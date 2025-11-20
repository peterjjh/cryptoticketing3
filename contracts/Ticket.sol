// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Simple Ticket NFT
 * @dev Basic ERC-721 ticket with states and transfer price limits
 */
contract Ticket is ERC721, Ownable, ReentrancyGuard {
    enum TicketState { Active, CheckedIn, Retired }

    struct TicketInfo {
        uint256 eventId;
        TicketState state;
        uint256 mintTime;
    }

    struct EventSale {
        uint256 stakeAmount;
        uint256 ticketSupply;
        uint256 ticketsMinted;
        bool isOpen;
        bool lotteryExecuted;
        uint256 winnersCount;
        uint256 maxTransferPricePercent; // NEW: % of original price (e.g., 50 = 50%)
        address[] entrants;
        mapping(address => bool) hasEntered;
        mapping(address => bool) isWinner;
        mapping(address => bool) hasClaimed;
    }

    mapping(uint256 => TicketInfo) public tickets;
    mapping(uint256 => EventSale) private eventSales;
    mapping(uint256 => mapping(address => uint256)) public pendingRefunds;
    mapping(uint256 => address) public eventOwners;
    mapping(uint256 => mapping(address => uint256)) public ticketTransferPrices; // NEW: Track transfer price attempts

    uint256 private _nextTokenId;

    event TicketMinted(uint256 indexed tokenId, address indexed to);
    event TicketCheckedIn(uint256 indexed tokenId);
    event SaleConfigured(uint256 indexed eventId, uint256 stakeAmount, uint256 ticketSupply, uint256 maxTransferPricePercent);
    event SaleEntered(uint256 indexed eventId, address indexed participant, uint256 amount);
    event LotteryExecuted(uint256 indexed eventId, uint256 winnersCount, bytes32 randomness);
    event TicketClaimed(uint256 indexed eventId, uint256 indexed tokenId, address indexed winner);
    event StakeWithdrawn(uint256 indexed eventId, address indexed participant, uint256 amount);
    event TicketTransferred(uint256 indexed tokenId, address indexed from, address indexed to, uint256 transferPrice);
    event TicketTransferAttemptFailed(uint256 indexed tokenId, address indexed from, address indexed to, string reason);

    constructor(string memory name, string memory symbol) ERC721(name, symbol) Ownable(msg.sender) {}

    modifier onlyEventOwner(uint256 eventId) {
        require(eventOwners[eventId] == msg.sender, "Not event owner");
        _;
    }

    function mint(address to, uint256 eventId) external onlyOwner returns (uint256) {
        return _issueTicket(to, eventId);
    }

    function checkIn(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Ticket does not exist");
        require(tickets[tokenId].state == TicketState.Active, "Ticket not active");

        tickets[tokenId].state = TicketState.CheckedIn;
        emit TicketCheckedIn(tokenId);
    }

    function getTicket(uint256 tokenId) external view returns (TicketInfo memory) {
        require(_ownerOf(tokenId) != address(0), "Ticket does not exist");
        return tickets[tokenId];
    }

    function configureEventSale(uint256 eventId, uint256 stakeAmount, uint256 ticketSupply, uint256 maxTransferPricePercent) external {
        require(stakeAmount > 0, "Stake must be positive");
        require(ticketSupply > 0, "Ticket supply must be positive");
        require(maxTransferPricePercent > 0 && maxTransferPricePercent <= 100, "Max transfer price must be 1-100%");

        EventSale storage sale = eventSales[eventId];
        require(!sale.isOpen && sale.entrants.length == 0, "Sale active or populated");

        sale.stakeAmount = stakeAmount;
        sale.ticketSupply = ticketSupply;
        sale.ticketsMinted = 0;
        sale.isOpen = true;
        sale.lotteryExecuted = false;
        sale.winnersCount = 0;
        sale.maxTransferPricePercent = maxTransferPricePercent; // NEW: Store max transfer price

        eventOwners[eventId] = msg.sender;

        emit SaleConfigured(eventId, stakeAmount, ticketSupply, maxTransferPricePercent);
    }

    function getSaleOverview(uint256 eventId)
        external
        view
        returns (
            uint256 stakeAmount,
            uint256 ticketSupply,
            uint256 ticketsMinted,
            bool isOpen,
            bool lotteryExecuted,
            uint256 entrantsCount,
            uint256 winnersCount
        )
    {
        EventSale storage sale = eventSales[eventId];
        return (
            sale.stakeAmount,
            sale.ticketSupply,
            sale.ticketsMinted,
            sale.isOpen,
            sale.lotteryExecuted,
            sale.entrants.length,
            sale.winnersCount
        );
    }

    function getEventMaxTransferPrice(uint256 eventId) external view returns (uint256) {
        return eventSales[eventId].maxTransferPricePercent;
    }

    function hasEnteredSale(uint256 eventId, address participant) external view returns (bool) {
        return eventSales[eventId].hasEntered[participant];
    }

    function isSaleWinner(uint256 eventId, address participant) external view returns (bool) {
        return eventSales[eventId].isWinner[participant];
    }

    function enterSale(uint256 eventId) external payable nonReentrant {
        EventSale storage sale = eventSales[eventId];
        require(sale.isOpen, "Sale not open");
        require(!sale.lotteryExecuted, "Lottery already run");
        require(msg.value == sale.stakeAmount, "Incorrect stake amount");
        require(!sale.hasEntered[msg.sender], "Already entered");

        sale.hasEntered[msg.sender] = true;
        sale.entrants.push(msg.sender);

        emit SaleEntered(eventId, msg.sender, msg.value);
    }

    function runLottery(uint256 eventId, uint256 winnersCount, bytes32 randomSeed) external onlyOwner {
        EventSale storage sale = eventSales[eventId];
        require(sale.isOpen, "Sale not open");
        require(!sale.lotteryExecuted, "Lottery already run");
        require(winnersCount > 0, "No winners requested");
        require(winnersCount <= sale.ticketSupply, "Winners exceed supply");
        require(winnersCount <= sale.entrants.length, "Not enough entrants");

        uint256 entrantsCount = sale.entrants.length;
        address[] memory pool = new address[](entrantsCount);
        for (uint256 i = 0; i < entrantsCount; i++) {
            pool[i] = sale.entrants[i];
        }

        uint256 remaining = entrantsCount;
        uint256 selected = 0;

        while (selected < winnersCount) {
            uint256 idx = uint256(keccak256(abi.encode(randomSeed, selected, remaining))) % remaining;
            address winner = pool[idx];

            sale.isWinner[winner] = true;
            pool[idx] = pool[remaining - 1];
            remaining--;
            selected++;
        }

        for (uint256 i = 0; i < entrantsCount; i++) {
            address participant = sale.entrants[i];
            if (!sale.isWinner[participant]) {
                pendingRefunds[eventId][participant] += sale.stakeAmount;
            }
        }

        sale.lotteryExecuted = true;
        sale.isOpen = false;
        sale.winnersCount = winnersCount;

        emit LotteryExecuted(eventId, winnersCount, randomSeed);
    }

    function runLotteryAsEventOwner(uint256 eventId, uint256 winnersCount, bytes32 randomSeed) external onlyEventOwner(eventId) {
        _executeLottery(eventId, winnersCount, randomSeed);
    }

    function _executeLottery(uint256 eventId, uint256 winnersCount, bytes32 randomSeed) internal {
        EventSale storage sale = eventSales[eventId];
        require(sale.isOpen, "Sale not open");
        require(!sale.lotteryExecuted, "Lottery already run");
        require(winnersCount > 0, "No winners requested");
        require(winnersCount <= sale.ticketSupply, "Winners exceed supply");
        require(winnersCount <= sale.entrants.length, "Not enough entrants");

        uint256 entrantsCount = sale.entrants.length;
        address[] memory pool = new address[](entrantsCount);
        for (uint256 i = 0; i < entrantsCount; i++) {
            pool[i] = sale.entrants[i];
        }

        uint256 remaining = entrantsCount;
        uint256 selected = 0;

        while (selected < winnersCount) {
            uint256 idx = uint256(keccak256(abi.encode(randomSeed, selected, remaining))) % remaining;
            address winner = pool[idx];

            sale.isWinner[winner] = true;
            pool[idx] = pool[remaining - 1];
            remaining--;
            selected++;
        }

        for (uint256 i = 0; i < entrantsCount; i++) {
            address participant = sale.entrants[i];
            if (!sale.isWinner[participant]) {
                pendingRefunds[eventId][participant] += sale.stakeAmount;
            }
        }

        sale.lotteryExecuted = true;
        sale.isOpen = false;
        sale.winnersCount = winnersCount;

        emit LotteryExecuted(eventId, winnersCount, randomSeed);
    }

    function claimTicket(uint256 eventId) external nonReentrant returns (uint256) {
        EventSale storage sale = eventSales[eventId];
        require(sale.lotteryExecuted, "Lottery not run");
        require(sale.isWinner[msg.sender], "Not a winner");
        require(!sale.hasClaimed[msg.sender], "Already claimed");
        require(sale.ticketsMinted < sale.ticketSupply, "All tickets claimed");

        sale.hasClaimed[msg.sender] = true;
        sale.ticketsMinted += 1;

        uint256 tokenId = _issueTicket(msg.sender, eventId);
        emit TicketClaimed(eventId, tokenId, msg.sender);
        return tokenId;
    }

    function withdrawStake(uint256 eventId) external nonReentrant {
        uint256 amount = pendingRefunds[eventId][msg.sender];
        require(amount > 0, "Nothing to withdraw");

        pendingRefunds[eventId][msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdraw failed");

        emit StakeWithdrawn(eventId, msg.sender, amount);
    }

    // NEW: Modified transfer with price enforcement
    function transferTicket(uint256 tokenId, address to, uint256 transferPrice) external payable nonReentrant {
        require(_ownerOf(tokenId) == msg.sender, "Not ticket owner");
        require(to != address(0), "Invalid recipient");

        TicketInfo memory ticketInfo = tickets[tokenId];
        EventSale storage sale = eventSales[ticketInfo.eventId];

        // Calculate max allowed transfer price
        uint256 maxAllowedPrice = (sale.stakeAmount * sale.maxTransferPricePercent) / 100;

        // Enforce price limit
        require(
            transferPrice <= maxAllowedPrice,
            string(abi.encodePacked(
                "Transfer price exceeds limit. Max: ",
                _uint2str(maxAllowedPrice),
                " wei, Attempted: ",
                _uint2str(transferPrice),
                " wei"
            ))
        );

        // Store transfer price
        ticketTransferPrices[tokenId][to] = transferPrice;

        // Transfer the ticket
        _safeTransfer(msg.sender, to, tokenId, "");
        emit TicketTransferred(tokenId, msg.sender, to, transferPrice);
    }

    function verifyTicket(uint256 tokenId, uint256 eventId, address holder) external view returns (bool) {
        if (_ownerOf(tokenId) != holder) {
            return false;
        }
        TicketInfo memory info = tickets[tokenId];
        return info.eventId == eventId && info.state == TicketState.Active;
    }

    function _issueTicket(address to, uint256 eventId) internal returns (uint256) {
        uint256 tokenId = _nextTokenId++;

        tickets[tokenId] = TicketInfo({
            eventId: eventId,
            state: TicketState.Active,
            mintTime: block.timestamp
        });

        _safeMint(to, tokenId);
        emit TicketMinted(tokenId, to);
        return tokenId;
    }

    // HELPER: Convert uint to string for error messages
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}