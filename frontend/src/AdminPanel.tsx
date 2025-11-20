import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { Link } from 'react-router-dom';

type EventMeta = {
  eventId: number
  name: string
  date: string
  venue: string
  description?: string
}

type SaleDetails = {
  stakeAmount: ethers.BigNumber
  stakeFormatted: string
  ticketSupply: string
  ticketsMinted: string
  isOpen: boolean
  lotteryExecuted: boolean
  entrantsCount: string
  winnersCount: string
}

const AdminPanel = ({ 
  ticketContractWithSigner,
  onEventCreated  // NEW: callback to notify App.tsx
}: { 
  ticketContractWithSigner: any
  onEventCreated?: (event: EventMeta) => void  // NEW
}) => {
  // Create Event State
  const [createEventMode, setCreateEventMode] = useState(false);
  const [newEventId, setNewEventId] = useState<string>('');
  const [newEventName, setNewEventName] = useState<string>('');
  const [newEventDate, setNewEventDate] = useState<string>('');
  const [newEventVenue, setNewEventVenue] = useState<string>('');
  const [newEventDescription, setNewEventDescription] = useState<string>('');
  const [newStakeAmount, setNewStakeAmount] = useState<string>('');
  const [newTicketSupply, setNewTicketSupply] = useState<string>('');
  const [maxTransferPrice, setMaxTransferPrice] = useState<string>('50'); // % of original price

  // Run Lottery State
  const [ownedEvents, setOwnedEvents] = useState<EventMeta[]>([]);
  const [createdEventsLocal, setCreatedEventsLocal] = useState<EventMeta[]>([]);
  const [saleDetails, setSaleDetails] = useState<Record<number, SaleDetails>>({});
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [winnersCount, setWinnersCount] = useState<string>('');
  const [randomSeed, setRandomSeed] = useState<string>('');

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const eventsApiUrl = import.meta.env.VITE_EVENTS_API as string | undefined;
  
  useEffect(() => {
    fetchOwnedEvents();
    // NEW: Load created events from localStorage
    loadCreatedEventsFromStorage();
  }, []);

  const loadCreatedEventsFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem('cryptoTicketing_createdEvents');
      if (stored) {
        const parsed = JSON.parse(stored) as EventMeta[];
        setCreatedEventsLocal(parsed);
      }
    } catch (error) {
      console.warn('Failed to load created events from storage:', error);
    }
  }, []);

  const saveCreatedEventsToStorage = useCallback((events: EventMeta[]) => {
    try {
      localStorage.setItem('cryptoTicketing_createdEvents', JSON.stringify(events));
    } catch (error) {
      console.warn('Failed to save created events to storage:', error);
    }
  }, []);

  // Combine backend events with locally created ones
  const allOwnedEvents = useMemo(() => {
    const merged = [...ownedEvents];
    // Add locally created events that aren't already in the list
    createdEventsLocal.forEach((local) => {
      if (!merged.find((e) => e.eventId === local.eventId)) {
        merged.push(local);
      }
    });
    return merged;
  }, [ownedEvents, createdEventsLocal]);

    const fallbackEvents: EventMeta[] = [
    {
      eventId: 1,
      name: 'Doja Cat: Tour Ma Vie World Tour',
      date: 'Dec 1, 2026',
      venue: 'Madison Square Garden, NY',
      description: 'Doja Cat will embark on the Tour Ma Vie World Tour in support of her fifth studio album Vie.',
    },
    {
      eventId: 2,
      name: 'Hamilton (NY)',
      date: 'Nov 4, 2025',
      venue: 'Richard Rodgers Theatre, NY',
      description: 'Hamilton is a sung-and-rapped-through musical that tells the story of American founding father Alexander Hamilton.',
    },
    {
      eventId: 3,
      name: '2025 Skechers World Champions Cup (Golf), Thursday',
      date: 'Dec 4, 2025',
      venue: 'Feather Sound Country Club',
      description: 'The Skechers World Champions Cup supporting Shriners Children\'s is an annual three-team, three-day stroke play tournament.',
    },
  ];

  // Fetch sale details for a specific event
  const fetchSaleDetails = useCallback(async (eventId: number) => {
    if (!ticketContractWithSigner) {
      return;
    }

    try {
      const sale = await ticketContractWithSigner.getSaleOverview(eventId);
      const details: SaleDetails = {
        stakeAmount: sale.stakeAmount,
        stakeFormatted: ethers.utils.formatEther(sale.stakeAmount),
        ticketSupply: sale.ticketSupply.toString(),
        ticketsMinted: sale.ticketsMinted.toString(),
        isOpen: sale.isOpen,
        lotteryExecuted: sale.lotteryExecuted,
        entrantsCount: sale.entrantsCount.toString(),
        winnersCount: sale.winnersCount.toString(),
      };
      setSaleDetails((prev) => ({ ...prev, [eventId]: details }));
    } catch (error) {
      console.error(`Failed to fetch sale details for event ${eventId}:`, error);
    }
  }, [ticketContractWithSigner]);

  // Load owned events on mount
  useEffect(() => {
    fetchOwnedEvents();
  }, []);

  // Fetch sale details when owned events change
  useEffect(() => {
    ownedEvents.forEach((event) => {
      fetchSaleDetails(event.eventId);
    });
  }, [ownedEvents, fetchSaleDetails]);

  const fetchOwnedEvents = useCallback(async () => {

    // Just use localStorage, don't fetch from backend
    setOwnedEvents([]);
    }, []);


  // Create Event Handler
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ticketContractWithSigner) {
      setStatusMessage({
        type: 'error',
        text: 'Connect your wallet to create an event.',
      });
      return;
    }

    if (!newEventId || !newEventName || !newStakeAmount || !newTicketSupply) {
      setStatusMessage({
        type: 'error',
        text: 'Please fill in all required fields.',
      });
      return;
    }

    try {
      setIsRunning(true);
      setStatusMessage({
        type: 'info',
        text: 'Creating event... Confirm in your wallet.',
      });

      const stakeAmountWei = ethers.utils.parseEther(newStakeAmount);
      const ticketSupplyNum = parseInt(newTicketSupply);
      const maxTransferPriceNum = parseInt(maxTransferPrice);

      // Call configureEventSale
      const tx = await ticketContractWithSigner.configureEventSale(
        parseInt(newEventId),
        stakeAmountWei,
        ticketSupplyNum,
        maxTransferPriceNum
      );

      console.log('📋 Event creation tx:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Event created successfully!', receipt);

      // Create new event object
      const newEvent: EventMeta = {
        eventId: parseInt(newEventId),
        name: newEventName,
        date: newEventDate,
        venue: newEventVenue,
        description: newEventDescription,
      };

      // NEW: Add to local state AND localStorage
      setCreatedEventsLocal((prev) => {
        const updated = [...prev, newEvent];
        saveCreatedEventsToStorage(updated);
        return updated;
      });

      // Add to owned events
      setOwnedEvents((prev) => [...prev, newEvent]);

      // Try to persist to backend
      try {
        await fetch(eventsApiUrl || '', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEvent),
        });
      } catch (backendError) {
        console.warn('Could not persist event to backend:', backendError);
      }

      // NEW: Notify parent component to refresh
        if (onEventCreated) {
            onEventCreated(newEvent);
        }

      setStatusMessage({
        type: 'success',
        text: `✅ Event #${newEventId} "${newEventName}" created! It will appear on the home page shortly.`,
      });

      // Reset form
      setNewEventId('');
      setNewEventName('');
      setNewEventDate('');
      setNewEventVenue('');
      setNewEventDescription('');
      setNewStakeAmount('');
      setNewTicketSupply('');
      setMaxTransferPrice('50');
      setCreateEventMode(false);

      // Fetch sale details for the new event
      setTimeout(() => fetchSaleDetails(parseInt(newEventId)), 500);
    } catch (error) {
      console.error('❌ Event creation failed:', error);
      if (error instanceof Error) {
        setStatusMessage({
          type: 'error',
          text: `Failed to create event: ${error.message}`,
        });
      }
    } finally {
      setIsRunning(false);
    }
  };

  // Update useEffect to use allOwnedEvents
  useEffect(() => {
    allOwnedEvents.forEach((event) => {
      fetchSaleDetails(event.eventId);
    });
  }, [allOwnedEvents, fetchSaleDetails]);

  // Run Lottery Handler
  const handleRunLottery = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ticketContractWithSigner) {
      setStatusMessage({
        type: 'error',
        text: 'Connect your wallet to run the lottery.',
      });
      return;
    }

    if (!selectedEventId) {
      setStatusMessage({
        type: 'error',
        text: 'Please select an event.',
      });
      return;
    }

    if (!winnersCount || parseInt(winnersCount) <= 0) {
      setStatusMessage({
        type: 'error',
        text: 'Winners count must be greater than 0.',
      });
      return;
    }

    if (!randomSeed) {
      setStatusMessage({
        type: 'error',
        text: 'Random seed is required.',
      });
      return;
    }

    try {
      setIsRunning(true);
      setStatusMessage({
        type: 'info',
        text: 'Running lottery... Confirm in your wallet.',
      });

      const seedBytes32 = ethers.utils.formatBytes32String(randomSeed);

      const tx = await ticketContractWithSigner.runLotteryAsEventOwner(
        selectedEventId,
        parseInt(winnersCount),
        seedBytes32
    );

      console.log('📋 Lottery tx:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Lottery executed successfully!');
      console.log('📊 Transaction receipt:', receipt);

      setStatusMessage({
        type: 'success',
        text: `🎰 Lottery executed successfully for event #${selectedEventId}!`,
      });

      // Reset form
      setWinnersCount('');
      setRandomSeed('');

      // Refresh sale details
      await fetchSaleDetails(selectedEventId);

      if (onEventCreated) {
        // We can add a new callback or use window events
        window.dispatchEvent(new CustomEvent('lotteryCompleted', { 
          detail: { eventId: selectedEventId } 
        }));
      }

      setTimeout(() => {
      setSelectedEventId(null);
    }, 2000);
    } catch (error) {
      console.error('❌ Lottery execution failed:', error);
      if (error instanceof Error) {
        setStatusMessage({
          type: 'error',
          text: `Failed to run lottery: ${error.message}`,
        });
      }
    } finally {
      setIsRunning(false);
    }
  };

  const selectedEvent = ownedEvents.find((e) => e.eventId === selectedEventId);
  const selectedSale = selectedEventId ? saleDetails[selectedEventId] : null;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(8, 8, 28, 0.95), rgba(89, 0, 255, 0.35))',
        minHeight: '100vh',
        padding: '40px 32px',
        fontFamily: '"Space Grotesk", "Inter", system-ui, sans-serif',
        color: '#dbe4ff',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
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
            Admin Panel
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

        {/* ============================================
            EVENT CREATION SECTION
            ============================================ */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            borderRadius: '22px',
            boxShadow: '0 25px 70px rgba(105, 246, 255, 0.25)',
            padding: '32px',
            border: '1px solid rgba(105, 246, 255, 0.25)',
            backdropFilter: 'blur(14px)',
            marginBottom: '40px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2
              style={{
                fontSize: '26px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#69f6ff',
                textShadow: '0 0 18px rgba(105, 246, 255, 0.65)',
                margin: 0,
              }}
            >
              📋 Create New Event
            </h2>
            {!createEventMode && (
              <button
                type="button"
                onClick={() => setCreateEventMode(true)}
                style={{
                  background: 'rgba(105, 246, 255, 0.12)',
                  color: '#69f6ff',
                  border: '1px solid rgba(105,246,255,0.35)',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                + New Event
              </button>
            )}
          </div>

          {createEventMode ? (
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Event Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#8ba6ff', fontWeight: 600 }}>
                    Event ID *
                  </label>
                  <input
                    type="number"
                    value={newEventId}
                    onChange={(e) => setNewEventId(e.target.value)}
                    placeholder="e.g., 4"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(120, 215, 255, 0.35)',
                      background: 'rgba(10, 25, 60, 0.6)',
                      color: '#9ad6ff',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#8ba6ff', fontWeight: 600 }}>
                    Event Name *
                  </label>
                  <input
                    type="text"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    placeholder="e.g., Doja Cat Tour"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(120, 215, 255, 0.35)',
                      background: 'rgba(10, 25, 60, 0.6)',
                      color: '#9ad6ff',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#8ba6ff', fontWeight: 600 }}>
                    Date
                  </label>
                  <input
                    type="text"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    placeholder="e.g., Dec 1, 2026"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(120, 215, 255, 0.35)',
                      background: 'rgba(10, 25, 60, 0.6)',
                      color: '#9ad6ff',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#8ba6ff', fontWeight: 600 }}>
                    Venue
                  </label>
                  <input
                    type="text"
                    value={newEventVenue}
                    onChange={(e) => setNewEventVenue(e.target.value)}
                    placeholder="e.g., Madison Square Garden, NY"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(120, 215, 255, 0.35)',
                      background: 'rgba(10, 25, 60, 0.6)',
                      color: '#9ad6ff',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#8ba6ff', fontWeight: 600 }}>
                    Stake Amount (ETH) *
                  </label>
                  <input
                    type="text"
                    value={newStakeAmount}
                    onChange={(e) => setNewStakeAmount(e.target.value)}
                    placeholder="e.g., 0.1"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(120, 215, 255, 0.35)',
                      background: 'rgba(10, 25, 60, 0.6)',
                      color: '#9ad6ff',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#8ba6ff', fontWeight: 600 }}>
                    Ticket Supply *
                  </label>
                  <input
                    type="number"
                    value={newTicketSupply}
                    onChange={(e) => setNewTicketSupply(e.target.value)}
                    placeholder="e.g., 100"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(120, 215, 255, 0.35)',
                      background: 'rgba(10, 25, 60, 0.6)',
                      color: '#9ad6ff',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#8ba6ff', fontWeight: 600 }}>
                    Max Transfer Price (% of original)
                  </label>
                  <input
                    type="number"
                    value={maxTransferPrice}
                    onChange={(e) => setMaxTransferPrice(e.target.value)}
                    placeholder="e.g., 50"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(120, 215, 255, 0.35)',
                      background: 'rgba(10, 25, 60, 0.6)',
                      color: '#9ad6ff',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#8ba6ff', fontWeight: 600 }}>
                  Description
                </label>
                <textarea
                  value={newEventDescription}
                  onChange={(e) => setNewEventDescription(e.target.value)}
                  placeholder="Event details..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(120, 215, 255, 0.35)',
                    background: 'rgba(10, 25, 60, 0.6)',
                    color: '#9ad6ff',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    minHeight: '80px',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={isRunning || !newEventId || !newEventName || !newStakeAmount || !newTicketSupply}
                  style={{
                    background:
                      isRunning || !newEventId || !newEventName || !newStakeAmount || !newTicketSupply
                        ? 'rgba(120, 115, 255, 0.25)'
                        : 'linear-gradient(135deg, rgba(0,255,224,0.9), rgba(255,111,216,0.9))',
                    color:
                      isRunning || !newEventId || !newEventName || !newStakeAmount || !newTicketSupply
                        ? 'rgba(219, 228, 255, 0.5)'
                        : '#05060f',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor:
                      isRunning || !newEventId || !newEventName || !newStakeAmount || !newTicketSupply
                        ? 'not-allowed'
                        : 'pointer',
                    border: '1px solid rgba(105,246,255,0.4)',
                    textTransform: 'uppercase',
                    flex: 1,
                  }}
                >
                  {isRunning ? 'Creating...' : '✅ Create Event'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreateEventMode(false);
                    setNewEventId('');
                    setNewEventName('');
                    setNewEventDate('');
                    setNewEventVenue('');
                    setNewEventDescription('');
                    setNewStakeAmount('');
                    setNewTicketSupply('');
                    setMaxTransferPrice('50');
                  }}
                  style={{
                    background: 'rgba(10, 25, 60, 0.6)',
                    color: '#9ad6ff',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    border: '1px solid rgba(120, 215, 255, 0.35)',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    flex: 1,
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <p style={{ color: '#8ba6ff', margin: 0 }}>
              Click "+ New Event" to create a new event for the lottery system.
            </p>
          )}
        </div>

        {/* ============================================
            CURRENT HOLDING EVENTS SECTION
            ============================================ */}
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
            🎪 Current Holding Events
          </h2>

          {allOwnedEvents.length === 0 ? (
            <p style={{ color: '#8ba6ff', margin: 0 }}>
              No events created yet. Create one above to get started!
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '24px' }}>
              {allOwnedEvents.map((event) => {
                const sale = saleDetails[event.eventId];
                const isLotteryDone = sale?.lotteryExecuted;

                const handleDeleteEvent = (eventId: number) => {
                    // Remove from local state
                    setCreatedEventsLocal((prev) => {
                    const updated = prev.filter((e) => e.eventId !== eventId);
                    saveCreatedEventsToStorage(updated);
                    return updated;
                    });

                    // Remove from owned events
                    setOwnedEvents((prev) => prev.filter((e) => e.eventId !== eventId));

                    // Remove sale details
                    setSaleDetails((prev) => {
                    const updated = { ...prev };
                    delete updated[eventId];
                    return updated;
                    });

                    setStatusMessage({
                    type: 'success',
                    text: `✅ Event #${eventId} deleted successfully.`,
                    });
                };

                return (
                  <div
                    key={event.eventId}
                    style={{
                        background: 'rgba(15, 40, 86, 0.75)',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '1px solid rgba(120, 215, 255, 0.35)',
                        backdropFilter: 'blur(12px)',
                        position: 'relative', // NEW: for positioning delete button
                    }}
                  >
                    {/* NEW: Delete Button (X in top right) */}
                    <button
                        onClick={() => handleDeleteEvent(event.eventId)}
                        style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(255, 111, 216, 0.2)',
                        color: '#ff6fd8',
                        border: '1px solid rgba(255, 111, 216, 0.4)',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '18px',
                        fontWeight: 700,
                        transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.background = 'rgba(255, 111, 216, 0.4)';
                        (e.target as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(255, 111, 216, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.background = 'rgba(255, 111, 216, 0.2)';
                        (e.target as HTMLButtonElement).style.boxShadow = 'none';
                        }}
                        title="Delete event"
                    >
                        ✕
                    </button>
                    {/* Event Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <h3
                          style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            margin: 0,
                            color: '#fdfbff',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}
                        >
                          #{event.eventId} - {event.name}
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(219, 228, 255, 0.7)' }}>
                          {event.date} • {event.venue}
                        </p>
                      </div>
                      <span
                        style={{
                          background: isLotteryDone ? 'rgba(0, 255, 224, 0.18)' : 'rgba(120, 115, 255, 0.14)',
                          color: isLotteryDone ? '#0ddfc2' : '#9aa9ff',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '6px 12px',
                          borderRadius: '999px',
                          whiteSpace: 'nowrap',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          border: '1px solid rgba(105,246,255,0.35)',
                        }}
                      >
                        {isLotteryDone ? '✅ Lottery Done' : '⏳ Pending Lottery'}
                      </span>
                    </div>

                    {event.description && (
                      <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'rgba(219, 228, 255, 0.7)' }}>
                        {event.description}
                      </p>
                    )}

                    {/* Sale Details Grid */}
                    {sale ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '11px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Stake</p>
                          <strong style={{ color: '#69f6ff', fontSize: '15px' }}>{sale.stakeFormatted} ETH</strong>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '11px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Entrants</p>
                          <strong style={{ color: '#dbe4ff', fontSize: '15px' }}>{sale.entrantsCount}</strong>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '11px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Supply</p>
                          <strong style={{ color: '#ff9dff', fontSize: '15px' }}>{sale.ticketsMinted} / {sale.ticketSupply}</strong>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '11px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Winners</p>
                          <strong style={{ color: '#dbe4ff', fontSize: '15px' }}>{sale.winnersCount}</strong>
                        </div>
                      </div>
                    ) : (
                      <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#8ba6ff' }}>Loading sale details...</p>
                    )}

                    {/* Run Lottery Button */}
                    {!isLotteryDone && (
                      <button
                        onClick={() => setSelectedEventId(event.eventId)}
                        style={{
                          background: 'rgba(105, 246, 255, 0.12)',
                          color: '#69f6ff',
                          border: '1px solid rgba(105,246,255,0.35)',
                          padding: '10px 16px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        🎰 Run Lottery for This Event
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================
            RUN LOTTERY FORM (appears when event selected)
            ============================================ */}
        {selectedEventId && !saleDetails[selectedEventId]?.lotteryExecuted && (
          <div
            style={{
              marginTop: '40px',
              background: 'rgba(0, 0, 0, 0.85)',
              borderRadius: '22px',
              boxShadow: '0 25px 70px rgba(255, 44, 230, 0.25)',
              padding: '32px',
              border: '1px solid rgba(237, 183, 225, 0.25)',
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
              🎰 Run Lottery
            </h2>

            <form onSubmit={handleRunLottery} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Selected Event Display */}
              {selectedEvent && selectedSale && (
                <div
                  style={{
                    background: 'rgba(105, 246, 255, 0.08)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(105,246,255,0.25)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '16px',
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Event</p>
                    <strong style={{ color: '#69f6ff' }}>#{selectedEvent.eventId} - {selectedEvent.name}</strong>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Entrants</p>
                    <strong style={{ color: '#dbe4ff' }}>{selectedSale.entrantsCount}</strong>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Ticket Supply</p>
                    <strong style={{ color: '#ff9dff' }}>{selectedSale.ticketSupply}</strong>
                  </div>
                </div>
              )}

              {/* Winners Count */}
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
                  Number of Winners *
                </label>
                <input
                  type="number"
                  value={winnersCount}
                  onChange={(e) => setWinnersCount(e.target.value)}
                  placeholder="e.g., 10"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(120, 215, 255, 0.35)',
                    background: 'rgba(10, 25, 60, 0.6)',
                    color: '#9ad6ff',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                  }}
                />
                {selectedSale && (
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#8ba6ff' }}>
                    Max: {selectedSale.ticketSupply} | Entrants: {selectedSale.entrantsCount}
                  </p>
                )}
              </div>

              {/* Random Seed */}
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
                  Random Seed *
                </label>
                <input
                  type="text"
                  value={randomSeed}
                  onChange={(e) => setRandomSeed(e.target.value)}
                  placeholder="e.g., cryptoTicketing2024"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(120, 215, 255, 0.35)',
                    background: 'rgba(10, 25, 60, 0.6)',
                    color: '#9ad6ff',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={isRunning || !winnersCount || !randomSeed}
                  style={{
                    background:
                      isRunning || !winnersCount || !randomSeed
                        ? 'rgba(120, 115, 255, 0.25)'
                        : 'linear-gradient(135deg, rgba(0,255,224,0.9), rgba(255,111,216,0.9))',
                    color:
                      isRunning || !winnersCount || !randomSeed
                        ? 'rgba(219, 228, 255, 0.5)'
                        : '#05060f',
                    padding: '14px 28px',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: isRunning || !winnersCount || !randomSeed ? 'not-allowed' : 'pointer',
                    border: '1px solid rgba(105,246,255,0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    boxShadow:
                      isRunning || !winnersCount || !randomSeed
                        ? 'none'
                        : '0 18px 38px rgba(0,255,224,0.35)',
                    flex: 1,
                  }}
                >
                  {isRunning ? 'Running Lottery...' : '🎰 Execute Lottery'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEventId(null);
                    setWinnersCount('');
                    setRandomSeed('');
                  }}
                  style={{
                    background: 'rgba(10, 25, 60, 0.6)',
                    color: '#9ad6ff',
                    padding: '14px 28px',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: 600,
                    border: '1px solid rgba(120, 215, 255, 0.35)',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    flex: 1,
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;