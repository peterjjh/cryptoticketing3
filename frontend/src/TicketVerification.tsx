import React, { useState } from 'react';

interface TicketVerificationProps {
  ticketContractWithSigner: any;
  walletAddress: string | null;
}

const TicketVerification: React.FC<TicketVerificationProps> = ({
  ticketContractWithSigner,
  walletAddress,
}) => {
  const [tokenIdInput, setTokenIdInput] = useState('');
  const [eventIdInput, setEventIdInput] = useState('');
  const [holderAddress, setHolderAddress] = useState('');
  const [verifiedTicket, setVerifiedTicket] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const verifyTicket = async () => {
    if (!ticketContractWithSigner || !tokenIdInput || !eventIdInput || !holderAddress) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter Token ID, Event ID, and Holder Address',
      });
      return;
    }

    try {
      setIsVerifying(true);
      setStatusMessage({ type: 'info', text: 'Verifying ticket ownership...' });

      // Verify ticket exists and get owner
      const owner = await ticketContractWithSigner.ownerOf(tokenIdInput);
      const ticketInfo = await ticketContractWithSigner.getTicket(tokenIdInput);
      
      const eventId = ticketInfo.eventId.toString();
      const state = ticketInfo.state; // 0 = Active, 1 = Used, 2 = Expired

      // Check if event ID matches
      if (eventId !== eventIdInput) {
        setStatusMessage({
          type: 'error',
          text: `❌ Verification Failed: Ticket is for Event #${eventId}, not Event #${eventIdInput}`,
        });
        setVerifiedTicket(null);
        return;
      }

      // Check if holder address matches
      if (owner.toLowerCase() !== holderAddress.toLowerCase()) {
        setStatusMessage({
          type: 'error',
          text: `❌ Verification Failed: Holder does not own this ticket. Actual owner: ${owner.substring(0, 6)}...${owner.substring(38)}`,
        });
        setVerifiedTicket(null);
        return;
      }

      // Check ticket state
      if (state !== 0) {
        const stateText = state === 1 ? 'Used' : 'Expired';
        setStatusMessage({
          type: 'error',
          text: `❌ Ticket is ${stateText} and cannot be verified`,
        });
        setVerifiedTicket(null);
        return;
      }

      // Ticket is valid
      setVerifiedTicket({
        tokenId: tokenIdInput,
        eventId,
        owner,
        state,
      });

      setStatusMessage({
        type: 'success',
        text: '✅ Ticket Verified! Holder owns this active ticket.',
      });
    } catch (error: any) {
      console.error('Verification error:', error);
      setStatusMessage({
        type: 'error',
        text: error.message?.includes('owner query')
          ? '❌ Token does not exist'
          : `Verification failed: ${error.message}`,
      });
      setVerifiedTicket(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const transferToEventCreator = async () => {
    if (!ticketContractWithSigner || !verifiedTicket) {
      return;
    }

    try {
      setIsTransferring(true);
      setStatusMessage({ type: 'info', text: 'Transferring ticket to event creator...' });

      // Get event owner
      const eventOwner = await ticketContractWithSigner.eventOwners(verifiedTicket.eventId);
      
      if (!eventOwner || eventOwner === '0x0000000000000000000000000000000000000000') {
        throw new Error('Event owner not found');
      }

      // IMPORTANT: This will only work if the connected wallet is the ticket holder
      // The holder must be the one to click this button and sign the transaction
      const tx = await ticketContractWithSigner.transferFrom(
        verifiedTicket.owner,
        eventOwner,
        verifiedTicket.tokenId
      );

      setStatusMessage({ type: 'info', text: 'Transaction submitted. Waiting for confirmation...' });
      await tx.wait();

      setStatusMessage({
        type: 'success',
        text: '✅ Ticket successfully transferred to event creator!',
      });

      // Reset form
      setVerifiedTicket(null);
      setTokenIdInput('');
      setEventIdInput('');
      setHolderAddress('');
    } catch (error: any) {
      console.error('Transfer error:', error);
      
      // Provide helpful error message if wrong wallet is connected
      const errorMsg = error.message || '';
      if (errorMsg.includes('caller is not owner nor approved')) {
        setStatusMessage({
          type: 'error',
          text: '❌ Transfer failed: The ticket holder must connect their wallet and click the button to transfer.',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Transfer failed: ${errorMsg}`,
        });
      }
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div
      style={{
        borderRadius: '20px',
        border: '1px solid rgba(0, 0, 0, 1)',
        padding: '26px',
        background: 'rgba(0, 0, 0, 1)',
        marginTop: '24px',
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
          margin: 0,
        }}
      >
        🎫 Verify & Collect Ticket
      </h2>
      <p
        style={{
          fontSize: '13px',
          color: '#8ba6ff',
          marginBottom: '20px',
          lineHeight: '1.6',
          margin: '0 0 20px 0',
        }}
      >
        Enter ticket details to verify ownership. The ticket holder must connect their wallet and agree to transfer upon entry.
      </p>

      {/* Status Message */}
      {statusMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '20px',
            background:
              statusMessage.type === 'success'
                ? 'rgba(0, 255, 224, 0.15)'
                : statusMessage.type === 'error'
                ? 'rgba(255, 111, 216, 0.15)'
                : 'rgba(105, 246, 255, 0.15)',
            border: `1px solid ${
              statusMessage.type === 'success'
                ? 'rgba(0, 255, 224, 0.35)'
                : statusMessage.type === 'error'
                ? 'rgba(255, 111, 216, 0.35)'
                : 'rgba(105, 246, 255, 0.35)'
            }`,
            color: '#dbe4ff',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Input Form */}
      <div style={{ display: 'grid', gap: '16px', marginBottom: '20px' }}>
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              color: '#9ad6ff',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            Token ID:
          </label>
          <input
            type="number"
            value={tokenIdInput}
            onChange={(e) => setTokenIdInput(e.target.value)}
            placeholder="Enter NFT Token ID"
            disabled={isVerifying || isTransferring}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(10, 25, 60, 0.7)',
              border: '1px solid rgba(120, 215, 255, 0.4)',
              borderRadius: '10px',
              color: '#fdfbff',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              color: '#9ad6ff',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            Event ID:
          </label>
          <input
            type="number"
            value={eventIdInput}
            onChange={(e) => setEventIdInput(e.target.value)}
            placeholder="Enter Event ID"
            disabled={isVerifying || isTransferring}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(10, 25, 60, 0.7)',
              border: '1px solid rgba(120, 215, 255, 0.4)',
              borderRadius: '10px',
              color: '#fdfbff',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              color: '#9ad6ff',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            Holder Address:
          </label>
          <input
            type="text"
            value={holderAddress}
            onChange={(e) => setHolderAddress(e.target.value)}
            placeholder="Enter ticket holder's wallet address (0x...)"
            disabled={isVerifying || isTransferring}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(10, 25, 60, 0.7)',
              border: '1px solid rgba(120, 215, 255, 0.4)',
              borderRadius: '10px',
              color: '#fdfbff',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={verifyTicket}
          disabled={isVerifying || !tokenIdInput || !eventIdInput || !holderAddress || !!verifiedTicket}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '14px 24px',
            background:
              isVerifying || !tokenIdInput || !eventIdInput || !holderAddress || !!verifiedTicket
                ? 'rgba(120, 115, 255, 0.25)'
                : 'linear-gradient(135deg, rgba(0,255,224,0.9), rgba(255,111,216,0.9))',
            color:
              isVerifying || !tokenIdInput || !eventIdInput || !holderAddress || !!verifiedTicket
                ? 'rgba(219, 228, 255, 0.5)'
                : '#05060f',
            border: '1px solid rgba(105,246,255,0.4)',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 700,
            cursor:
              isVerifying || !tokenIdInput || !eventIdInput || !holderAddress || !!verifiedTicket
                ? 'not-allowed'
                : 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            boxShadow:
              isVerifying || !tokenIdInput || !eventIdInput || !holderAddress || !!verifiedTicket
                ? 'none'
                : '0 12px 30px rgba(0,255,224,0.35)',
          }}
        >
          {isVerifying ? 'Verifying...' : '🔍 Verify Ticket'}
        </button>

        {verifiedTicket && (
          <button
            onClick={transferToEventCreator}
            disabled={isTransferring || !walletAddress || walletAddress.toLowerCase() !== verifiedTicket.owner.toLowerCase()}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '14px 24px',
              background: isTransferring || !walletAddress || walletAddress.toLowerCase() !== verifiedTicket.owner.toLowerCase()
                ? 'rgba(255, 157, 255, 0.5)'
                : 'linear-gradient(135deg, rgba(255,111,216,0.9), rgba(255,157,255,0.9))',
              color: '#05060f',
              border: '1px solid rgba(255,111,216,0.4)',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: isTransferring || !walletAddress || walletAddress.toLowerCase() !== verifiedTicket.owner.toLowerCase() ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              boxShadow: isTransferring || !walletAddress || walletAddress.toLowerCase() !== verifiedTicket.owner.toLowerCase() ? 'none' : '0 12px 30px rgba(255,111,216,0.35)',
            }}
          >
            {isTransferring ? 'Transferring...' : walletAddress?.toLowerCase() === verifiedTicket.owner.toLowerCase() ? '✅ I Agree - Transfer My Ticket' : '⚠️ Holder Must Connect & Agree'}
          </button>
        )}
      </div>

      {/* Verified Ticket Info */}
      {verifiedTicket && (
        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            background: 'rgba(0, 255, 224, 0.12)',
            border: '1px solid rgba(0, 255, 224, 0.35)',
            borderRadius: '12px',
          }}
        >
          <h4
            style={{
              margin: '0 0 12px 0',
              color: '#0ddfc2',
              fontSize: '15px',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            ✅ VERIFIED TICKET
          </h4>
          <div style={{ display: 'grid', gap: '8px', fontSize: '13px', color: '#dbe4ff' }}>
            <div>
              <strong style={{ color: '#9ad6ff' }}>Token ID:</strong> {verifiedTicket.tokenId}
            </div>
            <div>
              <strong style={{ color: '#9ad6ff' }}>Event ID:</strong> {verifiedTicket.eventId}
            </div>
            <div>
              <strong style={{ color: '#9ad6ff' }}>Owner:</strong>{' '}
              {verifiedTicket.owner.substring(0, 6)}...{verifiedTicket.owner.substring(38)}
            </div>
            <div>
              <strong style={{ color: '#9ad6ff' }}>Status:</strong>{' '}
              <span style={{ color: '#0ddfc2', fontWeight: 600 }}>Active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketVerification;
