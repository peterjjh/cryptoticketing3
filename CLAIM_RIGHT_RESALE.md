# Claim Right Resale Feature

## Overview
Users can now resell their **lottery win (claim right)** before actually claiming the NFT ticket. This allows secondary market trading of the right to mint the ticket, not just the minted NFT itself.

## User Flow

### Scenario 1: Selling a Claim Right (Before Claiming NFT)
1. User wins the lottery for an event
2. User sees two buttons:
   - **"Claim NFT Ticket"** - Mint the NFT immediately
   - **"Resell Claim Right"** - List the claim right for sale
3. User clicks **"Resell Claim Right"** and sets a resale price
4. The claim right is listed in the marketplace as "Lottery Win (Unclaimed)"
5. **IMPORTANT**: The original winner can still claim the NFT themselves until someone purchases it
6. Once purchased by another user, the original winner's buttons change:
   - "Claim NFT Ticket" becomes **"🔒 Claim Right Sold"** (disabled)
   - "Resell Claim Right" button disappears

### Scenario 2: Buying a Claim Right
1. Buyer browses the marketplace at `/marketplace`
2. Sees listings marked as "🎟️ CLAIM RIGHT" with "Unclaimed lottery win" status
3. Clicks **"Buy Claim Right"** button
4. After purchase:
   - Original seller loses ability to claim
   - Original listing is removed from marketplace
   - New owner can now claim the NFT ticket
   - Claim right appears in the new owner's event card with a purple banner
5. New owner clicks **"Claim Your NFT Ticket"** to mint the NFT

### Scenario 3: Claiming Your Own NFT (After Listing for Resale)
1. User lists claim right for resale
2. Before anyone buys it, user decides to claim themselves
3. User clicks **"Claim NFT Ticket"** button
4. NFT is minted successfully
5. Changes after claiming:
   - "Claim NFT Ticket" button becomes **"✅ NFT Ticket Claimed"** (disabled)
   - "Resell Claim Right" button disappears
   - Listing is automatically removed from marketplace
   - Ticket appears in "Your Claimed Tickets" section
6. User can now resell the actual NFT ticket from "Your Claimed Tickets"

### Scenario 4: Selling a Minted NFT (After Claiming)
1. User has already claimed their NFT ticket
2. The ticket appears in "Your Claimed Tickets" section
3. They click **"Resell Ticket"** next to the claimed ticket
4. Set resale price and list it
5. Buyers purchase the actual NFT ticket via smart contract transfer

## Technical Implementation

### Data Structure
```typescript
type TicketData = {
  tokenId?: number;        // Optional - only for minted NFTs
  eventId: number;
  eventName?: string;
  state?: number;          // Only for minted NFTs
  mintTime?: number;       // Only for minted NFTs
  isClaimRight?: boolean;  // true = selling claim right, false = selling NFT
  winnerAddress?: string;  // Original winner's address
}
```

### localStorage Keys
- `cryptoTicketing_resoldTickets` - All marketplace listings (both claim rights and NFTs)
- `cryptoTicketing_claimRights` - Purchased claim rights awaiting claim by new owner

### Component Changes

#### App.tsx
- Added state for `purchasedClaimRights` and `soldClaimRights`
- Tracks which claim rights have been sold to other users
- "Claim NFT Ticket" button becomes:
  - **"✅ NFT Ticket Claimed"** (disabled) after claiming
  - **"🔒 Claim Right Sold"** (disabled) if sold to another user
- "Resell Claim Right" button only visible if NOT claimed and NOT sold
- When claiming NFT:
  - Removes listing from marketplace if it was listed
  - Removes from purchased claim rights
  - Updates claimed tickets list
  
#### Resale.tsx
- Accepts both claim rights and minted NFTs
- Different UI display for claim rights vs NFTs
- Stores `isClaimRight` flag in marketplace listing
- Listing doesn't prevent original winner from claiming

#### ResalePanel.tsx
- Differentiates between claim rights and NFTs in marketplace
- Claim rights show "🎟️ CLAIM RIGHT" badge
- Purchase flow:
  - **Claim rights**: Updates localStorage with buyer as new owner and seller as original winner
  - **NFTs**: Calls smart contract `transferTicket` function
- Tracks `originalWinner` to identify who sold the claim right

## Price Validation
Both claim rights and NFT tickets are subject to the event's `maxTransferPricePercentage` limit:
- Max resale price = stake amount × (maxTransferPricePercentage / 100)
- Prevents price gouging while allowing market pricing

## User Benefits
1. **Liquidity**: Winners can monetize their win immediately without waiting to claim
2. **Flexibility**: Buyers get the right to claim at face value if they missed the lottery
3. **Market efficiency**: Price discovery happens before NFT minting costs are incurred
4. **No gas waste**: If reselling immediately, no need to mint first

## Example Workflow
```
1. Alice wins lottery (stake: 0.1 ETH, max transfer: 200%)
2. Alice lists claim right for 0.15 ETH (within 0.2 ETH limit)
3. Bob buys claim right for 0.15 ETH
4. Bob now has the right to claim the NFT ticket
5. Bob claims the NFT ticket (mints it)
6. Bob can later resell the minted NFT ticket for up to 0.2 ETH
```

## Testing Instructions
1. Start local blockchain: `./start-dev.sh`
2. Create an event and run lottery
3. As a winner, click "Resell Claim Right" instead of claiming
4. Visit marketplace to see your listing
5. Switch to different wallet and purchase the claim right
6. Original winner should no longer see claim button
7. New owner should see purple "PURCHASED CLAIM RIGHT" banner
8. New owner claims the NFT ticket
9. Ticket appears in their "Claimed Tickets" section
10. They can now resell the minted NFT if desired
