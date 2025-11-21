import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ethers } from 'ethers';

type TicketData = {
  tokenId?: number; // Optional for claim rights
  eventId: number;
  eventName?: string;
  state?: number;
  mintTime?: number;
  isClaimRight?: boolean; // true if selling claim right, false if selling NFT
  winnerAddress?: string; // The original winner's address
};

const Resale = ({ ticketContractWithSigner, walletAddress }: { ticketContractWithSigner: any; walletAddress?: string | null }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const ticketData = location.state?.ticket as TicketData | undefined;

  console.log('Resale component loaded with ticketData:', ticketData);
  console.log('Location state:', location.state);

  const [resalePrice, setResalePrice] = useState<string>('');
  const [maxAllowedPrice, setMaxAllowedPrice] = useState<string>('');
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (!ticketData) {
      return;
    }

    // Fetch event details to get max transfer price
    const fetchEventDetails = async () => {
      try {
        if (!ticketContractWithSigner) return;

        const saleOverview = await ticketContractWithSigner.getSaleOverview(ticketData.eventId);
        const maxTransferPercent = await ticketContractWithSigner.getEventMaxTransferPrice(ticketData.eventId);
        
        const stakeAmountWei = saleOverview.stakeAmount;
        const stakeAmountEth = ethers.utils.formatEther(stakeAmountWei);
        setStakeAmount(stakeAmountEth);

        const maxPriceWei = stakeAmountWei.mul(maxTransferPercent).div(100);
        const maxPriceEth = ethers.utils.formatEther(maxPriceWei);
        setMaxAllowedPrice(maxPriceEth);
      } catch (error) {
        console.error('Error fetching event details:', error);
        setStatusMessage({
          type: 'error',
          text: 'Failed to load ticket pricing information.',
        });
      }
    };

    fetchEventDetails();
  }, [ticketData, ticketContractWithSigner]);

  const handleConfirmResell = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ticketContractWithSigner || !ticketData) {
      setStatusMessage({
        type: 'error',
        text: 'Connect your wallet to resell tickets.',
      });
      return;
    }

    if (!resalePrice || parseFloat(resalePrice) < 0) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter a valid resale price.',
      });
      return;
    }

    // Validate price is within allowed range
    if (parseFloat(resalePrice) > parseFloat(maxAllowedPrice)) {
      setStatusMessage({
        type: 'error',
        text: `Price exceeds maximum allowed (${maxAllowedPrice} ETH).`,
      });
      return;
    }

    // Check if user already has a claim right listing for this event
    if (ticketData.isClaimRight) {
      const stored = localStorage.getItem('cryptoTicketing_resoldTickets');
      if (stored) {
        const existingTickets = JSON.parse(stored);
        const existingListing = existingTickets.find(
          (t: any) => 
            t.eventId === ticketData.eventId && 
            t.isClaimRight === true && 
            t.seller === walletAddress
        );
        
        if (existingListing) {
          setStatusMessage({
            type: 'error',
            text: `You already have a claim right listed for this event at ${existingListing.price} ETH. Please cancel it first.`,
          });
          return;
        }
      }
    }

    try {
      setIsLoading(true);
      setStatusMessage({
        type: 'info',
        text: 'Listing ticket for resale... Confirm in your wallet.',
      });

      // Note: You'll need to implement a resale marketplace contract function
      // For now, we'll use transferTicket as a placeholder
      // In a real implementation, you'd call a marketplace listing function
      
      // Placeholder: This would be replaced with actual marketplace listing
      // const priceWei = ethers.utils.parseEther(resalePrice);
      // const tx = await ticketContractWithSigner.listTicketForResale(ticketData.tokenId, priceWei);
      
      console.log(`Listing ${ticketData.isClaimRight ? 'claim right' : 'ticket'} for ${resalePrice} ETH`);
      console.log('Current ticketData:', ticketData);
      console.log('Current walletAddress:', walletAddress);
      
      // Save to localStorage
      const priceWei = ethers.utils.parseEther(resalePrice);
      console.log('priceWei BigNumber:', priceWei);
      console.log('priceWei as string:', priceWei.toString());
      
      const resoldTicket = {
        tokenId: ticketData.tokenId,
        eventId: ticketData.eventId,
        eventName: ticketData.eventName || `Event #${ticketData.eventId}`,
        seller: walletAddress || 'Unknown',
        price: resalePrice,
        priceWei: priceWei.toString(), // Ensure it's a string, not an object
        timestamp: Date.now(),
        isClaimRight: ticketData.isClaimRight || false,
        winnerAddress: ticketData.isClaimRight ? (walletAddress || ticketData.winnerAddress) : undefined,
      };

      console.log('===== RESALE LISTING DEBUG =====');
      console.log('Resold ticket object:', JSON.stringify(resoldTicket, null, 2));
      console.log('typeof priceWei in object:', typeof resoldTicket.priceWei);
      console.log('================================');

      // Load existing resold tickets
      const stored = localStorage.getItem('cryptoTicketing_resoldTickets');
      console.log('Existing localStorage before save:', stored);
      const existingTickets = stored ? JSON.parse(stored) : [];
      
      // Add new ticket
      existingTickets.push(resoldTicket);
      const serialized = JSON.stringify(existingTickets);
      console.log('About to save to localStorage:', serialized);
      
      // Verify serialization worked
      const testParse = JSON.parse(serialized);
      console.log('Test parse of what we are saving:', testParse);
      if (testParse.length > 0) {
        console.log('First ticket priceWei type:', typeof testParse[testParse.length - 1].priceWei);
        console.log('First ticket priceWei value:', testParse[testParse.length - 1].priceWei);
      }
      
      localStorage.setItem('cryptoTicketing_resoldTickets', serialized);
      
      // Verify it was saved
      const verification = localStorage.getItem('cryptoTicketing_resoldTickets');
      console.log('Verification - what is actually in localStorage now:', verification);
      console.log('Matches what we tried to save:', verification === serialized);
      
      // Show alert for immediate feedback
      alert(`✅ Saved to localStorage!\n\nClaim Right Details:\n- Event ID: ${resoldTicket.eventId}\n- Event Name: ${resoldTicket.eventName}\n- Price: ${resoldTicket.price} ETH\n- Seller: ${resoldTicket.seller}\n- Is Claim Right: ${resoldTicket.isClaimRight}\n\nCheck console for full details.`);
      
      setStatusMessage({
        type: 'success',
        text: ticketData.isClaimRight 
          ? `✅ Claim right listed for ${resalePrice} ETH!`
          : `✅ Ticket #${ticketData.tokenId} listed for ${resalePrice} ETH!`,
      });

      // Redirect to marketplace after 2 seconds
      setTimeout(() => {
        navigate('/marketplace');
      }, 2000);

    } catch (error) {
      console.error('❌ Resale listing failed:', error);
      if (error instanceof Error) {
        setStatusMessage({
          type: 'error',
          text: `Failed to list ticket: ${error.message}`,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!ticketData) {
    return (
      <div
        style={{
          background: 'radial-gradient(circle at 10% 20%, rgba(252, 110, 184, 0.49) 0%, rgba(0, 0, 0, 0) 65%), radial-gradient(circle at 90% 10%, rgba(62, 203, 250, 1) 0%, rgba(0, 0, 0, 0) 65%), #000000ff',
          minHeight: '100vh',
          padding: '40px 32px',
          fontFamily: '"Space Grotesk", "Inter", system-ui, sans-serif',
          color: '#dbe4ff',
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '42px',
              fontWeight: 700,
              color: '#f9feff',
              marginBottom: '24px',
              textShadow: '0 0 32px rgba(165, 92, 255, 1)',
            }}
          >
            No Ticket Selected
          </h1>
          <p style={{ color: '#8ba6ff', marginBottom: '32px' }}>
            Please select a ticket from your claimed tickets to resell.
          </p>
          <Link to="/">
            <button
              type="button"
              style={{
                background: 'linear-gradient(135deg, rgba(0,255,224,0.9), rgba(255,111,216,0.9))',
                color: '#05060f',
                border: '1px solid rgba(105,246,255,0.4)',
                padding: '14px 28px',
                borderRadius: '14px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              ← Back to Home
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'radial-gradient(circle at 10% 20%, rgba(252, 110, 184, 0.49) 0%, rgba(0, 0, 0, 0) 65%), radial-gradient(circle at 90% 10%, rgba(62, 203, 250, 1) 0%, rgba(0, 0, 0, 0) 65%), #000000ff',
        minHeight: '100vh',
        padding: '40px 32px',
        fontFamily: '"Space Grotesk", "Inter", system-ui, sans-serif',
        color: '#dbe4ff',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <h1
            style={{
              fontSize: '42px',
              fontWeight: 700,
              color: '#f9feff',
              margin: 0,
              textShadow: '0 0 32px rgba(165, 92, 255, 1)',
              letterSpacing: '0.06em',
            }}
          >
            Resell Ticket
          </h1>
          <Link to="/">
            <button
              type="button"
              style={{
                background: 'rgba(8, 231, 255, 0.08)',
                color: '#9ad6ff',
                border: '1px solid rgba(120, 215, 255, 0.35)',
                padding: '12px 24px',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              ← Back to Home
            </button>
          </Link>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            style={{
              background:
                statusMessage.type === 'success'
                  ? 'rgba(0, 255, 224, 0.16)'
                  : statusMessage.type === 'error'
                  ? 'rgba(255, 111, 216, 0.16)'
                  : 'rgba(120, 215, 255, 0.16)',
              color:
                statusMessage.type === 'success'
                  ? '#0ddfc2'
                  : statusMessage.type === 'error'
                  ? '#ff72f9'
                  : '#6cd9ff',
              padding: '16px 20px',
              borderRadius: '14px',
              marginBottom: '32px',
              border: '1px solid rgba(105,246,255,0.25)',
              boxShadow: '0 12px 36px rgba(89, 0, 255, 0.22)',
              letterSpacing: '0.04em',
            }}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Ticket Information Card */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            borderRadius: '22px',
            boxShadow: '0 25px 70px rgba(105, 246, 255, 0.25)',
            padding: '32px',
            border: '1px solid rgba(105, 246, 255, 0.25)',
            backdropFilter: 'blur(14px)',
            marginBottom: '32px',
          }}
        >
          <h2
            style={{
              fontSize: '26px',
              marginBottom: '24px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#69f6ff',
              textShadow: '0 0 18px rgba(105, 246, 255, 0.65)',
            }}
          >
            {ticketData.isClaimRight ? '🎟️ Claim Right Details' : '🎫 Ticket Details'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {ticketData.isClaimRight ? (
              <>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Type</p>
                  <strong style={{ fontSize: '18px', color: '#ff9dff' }}>Lottery Win (Unclaimed)</strong>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Event ID</p>
                  <strong style={{ fontSize: '18px', color: '#69f6ff' }}>#{ticketData.eventId}</strong>
                </div>
                {ticketData.eventName && (
                  <div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Event</p>
                    <strong style={{ fontSize: '18px', color: '#dbe4ff' }}>{ticketData.eventName}</strong>
                  </div>
                )}
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Status</p>
                  <strong style={{ fontSize: '18px', color: '#0ddfc2' }}>Ready to Claim</strong>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Token ID</p>
                  <strong style={{ fontSize: '18px', color: '#69f6ff' }}>#{ticketData.tokenId}</strong>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Event ID</p>
                  <strong style={{ fontSize: '18px', color: '#ff9dff' }}>#{ticketData.eventId}</strong>
                </div>
                {ticketData.eventName && (
                  <div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Event</p>
                    <strong style={{ fontSize: '18px', color: '#dbe4ff' }}>{ticketData.eventName}</strong>
                  </div>
                )}
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Status</p>
                  <strong style={{ fontSize: '18px', color: '#0ddfc2' }}>
                    {ticketData.state === 0 ? 'Active' : ticketData.state === 1 ? 'Checked In' : 'Retired'}
                  </strong>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Resale Form */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            borderRadius: '22px',
            boxShadow: '0 25px 70px rgba(255, 44, 230, 0.25)',
            padding: '32px',
            border: '1px solid rgba(237, 183, 225, 0.25)',
            backdropFilter: 'blur(14px)',
          }}
        >
          <h2
            style={{
              fontSize: '26px',
              marginBottom: '24px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#ff9dff',
              textShadow: '0 0 18px rgba(255, 157, 255, 0.65)',
            }}
          >
            💰 Set Resale Price
          </h2>

          {/* Pricing Info */}
          <div
            style={{
              background: 'rgba(105, 246, 255, 0.08)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid rgba(105,246,255,0.25)',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Original Price</p>
                <strong style={{ fontSize: '18px', color: '#69f6ff' }}>{stakeAmount} ETH</strong>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Max Resale Price</p>
                <strong style={{ fontSize: '18px', color: '#ff9dff' }}>{maxAllowedPrice} ETH</strong>
              </div>
            </div>
          </div>

          <form onSubmit={handleConfirmResell} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Resale Price Input */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#8ba6ff',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Resale Price (ETH) *
              </label>
              <input
                type="number"
                step="0.001"
                value={resalePrice}
                onChange={(e) => setResalePrice(e.target.value)}
                placeholder={`Max: ${maxAllowedPrice} ETH`}
                required
                style={{
                  width: 'calc(100% - 36px)',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  border: '1px solid rgba(120, 215, 255, 0.35)',
                  background: 'rgba(10, 25, 60, 0.6)',
                  color: '#9ad6ff',
                  fontSize: '18px',
                  fontFamily: 'inherit',
                  boxSizing: 'content-box',
                }}
              />
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#8ba6ff' }}>
                Enter a price up to {maxAllowedPrice} ETH (maximum allowed for this event)
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !resalePrice}
              style={{
                background:
                  isLoading || !resalePrice
                    ? 'rgba(120, 115, 255, 0.25)'
                    : 'linear-gradient(135deg, rgba(0,255,224,0.9), rgba(255,111,216,0.9))',
                color: isLoading || !resalePrice ? 'rgba(219, 228, 255, 0.5)' : '#05060f',
                padding: '16px 32px',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: isLoading || !resalePrice ? 'not-allowed' : 'pointer',
                border: '1px solid rgba(105,246,255,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                boxShadow: isLoading || !resalePrice ? 'none' : '0 18px 38px rgba(0,255,224,0.35)',
              }}
            >
              {isLoading ? '⏳ Listing Ticket...' : '✅ Confirm Resell'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Resale;
