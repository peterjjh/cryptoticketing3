# Testing Transfer Winner Status Flow

## Current Situation
- Event ID: 1
- Original Winner: (needs to be identified)
- Buyer: 0xCE9B59B712e0ec2d0CD3159453471db0d2da5dEC
- Buyer paid for claim right but can't claim NFT (not marked as winner on-chain)

## Flow Steps

### 1. Buyer Side (0xCE9B...5dEC)
- ✅ Purchased claim right from marketplace
- ✅ Payment sent to seller
- ❌ Cannot claim NFT yet (needs winner status transfer)
- Should see "🎟️ PURCHASED CLAIM RIGHT" section with "Claim NFT Ticket" button

### 2. Seller Side (Original Winner)
- Should see "⚠️ Action Required: Complete Transfers" section at top of page
- Should see pending transfer for Event 1
- Needs to click "✅ Transfer Winner Status" button
- This calls `transferWinnerStatus(1, 0xCE9B59B712e0ec2d0CD3159453471db0d2da5dEC)`

### 3. After Transfer
- Seller: Pending transfer marked as complete
- Buyer: Can now successfully call `claimTicket(1)` and mint NFT

## Testing Instructions

1. **Open browser with SELLER wallet** (original lottery winner)
   - Connect wallet
   - You should see orange "Action Required" box at top
   - Click "Transfer Winner Status" button
   - Confirm transaction in MetaMask

2. **Switch to BUYER wallet** (0xCE9B59B712e0ec2d0CD3159453471db0d2da5dEC)
   - Refresh page
   - Find Event 1
   - Click "🎫 Claim NFT Ticket" button
   - Confirm transaction in MetaMask
   - NFT should be minted successfully!

## Smart Contract Function
```solidity
function transferWinnerStatus(uint256 eventId, address to) external {
    Sale storage sale = sales[eventId];
    require(sale.lotteryExecuted, "Lottery not executed");
    require(winners[eventId][msg.sender], "Not a winner");
    require(!ticketClaimed[eventId][msg.sender], "Already claimed");
    require(to != address(0), "Invalid recipient");
    
    winners[eventId][msg.sender] = false;
    winners[eventId][to] = true;
    
    emit WinnerStatusTransferred(eventId, msg.sender, to);
}
```
