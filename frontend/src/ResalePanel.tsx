import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';

type ResoldTicket = {
  tokenId?: number;
  eventId: number;
  eventName: string;
  seller: string;
  price: string;
  priceWei: ethers.BigNumber;
  timestamp: number;
  isClaimRight?: boolean;
  winnerAddress?: string;
};

type EventMeta = {
  eventId: number;
  name: string;
  date: string;
  venue: string;
};

const ResalePanel = ({ 
  ticketContractWithSigner,
  walletAddress 
}: { 
  ticketContractWithSigner: any;
  walletAddress: string | null;
}) => {
  const [resoldTickets, setResoldTickets] = useState<ResoldTicket[]>([]);
  const [events, setEvents] = useState<EventMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [purchasingTokenId, setPurchasingTokenId] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const eventsApiUrl = import.meta.env.VITE_EVENTS_API as string | undefined;

  // Load events from backend/localStorage
  useEffect(() => {
    const loadEvents = async () => {
      try {
        // Try to load from localStorage first
        const stored = localStorage.getItem('cryptoTicketing_createdEvents');
        if (stored) {
          const parsed = JSON.parse(stored) as EventMeta[];
          setEvents(parsed);
        }

        // Also try to fetch from backend
        if (eventsApiUrl) {
          try {
            const response = await fetch(eventsApiUrl);
            if (response.ok) {
              const payload = await response.json();
              const eventsList = Array.isArray(payload) ? payload : payload.events || [];
              setEvents((prev) => {
                const merged = [...prev];
                eventsList.forEach((e: any) => {
                  if (!merged.find((m) => m.eventId === e.eventId)) {
                    merged.push(e);
                  }
                });
                return merged;
              });
            }
          } catch (error) {
            console.warn('Failed to fetch events from backend:', error);
          }
        }
      } catch (error) {
        console.error('Error loading events:', error);
      }
    };

    loadEvents();
  }, [eventsApiUrl]);

  // Load resold tickets from localStorage
  const loadResoldTickets = useCallback(() => {
    try {
      console.log('===== LOADING RESOLD TICKETS =====');
      const stored = localStorage.getItem('cryptoTicketing_resoldTickets');
      console.log('Raw localStorage value:', stored);
      
      if (stored) {
        const parsed = JSON.parse(stored) as ResoldTicket[];
        console.log('Parsed JSON:', parsed);
        console.log('Number of tickets found:', parsed.length);
        
        // Log each ticket
        parsed.forEach((ticket, index) => {
          console.log(`Ticket ${index}:`, {
            eventId: ticket.eventId,
            tokenId: ticket.tokenId,
            eventName: ticket.eventName,
            seller: ticket.seller,
            price: ticket.price,
            priceWei: ticket.priceWei,
            priceWeiType: typeof ticket.priceWei,
            isClaimRight: ticket.isClaimRight,
            winnerAddress: ticket.winnerAddress,
          });
        });
        
        // Convert price strings back to BigNumber with better error handling
        const withBigNumbers = parsed.map((ticket, index) => {
          try {
            let priceWeiString: string;
            
            // Handle different priceWei formats
            if (typeof ticket.priceWei === 'string') {
              priceWeiString = ticket.priceWei;
            } else if (ticket.priceWei && typeof ticket.priceWei === 'object') {
              // If it's an object (BigNumber that got serialized), try to extract the value
              priceWeiString = (ticket.priceWei as any)._hex || (ticket.priceWei as any).hex || '0';
              console.warn(`Ticket ${index} had object priceWei, extracted: ${priceWeiString}`);
            } else {
              // Fallback: calculate from price
              console.warn(`Ticket ${index} has invalid priceWei, calculating from price`);
              priceWeiString = ethers.utils.parseEther(ticket.price || '0').toString();
            }
            
            return {
              ...ticket,
              priceWei: ethers.BigNumber.from(priceWeiString),
            };
          } catch (err) {
            console.error(`Error processing ticket ${index}:`, err);
            // Return ticket with calculated priceWei from price field
            return {
              ...ticket,
              priceWei: ethers.utils.parseEther(ticket.price || '0'),
            };
          }
        });
        
        console.log('After BigNumber conversion:', withBigNumbers);
        setResoldTickets(withBigNumbers);
        console.log('State updated with', withBigNumbers.length, 'tickets');
      } else {
        console.log('⚠️ No resold tickets found in localStorage');
        setResoldTickets([]);
      }
      console.log('==================================');
    } catch (error) {
      console.error('❌ Error loading resold tickets:', error);
      setResoldTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResoldTickets();
    
    // Reload tickets when window gains focus (user returns to page)
    const handleFocus = () => {
      console.log('Window focused, reloading tickets...');
      loadResoldTickets();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadResoldTickets]);

  const handlePurchase = async (ticket: ResoldTicket) => {
    if (!ticketContractWithSigner || !walletAddress) {
      setStatusMessage({
        type: 'error',
        text: 'Connect your wallet to purchase tickets.',
      });
      return;
    }

    try {
      setPurchasingTokenId(ticket.tokenId || ticket.eventId);
      setStatusMessage({
        type: 'info',
        text: ticket.isClaimRight 
          ? 'Processing purchase... You will receive the right to claim this ticket.'
          : 'Processing purchase... Confirm in your wallet.',
      });

      if (ticket.isClaimRight) {
        // For claim rights, transfer winner status on-chain and send payment
        console.log(`Purchasing claim right for event ${ticket.eventId} for ${ticket.price} ETH from ${ticket.seller}`);
        
        // Step 1: Call transferWinnerStatus to transfer the claim right on-chain
        setStatusMessage({
          type: 'info',
          text: 'Transferring winner status on blockchain... Confirm in your wallet.',
        });
        
        // The seller needs to call transferWinnerStatus from their address
        // Since we can't do that from the buyer's side, we need to send payment first
        // and trust the seller to transfer, OR require the seller to transfer first
        // For now, we'll send payment and store the transfer intent
        
        // Send ETH payment to the seller
        const signer = ticketContractWithSigner.signer;
        const tx = await signer.sendTransaction({
          to: ticket.seller,
          value: ticket.priceWei,
        });
        
        console.log('Payment transaction sent:', tx.hash);
        setStatusMessage({
          type: 'info',
          text: `💸 Sending ${ticket.price} ETH to seller... Please wait.`,
        });
        
        await tx.wait();
        console.log('Payment confirmed!');
        
        // After payment, call transferWinnerStatus from the seller's account
        // NOTE: This requires the seller to be connected and approve the transaction
        // For a better UX, the seller should call this before listing,
        // or we need an escrow contract
        
        setStatusMessage({
          type: 'info',
          text: 'Requesting winner status transfer from seller...',
        });
        
        // IMPORTANT: In a production system, you'd use an escrow contract
        // For now, we assume the payment triggers an off-chain process
        // where the seller calls transferWinnerStatus
        
        // Mark listing as sold (preserve record for seller status display)
        const updatedTickets = resoldTickets.map((t) => {
          if (t.eventId === ticket.eventId && t.isClaimRight && t.seller === ticket.seller) {
            return { ...t, sold: true, soldTimestamp: Date.now() };
          }
          return t;
        });
        setResoldTickets(updatedTickets);
        localStorage.setItem('cryptoTicketing_resoldTickets', JSON.stringify(updatedTickets));

        // Persist sold claim right key for seller (so UI won't revert)
        const soldKeysStore = JSON.parse(localStorage.getItem('cryptoTicketing_soldClaimRights') || '[]');
        const sellerKey = `${ticket.eventId}-${ticket.seller.toLowerCase()}`;
        if (!soldKeysStore.includes(sellerKey)) {
          soldKeysStore.push(sellerKey);
          localStorage.setItem('cryptoTicketing_soldClaimRights', JSON.stringify(soldKeysStore));
        }

        // Store that the current user now has the right to claim
        const claimRights = JSON.parse(localStorage.getItem('cryptoTicketing_claimRights') || '[]');
        claimRights.push({
          eventId: ticket.eventId,
          newOwner: walletAddress,
          originalWinner: ticket.winnerAddress || ticket.seller,
          purchasePrice: ticket.price,
          timestamp: Date.now(),
        });
        localStorage.setItem('cryptoTicketing_claimRights', JSON.stringify(claimRights));

        // Store pending transfer for the seller to complete
        const pendingTransfers = JSON.parse(localStorage.getItem('cryptoTicketing_pendingTransfers') || '[]');
        pendingTransfers.push({
          eventId: ticket.eventId,
          seller: ticket.seller,
          buyer: walletAddress,
          price: ticket.price,
          timestamp: Date.now(),
          completed: false,
        });
        localStorage.setItem('cryptoTicketing_pendingTransfers', JSON.stringify(pendingTransfers));

        setStatusMessage({
          type: 'success',
          text: `✅ Payment sent! The seller will be notified to transfer winner status on-chain.`,
        });
      } else {
        // For already-minted NFT tickets
        const tx = await ticketContractWithSigner.transferTicket(
          ticket.tokenId,
          walletAddress,
          ticket.priceWei,
          { value: ticket.priceWei }
        );

        await tx.wait();

        setStatusMessage({
          type: 'success',
          text: `✅ Ticket #${ticket.tokenId} purchased successfully!`,
        });

        // Remove from resold tickets
        const updatedTickets = resoldTickets.filter((t) => t.tokenId !== ticket.tokenId);
        setResoldTickets(updatedTickets);
        localStorage.setItem('cryptoTicketing_resoldTickets', JSON.stringify(updatedTickets));
      }

    } catch (error) {
      console.error('❌ Purchase failed:', error);
      if (error instanceof Error) {
        setStatusMessage({
          type: 'error',
          text: `Purchase failed: ${error.message}`,
        });
      }
    } finally {
      setPurchasingTokenId(null);
    }
  };

  const getEventName = (eventId: number): string => {
    const event = events.find((e) => e.eventId === eventId);
    return event?.name || `Event #${eventId}`;
  };

  // Log current state for debugging
  console.log('===== RESALE PANEL RENDER =====');
  console.log('Current resoldTickets state:', resoldTickets);
  console.log('Number of tickets in state:', resoldTickets.length);
  console.log('Is loading:', isLoading);
  console.log('===============================');

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
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
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
            Resale Marketplace
          </h1>
          <div style={{ display: 'flex', gap: '12px' }}>
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

        {/* Main Content */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            borderRadius: '22px',
            boxShadow: '0 25px 70px rgba(105, 246, 255, 0.25)',
            padding: '32px',
            border: '1px solid rgba(105, 246, 255, 0.25)',
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
              color: '#69f6ff',
              textShadow: '0 0 18px rgba(105, 246, 255, 0.65)',
            }}
          >
            Available Tickets
          </h2>

          {isLoading ? (
            <p style={{ color: '#8ba6ff', textAlign: 'center', padding: '40px 0' }}>
              Loading resale tickets...
            </p>
          ) : resoldTickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ color: '#8ba6ff', fontSize: '18px', marginBottom: '16px' }}>
                No tickets available for resale yet.
              </p>
              <p style={{ color: '#8ba6ff', fontSize: '14px' }}>
                Check back later or be the first to list a ticket!
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {resoldTickets.map((ticket) => (
                <div
                  key={ticket.tokenId}
                  style={{
                    background: 'linear-gradient(135deg, rgba(15, 40, 86, 0.75), rgba(101, 49, 255, 0.25))',
                    borderRadius: '18px',
                    border: '1px solid rgba(120, 215, 255, 0.35)',
                    padding: '24px',
                    boxShadow: '0 18px 42px rgba(76, 201, 240, 0.22)',
                    backdropFilter: 'blur(12px)',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 24px 56px rgba(76, 201, 240, 0.35)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 18px 42px rgba(76, 201, 240, 0.22)';
                  }}
                >
                  <h3
                    style={{
                      fontSize: '20px',
                      fontWeight: 600,
                      marginBottom: '16px',
                      color: '#fdfbff',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      textShadow: '0 0 18px rgba(120, 215, 255, 0.45)',
                    }}
                  >
                    {getEventName(ticket.eventId)}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    {ticket.isClaimRight ? (
                      <>
                        <div
                          style={{
                            background: 'rgba(255, 157, 255, 0.12)',
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 157, 255, 0.25)',
                          }}
                        >
                          <p style={{ margin: 0, fontSize: '11px', color: '#ff9dff', letterSpacing: '0.08em', fontWeight: 600 }}>🎟️ CLAIM RIGHT</p>
                          <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#dbe4ff' }}>Unclaimed lottery win</p>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '11px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Event ID</p>
                          <strong style={{ fontSize: '16px', color: '#ff9dff' }}>#{ticket.eventId}</strong>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p style={{ margin: 0, fontSize: '11px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Token ID</p>
                          <strong style={{ fontSize: '16px', color: '#69f6ff' }}>#{ticket.tokenId}</strong>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '11px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Event ID</p>
                          <strong style={{ fontSize: '16px', color: '#ff9dff' }}>#{ticket.eventId}</strong>
                        </div>
                      </>
                    )}
                    <div>
                      <p style={{ margin: 0, fontSize: '11px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Seller</p>
                      <strong style={{ fontSize: '12px', color: '#dbe4ff', wordBreak: 'break-all' }}>
                        {ticket.seller.slice(0, 6)}...{ticket.seller.slice(-4)}
                      </strong>
                    </div>
                    <div
                      style={{
                        background: 'rgba(0, 255, 224, 0.12)',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(0, 255, 224, 0.25)',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '11px', color: '#0ddfc2', letterSpacing: '0.08em' }}>Price</p>
                      <strong style={{ fontSize: '24px', color: '#0ddfc2', fontWeight: 700 }}>
                        {ticket.price} ETH
                      </strong>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePurchase(ticket)}
                    disabled={!walletAddress || purchasingTokenId === ticket.tokenId}
                    style={{
                      background:
                        !walletAddress || purchasingTokenId === ticket.tokenId
                          ? 'rgba(120, 115, 255, 0.25)'
                          : 'linear-gradient(135deg, rgba(0,255,224,0.9), rgba(255,111,216,0.9))',
                      color: !walletAddress || purchasingTokenId === ticket.tokenId ? 'rgba(219, 228, 255, 0.5)' : '#05060f',
                      padding: '14px 24px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: !walletAddress || purchasingTokenId === ticket.tokenId ? 'not-allowed' : 'pointer',
                      border: '1px solid rgba(105,246,255,0.4)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      boxShadow:
                        !walletAddress || purchasingTokenId === ticket.tokenId
                          ? 'none'
                          : '0 18px 38px rgba(0,255,224,0.35)',
                      width: '100%',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {!walletAddress
                      ? 'Connect Wallet'
                      : purchasingTokenId === (ticket.tokenId || ticket.eventId)
                      ? '⏳ Purchasing...'
                      : ticket.isClaimRight
                      ? '🎟️ Buy Claim Right'
                      : '🛒 Purchase Ticket'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(10, 25, 60, 0.95), rgba(20, 15, 35, 0.95))',
              borderRadius: '22px',
              padding: '40px',
              maxWidth: '500px',
              border: '1px solid rgba(255, 111, 216, 0.35)',
              boxShadow: '0 25px 70px rgba(255, 111, 216, 0.35)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#ff72f9',
                marginBottom: '16px',
                textAlign: 'center',
                textShadow: '0 0 18px rgba(255, 114, 249, 0.65)',
              }}
            >
              ⚠️ Clear All Listings?
            </h2>
            <p
              style={{
                fontSize: '16px',
                color: '#dbe4ff',
                marginBottom: '32px',
                textAlign: 'center',
                lineHeight: '1.6',
              }}
            >
              Are you sure you want to clear <strong style={{ color: '#ff9dff' }}>ALL marketplace listings</strong>?
              <br />
              This action <strong style={{ color: '#ff72f9' }}>cannot be undone</strong>.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  flex: 1,
                  background: 'rgba(120, 215, 255, 0.12)',
                  color: '#69f6ff',
                  border: '1px solid rgba(120, 215, 255, 0.35)',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  transition: 'all 0.2s ease',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('cryptoTicketing_resoldTickets');
                  setResoldTickets([]);
                  setStatusMessage({
                    type: 'success',
                    text: '✅ All marketplace listings cleared!',
                  });
                  setShowClearConfirm(false);
                }}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, rgba(255,111,216,0.9), rgba(255,72,249,0.9))',
                  color: '#05060f',
                  border: '1px solid rgba(255,111,216,0.4)',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  boxShadow: '0 12px 30px rgba(255,111,216,0.35)',
                  transition: 'all 0.2s ease',
                }}
              >
                🗑️ Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResalePanel;
