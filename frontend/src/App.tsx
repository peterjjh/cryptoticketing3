import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import AdminPanel from './AdminPanel';
import Resale from './Resale';
import ResalePanel from './ResalePanel';
// Removed TicketVerification component; replaced by inline verify & transfer logic.

// Claimed Tickets List Component (corrected)
const ClaimedTicketsList = ({
  tickets,
  eventName,
  eventId,
  onVerify,
  isWinnerOnChain,
  verifyingTokenIds,
  verifiedTokenIds
}: {
  tickets: { tokenId: number; eventId: number }[]
  eventName: string
  eventId: number
  onVerify: (tokenId: number) => void
  isWinnerOnChain: boolean
  verifyingTokenIds: Set<number>
  verifiedTokenIds: Set<number>
}) => {
  const navigate = useNavigate()
  return (
    <div style={{ background: 'rgba(0, 255, 224, 0.08)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0, 255, 224, 0.25)' }}>
      <h4 style={{ margin: 0, marginBottom: '12px', fontSize: '14px', color: '#0ddfc2', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>🎫 Your Claimed Tickets</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tickets.map(ticket => {
          const isVerified = verifiedTokenIds.has(ticket.tokenId)
          const isVerifying = verifyingTokenIds.has(ticket.tokenId)
          return (
            <div key={ticket.tokenId} style={{ background: 'rgba(10, 25, 60, 0.6)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(120, 215, 255, 0.25)', gap: '12px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: '#69f6ff', fontWeight: 600 }}>Token #{ticket.tokenId}</p>
                <p style={{ margin: 0, fontSize: '11px', color: '#8ba6ff' }}>Event: {eventName}</p>
                {isVerified && <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#0ddfc2', fontWeight: 600 }}>✅ Verified & Transferred</p>}
              </div>
              {!isVerified && (
                <button
                  onClick={() => onVerify(ticket.tokenId)}
                  disabled={!isWinnerOnChain || isVerifying}
                  style={{
                    background: isVerifying
                      ? 'rgba(0, 255, 224, 0.4)'
                      : !isWinnerOnChain
                      ? 'rgba(255, 157, 0, 0.3)'
                      : 'linear-gradient(135deg, rgba(0,255,224,0.85), rgba(255,111,216,0.85))',
                    color: '#05060f',
                    border: '1px solid rgba(105,246,255,0.4)',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: isWinnerOnChain && !isVerifying ? 'pointer' : 'not-allowed',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    boxShadow: isWinnerOnChain && !isVerifying ? '0 8px 20px rgba(0,255,224,0.25)' : 'none',
                    opacity: isWinnerOnChain ? 1 : 0.6,
                    minWidth: '140px'
                  }}
                >
                  {isVerifying ? 'Verifying...' : !isWinnerOnChain ? 'Awaiting status' : '🔍 Verify & Transfer'}
                </button>
              )}
              <button
                onClick={() => {
                  navigate('/resale', {
                    state: {
                      ticket: {
                        tokenId: ticket.tokenId,
                        eventId: ticket.eventId,
                        eventName: eventName,
                        state: 0,
                        mintTime: Date.now() / 1000
                      }
                    }
                  })
                }}
                style={{ background: 'linear-gradient(135deg, rgba(255,111,216,0.8), rgba(255,157,255,0.8))', color: '#05060f', border: '1px solid rgba(255,111,216,0.4)', padding: '8px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: '0 8px 20px rgba(255,111,216,0.25)' }}
              >
                💰 Resell
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Helper to parse date string and return a Date object for sorting
const parseEventDate = (dateStr: string): Date => {
  // Try ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  // Try "MMM DD, YYYY" format (result of formatDate helper)
  try {
    return new Date(dateStr);
  } catch (e) {
    return new Date(0); // fallback to epoch if parsing fails
  }
};

type WorkflowStep = {
  title: string
  description: string
}

type EventMeta = {
  eventId: number
  name: string
  date: string
  venue: string
  description?: string
  imageUrl?: string
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

type ParticipantSnapshot = {
  hasEntered: boolean
  isWinner: boolean
  hasClaimedRefund?: boolean
}

const containerStyle: React.CSSProperties = {
  padding: '32px',
  maxWidth: '980px',
  margin: '0 auto',
  fontFamily: '"Space Grotesk", "Inter", system-ui, sans-serif',
  color: '#dbe4ff',
  lineHeight: 1.65,
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.85)',
  borderRadius: '22px',
  boxShadow: '0 25px 70px rgba(255, 44, 230, 0.25)',
  padding: '32px',
  marginTop: '36px',
  border: '1px solid rgba(237, 183, 225, 0.25)',
  backdropFilter: 'blur(14px)',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '26px',
  marginBottom: '18px',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#69f6ff',
  textShadow: '0 0 18px rgba(105, 246, 255, 0.65)',
}



function App() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [readProvider, setReadProvider] = useState<ethers.providers.Provider | null>(null)
  const [events, setEvents] = useState<EventMeta[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [saleDetails, setSaleDetails] = useState<Record<number, SaleDetails>>({})
  const [saleLoading, setSaleLoading] = useState<Record<number, boolean>>({})
  const [participantStatus, setParticipantStatus] = useState<Record<number, ParticipantSnapshot>>({})
  const [pendingEventId, setPendingEventId] = useState<number | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const features = useMemo(
    () => [
      'Deploy custom NFT ticket drops with on-chain metadata',
      'Lottery-based primary sales to prevent bot attacks',
      'QR-based proof of ownership for on-site verification',
      'Compliant resale marketplace with royalty enforcement',
    ],
    [],
  )

  const workflow = useMemo<WorkflowStep[]>(
    () => [
      {
        title: 'Create Event',
        description:
          'Define metadata, upload artwork, and configure supply, pricing tiers, and on-chain royalty splits.',
      },
      {
        title: 'Launch Ticket Sale',
        description:
          'Choose lottery, raffle, or FCFS sale mechanics. Allowlist fans or open to the public with anti-bot controls.',
      },
      {
        title: 'Issue Tickets as NFTs',
        description:
          'Tickets are minted to buyers’ wallets, complete with dynamic QR codes for secure venue scanning.',
      },
      {
        title: 'Verify Entry On-Chain',
        description:
          'Use the verifier app to scan QR codes and validate proofs of ownership directly against the contract.',
      },
    ],
    [],
  )

  const fallbackEvents = useMemo<EventMeta[]>(
    () => [],
    [],
  )

  // Sort events by date (earliest first)
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const dateA = parseEventDate(a.date);
      const dateB = parseEventDate(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }, [events]);

  // Configuration state
  const [config, setConfig] = useState<{
    contractAddress: string | null;
    rpcUrl: string;
    chainId: number;
  }>({
    contractAddress: null,
    rpcUrl: import.meta.env.VITE_PUBLIC_RPC_URL || 'http://localhost:8545',
    chainId: parseInt(import.meta.env.VITE_CHAIN_ID) || 31337,
  })

  const eventsApiUrl = import.meta.env.VITE_EVENTS_API as string | undefined
  const configApiUrl = import.meta.env.VITE_CONFIG_API as string | undefined

  // Load configuration from backend
  const loadConfig = useCallback(async () => {
    if (!configApiUrl) {
      console.warn('Config API URL not set, using environment variables')
      return
    }

    try {
      const response = await fetch(configApiUrl)
      if (response.ok) {
        const backendConfig = await response.json()
        setConfig({
          contractAddress: backendConfig.contractAddress,
          rpcUrl: backendConfig.rpcUrl || import.meta.env.VITE_PUBLIC_RPC_URL || 'http://localhost:8545',
          chainId: backendConfig.chainId || parseInt(import.meta.env.VITE_CHAIN_ID) || 31337,
        })
        console.log('✅ Loaded config from backend:', backendConfig)
      } else {
        console.warn('Failed to fetch config from backend, using fallback values')
      }
    } catch (error) {
      console.warn('Error fetching config from backend:', error)
    }
  }, [configApiUrl])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const ticketAbi = useMemo(
  () => [
    'function configureEventSale(uint256 eventId, uint256 stakeAmount, uint256 ticketSupply, uint256 maxTransferPricePercent) external',
    'function getSaleOverview(uint256) view returns (uint256 stakeAmount,uint256 ticketSupply,uint256 ticketsMinted,bool isOpen,bool lotteryExecuted,uint256 entrantsCount,uint256 winnersCount)',
    'function enterSale(uint256) payable',
    'function hasEnteredSale(uint256,address) view returns (bool)',
    'function isSaleWinner(uint256,address) view returns (bool)',
    'function claimTicket(uint256 eventId) external returns (uint256)',
    'function transferTicket(uint256 tokenId, address to, uint256 transferPrice) external payable',
    'function transferWinnerStatus(uint256 eventId, address to) external',
    'function runLottery(uint256 eventId, uint256 winnersCount, bytes32 randomSeed) external',
    'function runLotteryAsEventOwner(uint256 eventId, uint256 winnersCount, bytes32 randomSeed) external',
    'function eventOwners(uint256) view returns (address)',
    'function getEventMaxTransferPrice(uint256) view returns (uint256)',
    'function withdrawStake(uint256 eventId) external',
    'function withdrawEntryBeforeLottery(uint256 eventId) external',
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function getTicket(uint256 tokenId) view returns (tuple(uint256 eventId, address owner, uint8 state, uint256 mintTime))',
  ],
  [],
)

  const loadReadProvider = useCallback(() => {
    if (config.rpcUrl) {
      setReadProvider(new ethers.providers.JsonRpcProvider(config.rpcUrl))
      return
    }
    if (window.ethereum) {
      setReadProvider(new ethers.providers.Web3Provider(window.ethereum))
    }
  }, [config.rpcUrl])

  useEffect(() => {
    loadReadProvider()
  }, [loadReadProvider])

  const baseTicketContract = useMemo(() => {
    if (!config.contractAddress || !readProvider) {
      return null
    }
    return new ethers.Contract(config.contractAddress, ticketAbi, readProvider)
  }, [config.contractAddress, readProvider, ticketAbi])

  const ticketContractWithSigner = useMemo(() => {
    if (!baseTicketContract || !signer) {
      return null
    }
    return baseTicketContract.connect(signer)
  }, [baseTicketContract, signer])

  const normalizeEvents = useCallback((raw: any[]): EventMeta[] => {
    const parsed: EventMeta[] = []
    raw.forEach((item) => {
      const eventId = Number(item?.eventId ?? item?.id)
      if (!Number.isFinite(eventId)) {
        return
      }
      parsed.push({
        eventId,
        name: (item?.name ?? `Event #${eventId}`) as string,
        date: (item?.date ?? 'TBA') as string,
        venue: (item?.venue ?? 'TBA') as string,
        description: item?.description as string | undefined,
        imageUrl: item?.imageUrl as string | undefined,
      })
    })
    return parsed
  }, [])

  const fetchEventsFromBackend = useCallback(async (): Promise<EventMeta[]> => {
    if (!eventsApiUrl) {
      throw new Error('Events API not configured')
    }

    const response = await fetch(eventsApiUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`)
    }

    const payload = await response.json()
    if (Array.isArray(payload)) {
      return normalizeEvents(payload)
    }
    if (Array.isArray(payload?.events)) {
      return normalizeEvents(payload.events)
    }
    throw new Error('Unexpected events response shape')
  }, [eventsApiUrl, normalizeEvents])

  const loadEvents = useCallback(async () => {
    setEventsLoading(true)
    setEventsError(null)
    try {
      const remoteEvents = await fetchEventsFromBackend()
      if (!remoteEvents.length) {
        throw new Error('No events returned from API')
      }
      setEvents(remoteEvents)
    } catch (error) {
      console.warn('Failed to load events from backend', error)
      setEvents([])
      setEventsError(null)
    } finally {
      setEventsLoading(false)
    }
  }, [fetchEventsFromBackend, fallbackEvents, eventsApiUrl])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const refreshSaleDetails = useCallback(
    async (eventId: number) => {
      if (!baseTicketContract) {
        return
      }

      setSaleLoading((prev) => ({ ...prev, [eventId]: true }))
      try {
        const sale = await baseTicketContract.getSaleOverview(eventId)
        const details: SaleDetails = {
          stakeAmount: sale.stakeAmount,
          stakeFormatted: ethers.utils.formatEther(sale.stakeAmount),
          ticketSupply: sale.ticketSupply.toString(),
          ticketsMinted: sale.ticketsMinted.toString(),
          isOpen: sale.isOpen,
          lotteryExecuted: sale.lotteryExecuted,
          entrantsCount: sale.entrantsCount.toString(),
          winnersCount: sale.winnersCount.toString(),
        }
        setSaleDetails((prev) => ({ ...prev, [eventId]: details }))
      } catch (error) {
        console.error(`Failed to fetch sale details for event ${eventId}`, error)
      } finally {
        setSaleLoading((prev) => ({ ...prev, [eventId]: false }))
      }
    },
    [baseTicketContract],
  )

  const refreshParticipantSnapshot = useCallback(
    async (eventId: number, participant: string) => {
      if (!baseTicketContract || !participant) {
        return
      }
      try {
        const [hasEntered, isWinner] = await Promise.all([
          baseTicketContract.hasEnteredSale(eventId, participant),
          baseTicketContract.isSaleWinner(eventId, participant),
        ])
        setParticipantStatus((prev) => ({
          ...prev,
          [eventId]: {
            hasEntered,
            isWinner,
            hasClaimedRefund: prev[eventId]?.hasClaimedRefund ?? false,
          },
        }))
      } catch (error) {
        console.error(`Failed to fetch participant status for event ${eventId}`, error)
      }
    },
    [baseTicketContract],
  )

  useEffect(() => {
    if (!baseTicketContract || !events.length) {
      return
    }
    events.forEach((event) => {
      refreshSaleDetails(event.eventId)
    })
  }, [baseTicketContract, events, refreshSaleDetails])

  useEffect(() => {
    if (!baseTicketContract || !walletAddress || !events.length) {
      return
    }
    events.forEach((event) => refreshParticipantSnapshot(event.eventId, walletAddress))
  }, [baseTicketContract, walletAddress, events, refreshParticipantSnapshot])

    // Effect 1: Listen for lottery completion events
  useEffect(() => {
    const handleLotteryComplete = (e: any) => {
      const eventId = e.detail?.eventId;
      if (eventId && walletAddress) {
        refreshParticipantSnapshot(eventId, walletAddress);
      }
    };

    window.addEventListener('lotteryCompleted', handleLotteryComplete);
    return () => window.removeEventListener('lotteryCompleted', handleLotteryComplete);
  }, [walletAddress, refreshParticipantSnapshot]);

  // Effect 2: Refresh sale details and participant status every 5 seconds
  useEffect(() => {
    if (!baseTicketContract || !events.length) {
      return;
    }

    // Refresh immediately on mount
    events.forEach((event) => {
      refreshSaleDetails(event.eventId);
      if (walletAddress) {
        refreshParticipantSnapshot(event.eventId, walletAddress);
      }
    });

    // Then refresh every 5 seconds
    const interval = setInterval(() => {
      events.forEach((event) => {
        refreshSaleDetails(event.eventId);

        // Also refresh participant status for current wallet
        if (walletAddress) {
          refreshParticipantSnapshot(event.eventId, walletAddress);
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [baseTicketContract, events, walletAddress, refreshSaleDetails, refreshParticipantSnapshot]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setStatusMessage({
        type: 'error',
        text: 'No Ethereum wallet detected. Install MetaMask or a compatible provider to continue.',
      })
      return
    }

    try {
      setIsConnecting(true)
      
      // First, request to switch to Anvil network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7a69' }], // 31337 in hex
        })
      } catch (switchError: any) {
        // If network doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x7a69', // 31337 in hex
              chainName: 'Anvil Local',
              rpcUrls: ['http://localhost:8545'],
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
              }
            }]
          })
        } else {
          throw switchError
        }
      }
      
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum)
      await web3Provider.send('eth_requestAccounts', [])
      const connectedSigner = web3Provider.getSigner()
      const account = await connectedSigner.getAddress()

      setWalletAddress(account)
      setSigner(connectedSigner)
      setReadProvider(web3Provider)
      setStatusMessage({ type: 'success', text: 'Wallet connected successfully to Anvil Local.' })
    } catch (error) {
      if (error instanceof Error) {
        setStatusMessage({ type: 'error', text: `Wallet connection failed: ${error.message}` })
      } else {
        setStatusMessage({ type: 'error', text: 'Wallet connection failed: Unexpected error.' })
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const handleEnterSale = useCallback(
    async (eventId: number, stakeAmount: ethers.BigNumber) => {
      if (!ticketContractWithSigner) {
        setStatusMessage({
          type: 'error',
          text: 'Connect your wallet to enter the sale.',
        })
        return
      }
      try {
        setPendingEventId(eventId)
        setStatusMessage({ type: 'info', text: 'Confirm the transaction in your wallet…' })
        const tx = await ticketContractWithSigner.enterSale(eventId, { value: stakeAmount })
        await tx.wait()
        setStatusMessage({ type: 'success', text: `Successfully entered lottery for event #${eventId}.` })

        await Promise.all([
          refreshSaleDetails(eventId),
          walletAddress ? refreshParticipantSnapshot(eventId, walletAddress) : Promise.resolve(),
        ])
      } catch (error) {
        if (error instanceof Error) {
          setStatusMessage({ type: 'error', text: `Failed to enter sale: ${error.message}` })
        } else {
          setStatusMessage({ type: 'error', text: 'Failed to enter sale due to an unknown error.' })
        }
      } finally {
        setPendingEventId(null)
      }
    },
    [ticketContractWithSigner, refreshSaleDetails, refreshParticipantSnapshot, walletAddress],
  )

  //NFT Ticketing contract interaction setup
  const [claimingTicket, setClaimingTicket] = useState<number | null>(null)
  const [claimedTickets, setClaimedTickets] = useState<Record<number, { tokenId: number; eventId: number }[]>>({})
    // Verification state for claimed tickets
    const [verifyingTokenIds, setVerifyingTokenIds] = useState<Set<number>>(new Set())
    const [verifiedTokenIds, setVerifiedTokenIds] = useState<Set<number>>(new Set())
  
    // Verify ticket then transfer to event creator
    const handleVerifyTicket = useCallback(async (eventId: number, tokenId: number) => {
      if (!ticketContractWithSigner || !walletAddress) return
      if (verifyingTokenIds.has(tokenId) || verifiedTokenIds.has(tokenId)) return
      setVerifyingTokenIds(prev => new Set(prev).add(tokenId))
      try {
        // Confirm ownership and active ticket
        const isValid = await ticketContractWithSigner.verifyTicket(tokenId, eventId, walletAddress)
        if (!isValid) {
          console.warn('Ticket not valid for verification')
          setVerifyingTokenIds(prev => { const n = new Set(prev); n.delete(tokenId); return n })
          return
        }
        // Fetch event owner
        const eventOwner: string = await ticketContractWithSigner.eventOwners(eventId)
        if (!eventOwner || eventOwner.toLowerCase() === walletAddress.toLowerCase()) {
          console.warn('Event owner invalid or same as holder')
          setVerifyingTokenIds(prev => { const n = new Set(prev); n.delete(tokenId); return n })
          return
        }
        // Transfer NFT to event owner
        const tx = await ticketContractWithSigner["safeTransferFrom(address,address,uint256)"](walletAddress, eventOwner, tokenId)
        await tx.wait()
        setVerifiedTokenIds(prev => new Set(prev).add(tokenId))
        window.alert('Ticket verified & transferred to event creator')
      } catch (err) {
        console.error('Verification/transfer failed:', err)
      } finally {
        setVerifyingTokenIds(prev => { const n = new Set(prev); n.delete(tokenId); return n })
      }
    }, [ticketContractWithSigner, walletAddress, verifyingTokenIds, verifiedTokenIds])
  const [purchasedClaimRights, setPurchasedClaimRights] = useState<any[]>([])
  const [soldClaimRights, setSoldClaimRights] = useState<Set<string>>(new Set())
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([])
  const [transferringEventId, setTransferringEventId] = useState<number | null>(null)
  const [storageUpdateTrigger, setStorageUpdateTrigger] = useState<number>(0) // Force reload trigger
  // Debug flag (enable by setting localStorage key 'cryptoTicketing_debug' to 'true')
  const debugEnabled = useMemo(() => {
    try {
      return localStorage.getItem('cryptoTicketing_debug') === 'true'
    } catch { return false }
  }, [])
  
  // Load purchased claim rights from localStorage
  useEffect(() => {
    const loadClaimRights = () => {
      const rights = JSON.parse(localStorage.getItem('cryptoTicketing_claimRights') || '[]')
      const resoldTickets = JSON.parse(localStorage.getItem('cryptoTicketing_resoldTickets') || '[]')
      
      console.log('📦 All claim rights in storage:', rights);
      console.log('🏪 All resold tickets in storage:', resoldTickets);
      console.log('👛 Current wallet:', walletAddress);
      
      // Get claim rights purchased by current user that haven't been resold yet
      const activeClaimRights = rights.filter((r: any) => {
        // Normalize addresses to lowercase for comparison (Ethereum addresses are case-insensitive)
        const normalizedNewOwner = r.newOwner?.toLowerCase();
        const normalizedOriginalWinner = r.originalWinner?.toLowerCase();
        const normalizedWallet = walletAddress?.toLowerCase();
        
        // Check if this user owns it (as newOwner)
        if (normalizedNewOwner !== normalizedWallet) return false;
        
        // CRITICAL: Only show if user is NOT the original winner
        // This ensures only marketplace purchases are shown, never lottery wins
        if (normalizedOriginalWinner === normalizedWallet) {
          console.log('🚫 Excluding claim right - user is original winner:', r);
          return false;
        }
        
        // ADDITIONAL CHECK: Only show if there's actually a different original winner
        // This prevents showing claim rights that were never actually purchased from marketplace
        if (!r.originalWinner || normalizedOriginalWinner === normalizedNewOwner) {
          console.log('🚫 Excluding claim right - no valid original winner or same as new owner:', r);
          return false;
        }
        
        // Check if it's currently listed for resale by someone
        const isListed = resoldTickets.some((t: any) => 
          t.eventId === r.eventId && 
          t.isClaimRight && 
          t.seller?.toLowerCase() === normalizedWallet
        );
        
        if (isListed) {
          console.log('🚫 Excluding claim right - currently listed:', r);
        }
        
        return !isListed; // Only include if not currently listed
      });
      
      console.log('✅ Active purchased claim rights for this user:', activeClaimRights);
      
      setPurchasedClaimRights(activeClaimRights)
      
      // Track which claim rights (lottery wins OR purchased) have been listed for sale by this user
      // Check resoldTickets for any claim rights this user has listed
      const normalizedWallet = walletAddress?.toLowerCase();
      // Load persisted sold claim right keys (to survive listing mutation/removal)
      const persistedSoldKeys: string[] = JSON.parse(localStorage.getItem('cryptoTicketing_soldClaimRights') || '[]');
      // Prune stale persisted sold keys (older than 7 days) based on resoldTickets soldTimestamp
      const NOW = Date.now();
      const TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
      const validPersistedKeys = persistedSoldKeys.filter((key) => {
        const [eventIdStr] = key.split('-');
        const eventIdNum = parseInt(eventIdStr, 10);
        const matching = resoldTickets.find((t: any) => t.eventId === eventIdNum && t.seller && key === `${t.eventId}-${t.seller.toLowerCase()}`);
        if (!matching) {
          console.log('🧹 Removing orphan persisted sold key (no matching ticket):', key);
          return false;
        }
        if (matching.soldTimestamp && NOW - matching.soldTimestamp > TTL) {
          console.log('🧹 Removing expired sold key (>TTL):', key);
          return false;
        }
        return true;
      });
      if (validPersistedKeys.length !== persistedSoldKeys.length) {
        localStorage.setItem('cryptoTicketing_soldClaimRights', JSON.stringify(validPersistedKeys));
        console.log(`🧹 Pruned ${persistedSoldKeys.length - validPersistedKeys.length} stale sold claim right keys`);
      }
      
      const soldKeys = resoldTickets
        .filter((t: any) => {
          const isSeller = t.seller?.toLowerCase() === normalizedWallet;
          const isSoldFlag = t.sold === true; // new flag when purchased
          const isClaimRight = t.isClaimRight === true;
          const key = `${t.eventId}-${normalizedWallet}`;
          
          if (isSeller && isClaimRight && (isSoldFlag || validPersistedKeys.includes(key))) {
            console.log(`✅ Recognized sold claim right (persistent): Event ${t.eventId} by ${t.seller}`);
            return true;
          }
          return false;
        })
        .map((t: any) => `${t.eventId}-${normalizedWallet}`) as string[];
      
      // Remove duplicates
      const uniqueSoldKeys = Array.from(new Set(soldKeys));
      
      console.log('🔒 Sold claim right keys (unique):', uniqueSoldKeys);
      console.log('🔒 Total sold claim rights:', uniqueSoldKeys.length);
      setSoldClaimRights(new Set<string>(uniqueSoldKeys))
    }
    if (walletAddress) {
      loadClaimRights()
    }
  }, [walletAddress, storageUpdateTrigger]) // Re-run when storageUpdateTrigger changes

  // Optional: periodic cleanup for stale sold claim right keys when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      // Trigger reload which includes pruning logic
      setStorageUpdateTrigger(Date.now());
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Load pending transfers that need to be completed by this user
  useEffect(() => {
    const loadPendingTransfers = () => {
      const transfers = JSON.parse(localStorage.getItem('cryptoTicketing_pendingTransfers') || '[]')
      
      // Remove stale transfers (older than 10 minutes or missing required fields)
      const now = Date.now()
      const TEN_MINUTES = 10 * 60 * 1000
      const validTransfers = transfers.filter((t: any) => {
        // Remove if missing required fields
        if (!t.eventId || !t.seller || !t.buyer) {
          console.log('🗑️ Removing invalid transfer (missing fields):', t)
          return false
        }
        // Remove if older than 10 minutes
        if (t.timestamp && (now - t.timestamp) > TEN_MINUTES) {
          console.log('🗑️ Removing stale transfer (>10 minutes old):', t)
          return false
        }
        // Remove if already completed
        if (t.completed) {
          console.log('🗑️ Removing completed transfer:', t)
          return false
        }
        return true
      })
      
      // Save cleaned list back to localStorage
      if (validTransfers.length !== transfers.length) {
        localStorage.setItem('cryptoTicketing_pendingTransfers', JSON.stringify(validTransfers))
        console.log(`🧹 Cleaned ${transfers.length - validTransfers.length} stale/invalid transfers`)
      }
      
      // Filter for transfers where this user is the seller (original winner)
      const myPendingTransfers = validTransfers.filter((t: any) => 
        t.seller?.toLowerCase() === walletAddress?.toLowerCase()
      )
      
      console.log('🔄 Pending transfers for current user:', myPendingTransfers)
      setPendingTransfers(myPendingTransfers)
    }
    
    if (walletAddress) {
      loadPendingTransfers()
    }
  }, [walletAddress])
  
  // Debug: Watch soldClaimRights changes
  useEffect(() => {
    console.log('🔍 soldClaimRights state updated:', Array.from(soldClaimRights));
  }, [soldClaimRights])
  
  const handleTransferWinnerStatus = useCallback(
    async (eventId: number, buyerAddress: string) => {
      if (!ticketContractWithSigner) {
        setStatusMessage({
          type: 'error',
          text: 'Connect your wallet to transfer winner status.',
        })
        return
      }

      if (!walletAddress) {
        setStatusMessage({
          type: 'error',
          text: 'Wallet address not available.',
        })
        return
      }

      try {
        setTransferringEventId(eventId)
        
        // Check if buyer is already a winner before attempting transfer
        console.log('🔍 Checking if buyer is already a winner...')
        const buyerIsWinner = await ticketContractWithSigner.isSaleWinner(eventId, buyerAddress)
        
        if (buyerIsWinner) {
          console.warn('⚠️ Buyer is already a winner for this event')
          setStatusMessage({
            type: 'error',
            text: 'Cannot transfer: Buyer already won the lottery for this event.',
          })
          setTransferringEventId(null)
          return
        }
        
        setStatusMessage({
          type: 'info',
          text: 'Transferring winner status on blockchain... Confirm in your wallet.',
        })

        const tx = await ticketContractWithSigner.transferWinnerStatus(eventId, buyerAddress)
        console.log('📋 Transfer tx:', tx.hash)
        await tx.wait()
        console.log('✅ Winner status transferred successfully!')

        setStatusMessage({
          type: 'success',
          text: `✅ Winner status transferred to buyer! They can now claim the NFT.`,
        })

        const normalizedWallet = walletAddress.toLowerCase();
        
        // Mark transfer as completed in localStorage
        const transfers = JSON.parse(localStorage.getItem('cryptoTicketing_pendingTransfers') || '[]')
        const transfer = transfers.find((t: any) => 
          t.eventId === eventId && t.seller?.toLowerCase() === normalizedWallet
        )
        
        if (!transfer) {
          console.warn(`⚠️ No pending transfer found for event ${eventId}`);
        }
        
        const updated = transfers.map((t: any) => 
          t.eventId === eventId && t.seller?.toLowerCase() === normalizedWallet
            ? { ...t, completed: true, completedAt: Date.now(), buyerAddress }
            : t
        )
        localStorage.setItem('cryptoTicketing_pendingTransfers', JSON.stringify(updated))
        
        // IMPORTANT: Add to resoldTickets so the seller sees "CLAIM RIGHT SOLD" status
        let resoldTickets = JSON.parse(localStorage.getItem('cryptoTicketing_resoldTickets') || '[]')
        
        // Check if this claim right sale already exists to prevent duplicates
        const alreadyExists = resoldTickets.some((t: any) => 
          t.eventId === eventId && 
          t.seller?.toLowerCase() === normalizedWallet && 
          t.isClaimRight === true
        )
        
        if (!alreadyExists) {
          // Add sold claim right record
          const soldRecord = {
            eventId: eventId,
            eventName: transfer?.eventName || `Event #${eventId}`,
            seller: walletAddress,
            buyer: buyerAddress,
            price: transfer?.price || '0',
            timestamp: Date.now(),
            isClaimRight: true,
            winnerAddress: walletAddress,
            transferCompleted: true,
            transferMethod: 'direct', // vs 'marketplace'
          }
          
          resoldTickets.push(soldRecord)
          localStorage.setItem('cryptoTicketing_resoldTickets', JSON.stringify(resoldTickets))
          console.log('✅ Added sold claim right record:', soldRecord)
        } else {
          console.log('ℹ️ Sold claim right already recorded for this event');
        }
        
        // Reload soldClaimRights state immediately
        const soldKeys = resoldTickets
          .filter((t: any) => 
            t.isClaimRight && 
            t.seller?.toLowerCase() === normalizedWallet
          )
          .map((t: any) => `${t.eventId}-${normalizedWallet}`);
        
        console.log('🔄 Updating soldClaimRights state:', soldKeys);
        setSoldClaimRights(new Set(soldKeys))
        
        // Reload pending transfers
        const myPendingTransfers = updated.filter((t: any) => 
          t.seller?.toLowerCase() === normalizedWallet && !t.completed
        )
        setPendingTransfers(myPendingTransfers)
        
        // Trigger storage reload to ensure UI updates
        setStorageUpdateTrigger(Date.now())
        
        // Force re-render by updating participant status
        if (participantStatus[eventId]) {
          setParticipantStatus((prev) => ({
            ...prev,
            [eventId]: {
              ...prev[eventId],
              _forceUpdate: Date.now(), // Trigger re-render
            },
          }))
        }
      } catch (error) {
        console.error('❌ Transfer failed:', error)
        if (error instanceof Error) {
          setStatusMessage({
            type: 'error',
            text: `Transfer failed: ${error.message}`,
          })
        }
      } finally {
        setTransferringEventId(null)
      }
    },
    [ticketContractWithSigner, walletAddress, participantStatus, setStorageUpdateTrigger],
  )

  // Safe JSON parse helper
  const safeParseArray = (key: string): any[] => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      console.warn(`⚠️ Corrupted localStorage key '${key}', resetting.`, e)
      localStorage.removeItem(key)
      return []
    }
  }

  const handleClaimTicket = useCallback(
    async (eventId: number) => {
      if (!ticketContractWithSigner || !walletAddress) {
        setStatusMessage({
          type: 'error',
          text: 'Connect your wallet to claim a ticket.',
        })
        return
      }

      try {
        setClaimingTicket(eventId)
        setStatusMessage({
          type: 'info',
          text: 'Minting your NFT ticket... Confirm in your wallet.',
        })

        const tx = await ticketContractWithSigner.claimTicket(eventId)
        console.log('📋 Claim tx:', tx.hash)
        const receipt = await tx.wait()
        console.log('✅ Ticket claimed receipt:', receipt)

        // Defensive tokenId extraction
        let extractedTokenId: number | null = null
        try {
          const mintedEvent = receipt.events?.find((e: any) => e.event === 'TicketMinted' || e.topics?.length)
          // Prefer decoded args; fallback to first numeric arg heuristic
          if (mintedEvent?.args) {
            // Common patterns: args.tokenId or args[0]
            if (mintedEvent.args.tokenId) {
              extractedTokenId = mintedEvent.args.tokenId.toNumber?.() ?? Number(mintedEvent.args.tokenId)
            } else if (mintedEvent.args[0]) {
              const candidate = mintedEvent.args[0]
              extractedTokenId = candidate.toNumber?.() ?? Number(candidate)
            }
          }
        } catch (parseErr) {
          console.warn('⚠️ Failed to parse TicketMinted event:', parseErr)
        }

        // Fallback: derive from sale details if not found (ticketsMinted is post-increment)
        if (extractedTokenId == null) {
          try {
            const sale = saleDetails[eventId]
            if (sale) {
              const mintedCount = Number(sale.ticketsMinted)
              if (Number.isFinite(mintedCount) && mintedCount > 0) {
                extractedTokenId = mintedCount // assumes sequential starting at 1
                console.log('🛟 Fallback tokenId from sale.ticketsMinted:', extractedTokenId)
              }
            }
          } catch (fallbackErr) {
            console.warn('Fallback tokenId derivation failed:', fallbackErr)
          }
        }

        // If still null, warn and abort UI update
        if (extractedTokenId == null) {
          setStatusMessage({
            type: 'error',
            text: 'Ticket claimed but tokenId not parsed. Refresh data or check explorer.',
          })
        } else {
          // Persist in state
            setClaimedTickets((prev) => ({
              ...prev,
              [eventId]: [...(prev[eventId] || []), { tokenId: extractedTokenId!, eventId }],
            }))
          // Persist to localStorage for cross-page visibility (for ResalePanel)
          try {
            const claimedStoreRaw = localStorage.getItem('cryptoTicketing_claimedTickets')
            const claimedArr = claimedStoreRaw ? JSON.parse(claimedStoreRaw) : []
            const eventName = events.find(e => e.eventId === eventId)?.name || `Event #${eventId}`
            claimedArr.push({ tokenId: extractedTokenId, eventId, eventName, owner: walletAddress })
            localStorage.setItem('cryptoTicketing_claimedTickets', JSON.stringify(claimedArr))
          } catch (e) {
            console.warn('Failed to persist claimed ticket to localStorage', e)
          }
          setStatusMessage({
            type: 'success',
            text: `🎫 NFT Ticket #${extractedTokenId} claimed! Check your wallet.`,
          })
        }

        // Cleanup marketplace / claim right records safely
        const resoldTicketsArr = safeParseArray('cryptoTicketing_resoldTickets')
        const cleanedResold = resoldTicketsArr.filter(
          (t: any) => !(t?.eventId === eventId && t?.isClaimRight && t?.seller?.toLowerCase() === walletAddress.toLowerCase())
        )
        if (cleanedResold.length !== resoldTicketsArr.length) {
          localStorage.setItem('cryptoTicketing_resoldTickets', JSON.stringify(cleanedResold))
        }

        const claimRightsArr = safeParseArray('cryptoTicketing_claimRights')
        const cleanedRights = claimRightsArr.filter(
          (r: any) => !(r?.eventId === eventId && r?.newOwner?.toLowerCase() === walletAddress.toLowerCase())
        )
        if (cleanedRights.length !== claimRightsArr.length) {
          localStorage.setItem('cryptoTicketing_claimRights', JSON.stringify(cleanedRights))
        }
        setPurchasedClaimRights(cleanedRights.filter((r: any) => r?.newOwner?.toLowerCase() === walletAddress.toLowerCase()))

        // Refresh participant status & sale details regardless of outcome
        await refreshParticipantSnapshot(eventId, walletAddress)
        await refreshSaleDetails(eventId)
      } catch (error) {
        console.error('❌ Claim failed:', error)
        if (error instanceof Error) {
          if (error.message.includes('Already claimed')) {
            setStatusMessage({
              type: 'success',
              text: '✅ Ticket already claimed! Check your wallet for your NFT.',
            })
            await refreshParticipantSnapshot(eventId, walletAddress)
          } else {
            setStatusMessage({
              type: 'error',
              text: `Failed to claim ticket: ${error.message}`,
            })
          }
        } else {
          setStatusMessage({ type: 'error', text: 'Failed to claim ticket: Unknown error.' })
        }
      } finally {
        setClaimingTicket(null)
      }
    },
    [ticketContractWithSigner, walletAddress, refreshParticipantSnapshot, refreshSaleDetails, saleDetails],
  )

const [withdrawingEventId, setWithdrawingEventId] = useState<number | null>(null)
const handleWithdrawStake = useCallback(
  async (eventId: number, isBeforeLottery: boolean) => {
    if (!ticketContractWithSigner) {
      setStatusMessage({
        type: 'error',
        text: 'Connect your wallet to withdraw.',
      })
      return
    }

    try {
      setWithdrawingEventId(eventId)
      const functionName = isBeforeLottery ? 'withdrawEntryBeforeLottery' : 'withdrawStake'
      const actionText = isBeforeLottery ? 'Withdrawing from lottery' : 'Claiming your refund'
      
      setStatusMessage({
        type: 'info',
        text: `${actionText}... Confirm in your wallet.`,
      })

      const tx = await ticketContractWithSigner[functionName](eventId)
      console.log(`📤 ${functionName} tx:`, tx.hash)
      const receipt = await tx.wait()
      console.log(`✅ ${functionName} successful!`, receipt)

      setStatusMessage({
        type: 'success',
        text: isBeforeLottery 
          ? `✅ Withdrew from lottery! Your stake has been refunded.`
          : `✅ Refund claimed! Check your wallet.`,
      })

      // Mark refund as claimed for post-lottery withdrawals
      if (!isBeforeLottery) {
        setParticipantStatus((prev) => ({
          ...prev,
          [eventId]: {
            ...prev[eventId],
            hasClaimedRefund: true,
          },
        }))
      }

      // Refresh participant status and sale details
      await refreshParticipantSnapshot(eventId, walletAddress!)
      await refreshSaleDetails(eventId)
    } catch (error) {
      console.error('❌ Withdraw failed:', error)
      if (error instanceof Error) {
        setStatusMessage({
          type: 'error',
          text: `Withdraw failed: ${error.message}`,
        })
      }
    } finally {
      setWithdrawingEventId(null)
    }
  },
  [ticketContractWithSigner, walletAddress, refreshParticipantSnapshot, refreshSaleDetails],
)

  return (
    <Router>
      <Routes>
        <Route path="/" element={
    <div
      style={{
        background:
          'radial-gradient(circle at 10% 20%, rgba(252, 110, 184, 0.49) 0%, rgba(0, 0, 0, 0) 65%), radial-gradient(circle at 90% 10%, rgba(62, 203, 250, 1) 0%, rgba(0, 0, 0, 0) 65%), #000000ff',
        minHeight: '100vh',
      }}
    >
      <header
        style={{
          // background: 'linear-gradient(140deg, rgba(120, 190, 202, 0.85) 0%, rgba(142, 71, 126, 0.95) 65%, rgba(141, 38, 178, 0.3) 100%)',
          background: 'linear-gradient(140deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.95) 35%, rgba(0, 0, 0, 0.85) 100%)',
          borderBottom: '1px solid rgba(105, 246, 255, 0.25)',
          boxShadow: '0 20px 80px rgba(89, 0, 255, 0.25)',
          padding: '60px 0 72px',
          position: 'relative',
        }}
      >
        <div style={containerStyle}>
          <p
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(105, 245, 255, 0.16)',
              padding: '7px 18px',
              borderRadius: '999px',
              fontSize: '13px',
              letterSpacing: '0.12em',
              color: '#69f6ff',
              textTransform: 'uppercase',
            }}
          >
            <span role="img" aria-label="ticket">
              🎫
            </span>
            Next-gen ticketing rails
          </p>
          <h1
            style={{
              fontSize: '124px',
              marginTop: '26px',
              marginBottom: '22px',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#f9feff',
              textShadow: '0 0 32px rgba(165, 92, 255, 1)',
            }}
          >
            CryptoTicketing
          </h1>
          <p
            style={{
              fontSize: '18px',
              maxWidth: '560px',
              color: 'rgba(220, 242, 255, 0.82)',
              textShadow: '0 0 14px rgba(0, 255, 224, 0.25)',
            }}
          >
            Launch on-chain events, automate ticketing workflows, and give fans unstoppable access to the experiences they
            love.
          </p>
          <div style={{ marginTop: '32px', display: 'flex', gap: '16px' }}>
            <button
              type="button"
              onClick={connectWallet}
              disabled={isConnecting}
              style={{
                background: 'linear-gradient(130deg, rgba(0, 204, 255, 0.77), rgba(170, 0, 255, 0.72))',
                color: '#05060f',
                border: '1px solid rgba(105, 246, 255, 0.6)',
                padding: '15px 30px',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: isConnecting ? 'progress' : 'pointer',
                boxShadow: '0 18px 40px rgba(89, 0, 255, 0.35)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {walletAddress
                ? `Wallet Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                : isConnecting
                ? 'Connecting...'
                : 'Connect Wallet'}
            </button>
            <button
              type="button"
              style={{
                background: 'rgba(8, 231, 255, 0.08)',
                color: '#9ad6ff',
                border: '1px solid rgba(120, 215, 255, 0.35)',
                padding: '15px 30px',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Explore Contracts
            </button>
          </div>
        </div>

        {/* ADD THIS OWNER LOGIN BUTTON */}
        <div
              style={{
                position: 'absolute',
                top: '32px',
                right: '32px',
                display: 'flex',
                gap: '12px',
              }}
            >
              <Link to="/marketplace">
                <button
                  type="button"
                  style={{
                    background: 'rgba(255, 111, 216, 0.12)',
                    color: '#ff9dff',
                    border: '1px solid rgba(255, 111, 216, 0.35)',
                    padding: '12px 24px',
                    borderRadius: '14px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    boxShadow: '0 12px 36px rgba(255, 111, 216, 0.25)',
                  }}
                >
                  Marketplace
                </button>
              </Link>
              <Link to="/admin">
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
                    boxShadow: '0 12px 36px rgba(89, 0, 255, 0.25)',
                  }}
                >
                  Owner Login
                </button>
              </Link>
        </div>
      </header>

      <main style={{ ...containerStyle, paddingBottom: '80px' }}>
        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Why builders choose CryptoTicketing</h2>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {features.map((feature) => (
              <li
                key={feature}
                style={{ marginBottom: '10px', fontSize: '16px', color: 'rgba(219, 228, 255, 0.78)', letterSpacing: '0.03em' }}
              >
                {feature}
              </li>
            ))}
          </ul>
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Upcoming on-chain drops</h2>
          {events.length === 0 ? (
            <p style={{ color: 'rgba(219, 228, 255, 0.7)', fontSize: '15px' }}>No events yet. Create one from the Admin Panel!</p>
          ) : (
            <div
              style={{
                display: 'flex',
                overflowX: 'auto',
                gap: '20px',
                paddingBottom: '12px',
              }}
            >
              {sortedEvents.slice(0, 10).map((event) => (
                <article
                  key={event.eventId}
                  style={{
                    flex: '0 0 280px',
                    borderRadius: '18px',
                    border: '1px solid rgba(120, 215, 255, 0.35)',
                    padding: '22px',
                    background:
                      'linear-gradient(150deg, rgba(15, 40, 86, 0.75), rgba(101, 49, 255, 0.25))',
                    boxShadow: '0 18px 42px rgba(76, 201, 240, 0.22)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '20px',
                      fontWeight: 600,
                      marginBottom: '14px',
                      color: '#fdfbff',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      textShadow: '0 0 18px rgba(120, 215, 255, 0.45)',
                    }}
                  >
                    {event.name}
                  </h3>
                  <p style={{ margin: '6px 0', fontWeight: 500, color: '#adf9ff' }}>{event.date}</p>
                  <p style={{ margin: '6px 0', color: 'rgba(244, 244, 255, 0.7)' }}>{event.venue}</p>
                  {event.description && (
                    <p style={{ marginTop: '10px', fontSize: '13px', color: 'rgba(219, 228, 255, 0.6)' }}>{event.description}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Ticketing workflow</h2>
          <ol style={{ margin: 0, paddingLeft: '20px' }}>
            {workflow.map((step, index) => (
              <li key={step.title} style={{ marginBottom: '12px' }}>
                <strong
                  style={{
                    color: '#ff9dff',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    textShadow: '0 0 14px rgba(255, 157, 255, 0.6)',
                  }}
                >
                  {`0${index + 1}. ${step.title}`}
                </strong>
                <p style={{ margin: '6px 0 0', color: 'rgba(219, 228, 255, 0.72)', fontSize: '15px' }}>
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Live primary sales</h2>

          {!config.contractAddress && (
            <div
              style={{
                background: 'rgba(255, 111, 216, 0.08)',
                color: '#ff72f9',
                padding: '14px 18px',
                borderRadius: '14px',
                marginBottom: '20px',
                border: '1px solid rgba(255, 111, 216, 0.35)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Waiting for contract address auto-detection from backend...
            </div>
          )}

          {config.contractAddress && (
            <div
              style={{
                background: 'rgba(10, 25, 60, 0.65)',
                color: '#9ad6ff',
                padding: '14px 18px',
                borderRadius: '14px',
                marginBottom: '20px',
                border: '1px solid rgba(120, 215, 255, 0.35)',
                fontSize: '14px',
                boxShadow: '0 15px 45px rgba(76, 201, 240, 0.25)',
                letterSpacing: '0.04em',
              }}
            >
              {/* 📍 Contract: <code>{config.contractAddress}</code> | RPC: <code>{config.rpcUrl}</code> | Chain: <code>{config.chainId}</code> */}
              📍 RPC: <code>{config.rpcUrl}</code> | Chain: <code>{config.chainId}</code>
            </div>
          )}

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
                padding: '14px 18px',
                borderRadius: '14px',
                marginBottom: '20px',
                border: '1px solid rgba(105,246,255,0.25)',
                boxShadow: '0 12px 36px rgba(89, 0, 255, 0.22)',
                letterSpacing: '0.04em',
              }}
            >
              {statusMessage.text}
            </div>
          )}

          {eventsError && (
            <p style={{ color: '#ff72f9', marginBottom: '16px', letterSpacing: '0.05em' }}>
              {eventsError}
            </p>
          )}

          {/* ═══ Pending Transfers Section ═══ */}
          {pendingTransfers.filter((transfer: any) => {
            const sale = saleDetails[transfer.eventId]
            return sale?.lotteryExecuted === true
          }).length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(255,157,0,0.15), rgba(255,69,0,0.15))',
                  border: '2px solid rgba(255,157,0,0.4)',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 12px 30px rgba(255,157,0,0.2)',
                }}
              >
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    margin: '0 0 16px 0',
                    color: '#ffa500',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  ⚠️ Action Required: Complete Transfers
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#dbe4ff', lineHeight: '1.6' }}>
                  You have sold claim rights and received payment. Click "Transfer Winner Status" to complete the transfer on-chain so buyers can claim their NFTs.
                </p>
                {pendingTransfers
                  .filter((transfer: any) => {
                    const sale = saleDetails[transfer.eventId]
                    return sale?.lotteryExecuted === true
                  })
                  .map((transfer: any, idx: number) => {
                  const event = events.find((e) => e.eventId === transfer.eventId)
                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(10, 25, 60, 0.7)',
                        padding: '16px',
                        borderRadius: '12px',
                        marginBottom: idx < pendingTransfers.length - 1 ? '12px' : '0',
                        border: '1px solid rgba(255,157,0,0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <p style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#ffa500', fontWeight: 600 }}>
                            {event?.name || `Event #${transfer.eventId}`}
                          </p>
                          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#8ba6ff' }}>
                            Buyer: {transfer.buyer?.substring(0, 6)}...{transfer.buyer?.substring(38)}
                          </p>
                          <p style={{ margin: '0', fontSize: '11px', color: '#69f6ff' }}>
                            Payment received: {transfer.price} ETH
                          </p>
                        </div>
                        <button
                          onClick={() => handleTransferWinnerStatus(transfer.eventId, transfer.buyer)}
                          disabled={transferringEventId === transfer.eventId}
                          style={{
                            background: transferringEventId === transfer.eventId
                              ? 'rgba(255,157,0,0.5)'
                              : 'linear-gradient(135deg, rgba(255,157,0,0.9), rgba(255,69,0,0.9))',
                            color: '#05060f',
                            border: '1px solid rgba(255,157,0,0.4)',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: transferringEventId === transfer.eventId ? 'not-allowed' : 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            boxShadow: '0 8px 20px rgba(255,157,0,0.3)',
                            opacity: transferringEventId === transfer.eventId ? 0.7 : 1,
                            minWidth: '200px',
                          }}
                        >
                          {transferringEventId === transfer.eventId
                            ? '🔄 Transferring...'
                            : '✅ Transfer Winner Status'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {eventsLoading ? (
            <p style={{ color: '#9ad6ff', letterSpacing: '0.08em' }}>Loading events…</p>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {events.map((event) => {
                const sale = saleDetails[event.eventId]
                const participant = participantStatus[event.eventId]
                const loadingSaleInfo = saleLoading[event.eventId]
                const isEntering = pendingEventId === event.eventId
                const isDisabled =
                  !sale ||
                  !sale.isOpen ||
                  !ticketContractWithSigner ||
                  !walletAddress ||
                  isEntering ||
                  Boolean(participant?.hasEntered)

                return (
                  <article
                    key={event.eventId}
                    style={{
                      borderRadius: '20px',
                      border: '1px solid rgba(89, 0, 255, 0.35)',
                      padding: '26px',
                      background: 'linear-gradient(135deg, rgba(14, 32, 74, 0.85), rgba(89, 0, 255, 0.28))',
                      boxShadow: '0 22px 60px rgba(76, 201, 240, 0.3)',
                      backdropFilter: 'blur(16px)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div>
                        <h3
                          style={{
                            fontSize: '22px',
                            fontWeight: 600,
                            marginBottom: '8px',
                            color: '#fdfbff',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            textShadow: '0 0 18px rgba(120, 215, 255, 0.45)',
                          }}
                        >
                          {event.name}
                        </h3>
                        <p style={{ margin: 0, color: 'rgba(219, 228, 255, 0.7)', fontSize: '15px', letterSpacing: '0.05em' }}>
                          {/* #{event.eventId} • {event.date} • {event.venue} */}
                          {event.date} • {event.venue}
                        </p>
                      </div>
                      {sale && (
                        <span
                          style={{
                            background: sale.isOpen ? 'rgba(0, 255, 224, 0.18)' : 'rgba(120, 115, 255, 0.14)',
                            color: sale.isOpen ? '#0ddfc2' : '#9aa9ff',
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '7px 14px',
                            borderRadius: '999px',
                            whiteSpace: 'nowrap',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            border: '1px solid rgba(105,246,255,0.35)',
                          }}
                        >
                          {sale.isOpen ? 'Open' : sale.lotteryExecuted ? 'Lottery closed' : 'Pending'}
                        </span>
                      )}
                    </div>

                    {event.description && (
                      <p style={{ marginTop: '12px', color: '#475569', fontSize: '15px' }}>{event.description}</p>
                    )}

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '12px',
                        marginTop: '16px',
                      }}
                    >
                      <div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Stake required</p>
                        <strong style={{ fontSize: '18px', color: '#69f6ff', textShadow: '0 0 14px rgba(105,246,255,0.5)' }}>
                          {sale ? `${sale.stakeFormatted} ETH` : loadingSaleInfo ? 'Loading…' : 'TBA'}
                        </strong>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Supply</p>
                        <strong style={{ fontSize: '18px', color: '#ff9dff', textShadow: '0 0 14px rgba(255,157,255,0.5)' }}>
                          {sale ? `${sale.ticketsMinted} / ${sale.ticketSupply}` : loadingSaleInfo ? 'Loading…' : '—'}
                        </strong>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Entrants</p>
                        <strong style={{ fontSize: '18px', color: '#dbe4ff' }}>
                          {sale ? sale.entrantsCount : loadingSaleInfo ? 'Loading…' : '—'}
                        </strong>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#8ba6ff', letterSpacing: '0.08em' }}>Winners</p>
                        <strong style={{ fontSize: '18px', color: '#dbe4ff' }}>
                          {sale ? sale.winnersCount : loadingSaleInfo ? 'Loading…' : '—'}
                        </strong>
                      </div>
                    </div>

                                        {walletAddress && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                        {/* LOTTERY RESULTS - Show AFTER lottery is executed */}
                        {sale?.lotteryExecuted ? (
                          <>
                            {/* Results message for all participants */}
                            {(() => {
                              // Normalize wallet address for consistent comparison
                              const normalizedWallet = walletAddress?.toLowerCase();
                              
                              // Check if this user has sold their claim right (lottery winner who listed it)
                              const hasSoldClaimRight = soldClaimRights.has(`${event.eventId}-${normalizedWallet}`);
                              
                              if (debugEnabled) {
                                console.log(`🔍 Checking soldClaimRights for Event ${event.eventId}:`, {
                                  soldClaimRightsSet: Array.from(soldClaimRights),
                                  lookingFor: `${event.eventId}-${normalizedWallet}`,
                                  hasSoldClaimRight,
                                });
                              }
                              
                              // Check if this user has purchased a claim right from someone else
                              const hasPurchasedClaimRight = purchasedClaimRights.some((r: any) => 
                                r.eventId === event.eventId && r.newOwner?.toLowerCase() === normalizedWallet
                              );
                              // Distinguish purchased-from-others vs original winner
                              const hasPurchasedFromOthers = purchasedClaimRights.some((r: any) => 
                                r.eventId === event.eventId && r.newOwner?.toLowerCase() === normalizedWallet && r.originalWinner?.toLowerCase() !== normalizedWallet
                              );
                              
                              if (debugEnabled) {
                                console.log(`📊 Event ${event.eventId} Status Check:`, {
                                  isWinner: participant?.isWinner,
                                  hasEntered: participant?.hasEntered,
                                  hasSoldClaimRight,
                                  hasPurchasedClaimRight,
                                  normalizedWallet
                                });
                              }
                              
                              /* ═══════════════════════════════════════════════════════════════
                               * 4 CASES OF USER STATUS AFTER LOTTERY:
                               * ═══════════════════════════════════════════════════════════════
                               * CASE 1: Lottery Winner
                               *   - If sold claim right → "🔒 CLAIM RIGHT SOLD"
                               *   - If hasn't sold → "🎉 CONGRATULATIONS!"
                               * 
                               * CASE 2: Lost lottery BUT purchased claim right
                               *   - Returns null (hides lottery results)
                               *   - Shows "🎟️ PURCHASED CLAIM RIGHT" section below
                               * 
                               * CASE 3: Lost lottery and didn't purchase
                               *   - Shows "😢 Better luck next time"
                               * 
                               * CASE 4: Didn't enter lottery
                               *   - Shows "⏸️ You did not enter this lottery"
                               * ═══════════════════════════════════════════════════════════════ */
                              
                              // SOLD OVERRIDE: Always show sold banner even after winner status transferred away
                              if (hasSoldClaimRight) {
                                return (
                                  <div
                                    style={{
                                      padding: '14px 16px',
                                      borderRadius: '12px',
                                      background: 'rgba(255, 114, 249, 0.16)',
                                      color: '#ff48f9',
                                      fontSize: '14px',
                                      letterSpacing: '0.05em',
                                      border: '1px solid rgba(255, 114, 249, 0.35)',
                                      fontWeight: 600,
                                    }}
                                  >
                                    🔒 CLAIM RIGHT SOLD - You won but sold your claim right
                                  </div>
                                );
                              }

                              // CASE 1: User is a current on-chain lottery winner (and hasn't sold)
                              if (participant?.isWinner) {
                                // Winner via purchase (transferred status)
                                if (hasPurchasedFromOthers) {
                                  if (debugEnabled) console.log(`🔁 Purchased winner status for event ${event.eventId}; showing transfer banner`);
                                  return (
                                    <div
                                      style={{
                                        padding: '14px 16px',
                                        borderRadius: '12px',
                                        background: 'rgba(255, 157, 255, 0.16)',
                                        color: '#ff9dff',
                                        fontSize: '14px',
                                        letterSpacing: '0.05em',
                                        border: '1px solid rgba(255,157,255,0.35)',
                                        fontWeight: 600,
                                      }}
                                    >
                                      🎟️ Winner status transferred – you can claim the NFT.
                                    </div>
                                  );
                                }
                                // Original winner who hasn't sold
                                return (
                                  <div
                                    style={{
                                      padding: '14px 16px',
                                      borderRadius: '12px',
                                      background: 'rgba(0, 255, 224, 0.16)',
                                      color: '#0ddfc2',
                                      fontSize: '14px',
                                      letterSpacing: '0.05em',
                                      border: '1px solid rgba(0,255,224,0.35)',
                                      fontWeight: 600,
                                    }}
                                  >
                                    🎉 CONGRATULATIONS! You won the lottery!
                                  </div>
                                );
                              }
                              
                              // CASE 2: Lost lottery BUT purchased a claim right
                              // Hide lottery results ONLY if user actually entered and lost
                              if (hasPurchasedClaimRight && participant?.hasEntered && !participant?.isWinner) {
                                if (debugEnabled) console.log(`✅ CASE 2: User lost lottery but purchased claim right for event ${event.eventId}, hiding lottery results`);
                                return null;
                              }
                              
                              // CASE 3: User entered but didn't win and didn't purchase
                              if (participant?.hasEntered) {
                                return (
                                  <div
                                    style={{
                                      padding: '14px 16px',
                                      borderRadius: '12px',
                                      background: 'rgba(255, 111, 216, 0.16)',
                                      color: '#ff72f9',
                                      fontSize: '14px',
                                      letterSpacing: '0.05em',
                                      border: '1px solid rgba(255, 111, 216, 0.35)',
                                      fontWeight: 600,
                                    }}
                                  >
                                    😢 Better luck next time. You were not selected in this lottery.
                                  </div>
                                );
                              }
                              
                              // CASE 4: User didn't enter the lottery at all
                              // Additional: User did NOT enter but purchased a claim right (distinct message)
                              if (hasPurchasedClaimRight && !participant?.hasEntered && !participant?.isWinner) {
                                return (
                                  <div
                                    style={{
                                      padding: '14px 16px',
                                      borderRadius: '12px',
                                      background: 'rgba(105, 246, 255, 0.16)',
                                      color: '#69f6ff',
                                      fontSize: '14px',
                                      letterSpacing: '0.05em',
                                      border: '1px solid rgba(105,246,255,0.35)',
                                      fontWeight: 600,
                                    }}
                                  >
                                    🛒 You didn’t enter the lottery, but you purchased a claim right.
                                  </div>
                                );
                              }
                              return (
                                <div
                                  style={{
                                    padding: '14px 16px',
                                    borderRadius: '12px',
                                    background: 'rgba(255, 111, 216, 0.16)',
                                    color: '#ff72f9',
                                    fontSize: '14px',
                                    letterSpacing: '0.05em',
                                    border: '1px solid rgba(255, 111, 216, 0.35)',
                                    fontWeight: 600,
                                  }}
                                >
                                  ⏸️ You did not enter this lottery.
                                </div>
                              );
                            })()}

                            {/* Claim Ticket Button - Only for Winners (hidden if user has any purchased claim right) */}
                            {participant?.isWinner && !purchasedClaimRights.some((r: any) => r.eventId === event.eventId && r.newOwner?.toLowerCase() === walletAddress?.toLowerCase()) && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {(() => {
                                  const hasClaimed = claimedTickets[event.eventId]?.length > 0
                                  const hasBeenSold = soldClaimRights.has(`${event.eventId}-${walletAddress}`)
                                  const canClaim = !hasClaimed && !hasBeenSold

                                  return (
                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                      <button
                                        onClick={() => canClaim && handleClaimTicket(event.eventId)}
                                        disabled={!canClaim || claimingTicket === event.eventId}
                                        style={{
                                          background: hasClaimed
                                            ? 'rgba(13, 223, 194, 0.3)'
                                            : hasBeenSold
                                            ? 'rgba(255, 114, 249, 0.3)'
                                            : claimingTicket === event.eventId 
                                            ? 'rgba(0, 255, 224, 0.5)'
                                            : 'linear-gradient(135deg, rgba(0,255,224,0.9), rgba(255,111,216,0.9))',
                                          color: hasClaimed || hasBeenSold ? '#dbe4ff' : '#05060f',
                                          border: `1px solid ${hasClaimed ? 'rgba(13,223,194,0.4)' : hasBeenSold ? 'rgba(255,114,249,0.4)' : 'rgba(105,246,255,0.4)'}`,
                                          padding: '13px 20px',
                                          borderRadius: '12px',
                                          fontSize: '13px',
                                          fontWeight: 700,
                                          cursor: canClaim && claimingTicket !== event.eventId ? 'pointer' : 'not-allowed',
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.08em',
                                          boxShadow: canClaim ? '0 12px 30px rgba(0,255,224,0.35)' : 'none',
                                          opacity: canClaim && claimingTicket !== event.eventId ? 1 : 0.6,
                                          transition: 'all 0.2s ease',
                                          flex: 1,
                                          minWidth: '200px',
                                        }}
                                      >
                                        {hasClaimed
                                          ? '✅ NFT Ticket Claimed'
                                          : hasBeenSold
                                          ? '🔒 Claim Right Sold'
                                          : claimingTicket === event.eventId
                                          ? 'Minting NFT...'
                                          : '🎫 Claim NFT Ticket'}
                                      </button>
                                      
                                      {!hasClaimed && !hasBeenSold && !claimedTickets[event.eventId]?.length && (
                                        <Link to="/resale" state={{ ticket: { eventId: event.eventId, eventName: event.name, isClaimRight: true, winnerAddress: walletAddress } }} style={{ flex: 1, minWidth: '200px', textDecoration: 'none' }}>
                                          <button
                                            style={{
                                              background: 'linear-gradient(135deg, rgba(255,111,216,0.8), rgba(255,157,255,0.8))',
                                              color: '#05060f',
                                              border: '1px solid rgba(255,111,216,0.4)',
                                              padding: '13px 20px',
                                              borderRadius: '12px',
                                              fontSize: '13px',
                                              fontWeight: 700,
                                              cursor: 'pointer',
                                              textTransform: 'uppercase',
                                              letterSpacing: '0.08em',
                                              boxShadow: '0 12px 30px rgba(255,111,216,0.25)',
                                              transition: 'all 0.2s ease',
                                              width: '100%',
                                            }}
                                          >
                                            💰 Resell Claim Right
                                          </button>
                                        </Link>
                                      )}
                                    </div>
                                  )
                                })()}
                                
                              </div>
                            )}

                            {/* Purchased claim rights (always show for user who is newOwner, regardless winner flag source) */}
                            {(() => {
                              const purchasedForUser = purchasedClaimRights.filter((r: any) => r.eventId === event.eventId && r.newOwner?.toLowerCase() === walletAddress?.toLowerCase());
                              const soldKey = `${event.eventId}-${walletAddress?.toLowerCase()}`;
                              const shouldShowPurchased = purchasedForUser.length > 0 && !soldClaimRights.has(soldKey);
                              if (!shouldShowPurchased) return null;
                              return (
                                <div style={{ marginTop: '12px' }}>
                                  {purchasedForUser.map((right: any, idx: number) => {
                                    const hasBeenResold = soldClaimRights.has(`${event.eventId}-${walletAddress}`);
                                    const hasClaimedThisEvent = claimedTickets[event.eventId]?.length > 0;
                                    const hasWinnerOnChain = participant?.isWinner; // after transfer
                                    const canClaimPurchased = hasWinnerOnChain && !hasClaimedThisEvent && !hasBeenResold;
                                    const purchasedFromOthers = right.originalWinner?.toLowerCase() !== walletAddress?.toLowerCase();
                                    return (
                                      <div
                                        key={idx}
                                        style={{
                                          background: hasBeenResold ? 'rgba(255, 114, 249, 0.12)' : 'rgba(255, 157, 255, 0.12)',
                                          padding: '16px',
                                          borderRadius: '12px',
                                          border: hasBeenResold ? '1px solid rgba(255, 114, 249, 0.25)' : '1px solid rgba(255, 157, 255, 0.25)',
                                          marginBottom: '8px',
                                        }}
                                      >
                                        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: hasBeenResold ? '#ff48f9' : '#ff9dff', fontWeight: 600, letterSpacing: '0.06em' }}>
                                          {hasBeenResold ? '🔒 CLAIM RIGHT SOLD' : '🎟️ PURCHASED CLAIM RIGHT'}
                                        </p>
                                        {!hasBeenResold && (
                                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '6px' }}>
                                            <button
                                              onClick={() => canClaimPurchased && handleClaimTicket(event.eventId)}
                                              disabled={!canClaimPurchased || claimingTicket === event.eventId}
                                              style={{
                                                background: hasClaimedThisEvent
                                                  ? 'rgba(13, 223, 194, 0.3)'
                                                  : !hasWinnerOnChain
                                                  ? 'rgba(255, 157, 0, 0.3)'
                                                  : claimingTicket === event.eventId
                                                  ? 'rgba(0, 255, 224, 0.5)'
                                                  : 'linear-gradient(135deg, rgba(0,255,224,0.9), rgba(255,111,216,0.9))',
                                                color: hasClaimedThisEvent || !hasWinnerOnChain ? '#dbe4ff' : '#05060f',
                                                border: `1px solid ${hasClaimedThisEvent ? 'rgba(13,223,194,0.4)' : !hasWinnerOnChain ? 'rgba(255,157,0,0.4)' : 'rgba(105,246,255,0.4)'}`,
                                                padding: '10px 16px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                cursor: !canClaimPurchased || claimingTicket === event.eventId ? 'not-allowed' : 'pointer',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.08em',
                                                boxShadow: canClaimPurchased ? '0 8px 20px rgba(0,255,224,0.25)' : 'none',
                                                opacity: !canClaimPurchased || claimingTicket === event.eventId ? 0.6 : 1,
                                                flex: 1,
                                                minWidth: '180px',
                                              }}
                                            >
                                              {hasClaimedThisEvent
                                                ? '✅ NFT Ticket Claimed'
                                                : claimingTicket === event.eventId
                                                ? 'Minting NFT...'
                                                : !hasWinnerOnChain
                                                ? '⏳ Awaiting Transfer'
                                                : '🎫 Claim NFT Ticket'}
                                            </button>
                                            {!hasClaimedThisEvent && purchasedFromOthers && (
                                              <Link
                                                to="/resale"
                                                state={{ ticket: { eventId: event.eventId, eventName: event.name, isClaimRight: true, winnerAddress: walletAddress } }}
                                                style={{ flex: 1, minWidth: '180px', textDecoration: 'none' }}
                                              >
                                                <button
                                                  style={{
                                                    background: 'linear-gradient(135deg, rgba(255,111,216,0.8), rgba(255,157,255,0.8))',
                                                    color: '#05060f',
                                                    border: '1px solid rgba(255,111,216,0.4)',
                                                    padding: '10px 16px',
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.08em',
                                                    boxShadow: '0 8px 20px rgba(255,111,216,0.25)',
                                                    transition: 'all 0.2s ease',
                                                    width: '100%',
                                                  }}
                                                >
                                                  💰 Resell Claim Right
                                                </button>
                                              </Link>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                            {/* Claimed tickets list (available for both original winners and purchased claim right holders) */}
                            {claimedTickets[event.eventId]?.length > 0 && (
                              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {soldClaimRights.has(`${event.eventId}-${walletAddress?.toLowerCase()}`) && (
                                  <div
                                    style={{
                                      padding: '10px 14px',
                                      borderRadius: '10px',
                                      background: 'rgba(255,114,249,0.16)',
                                      color: '#ff48f9',
                                      fontSize: '12px',
                                      letterSpacing: '0.06em',
                                      border: '1px solid rgba(255,114,249,0.35)',
                                      fontWeight: 600,
                                    }}
                                  >
                                    🔒 CLAIM RIGHT SOLD — Ticket holder view only (NFT now claimable by buyer)
                                  </div>
                                )}
                                <ClaimedTicketsList
                                  tickets={claimedTickets[event.eventId]}
                                  eventName={event.name}
                                  eventId={event.eventId}
                                  onVerify={(tokenId: number) => handleVerifyTicket(event.eventId, tokenId)}
                                  isWinnerOnChain={participant?.isWinner}
                                  verifyingTokenIds={verifyingTokenIds}
                                  verifiedTokenIds={verifiedTokenIds}
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          /* BEFORE LOTTERY - Show entered status */
                          <div
                            style={{
                              padding: '12px 14px',
                              borderRadius: '12px',
                              background: 'rgba(105, 246, 255, 0.12)',
                              color: '#69f6ff',
                              fontSize: '14px',
                              letterSpacing: '0.05em',
                              border: '1px solid rgba(105,246,255,0.25)',
                            }}
                          >
                            {participant?.hasEntered
                              ? 'You have entered the lottery. Await the draw or withdraw if not selected.'
                              : 'You have not entered this lottery yet.'}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ marginTop: '18px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => sale && handleEnterSale(event.eventId, sale.stakeAmount)}
                        disabled={isDisabled}
                        style={{
                          background: isDisabled
                            ? 'rgba(120, 115, 255, 0.25)'
                            : 'linear-gradient(135deg, rgba(0,255,224,0.9), rgba(255,111,216,0.9))',
                          color: isDisabled ? 'rgba(219, 228, 255, 0.5)' : '#05060f',
                          border: '1px solid rgba(105,246,255,0.4)',
                          padding: '14px 24px',
                          borderRadius: '14px',
                          fontSize: '15px',
                          fontWeight: 700,
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isDisabled ? 'none' : '0 18px 38px rgba(0,255,224,0.35)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}
                      >
                        {!walletAddress
                          ? 'Connect wallet to enter'
                          : !sale
                          ? 'Sale data unavailable'
                          : sale.isOpen
                          ? participant?.hasEntered
                            ? 'Already entered'
                            : isEntering
                            ? 'Entering…'
                            : 'Enter lottery'
                          : sale.lotteryExecuted
                          ? 'Lottery closed'
                          : 'Sale closed'}
                      </button>

                      {/* Withdraw before lottery - pre-draw refund */}
                      {walletAddress && sale?.isOpen && !sale?.lotteryExecuted && participant?.hasEntered && (
                        <button
                          type="button"
                          onClick={() => handleWithdrawStake(event.eventId, true)}
                          disabled={withdrawingEventId === event.eventId}
                          style={{
                            background: withdrawingEventId === event.eventId
                              ? 'rgba(255, 111, 216, 0.5)'
                              : 'linear-gradient(135deg, rgba(255,111,216,0.8), rgba(255,157,255,0.8))',
                            color: '#05060f',
                            border: '1px solid rgba(255,111,216,0.4)',
                            padding: '14px 24px',
                            borderRadius: '14px',
                            fontSize: '15px',
                            fontWeight: 700,
                            cursor: withdrawingEventId === event.eventId ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 18px 38px rgba(255,111,216,0.25)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            opacity: withdrawingEventId === event.eventId ? 0.7 : 1,
                          }}
                        >
                          {withdrawingEventId === event.eventId ? 'Withdrawing…' : '💸 Withdraw Entry'}
                        </button>
                      )}

                      {/* Withdraw after lottery - non-winner refund (hidden if their winner status was sold) */}
                      {walletAddress &&
                        sale?.lotteryExecuted &&
                        participant?.hasEntered &&
                        !participant?.isWinner &&
                        !soldClaimRights.has(`${event.eventId}-${walletAddress?.toLowerCase()}`) && (
                        <button
                          type="button"
                          onClick={() => handleWithdrawStake(event.eventId, false)}
                          disabled={withdrawingEventId === event.eventId || participant?.hasClaimedRefund}
                          style={{
                            background: participant?.hasClaimedRefund
                              ? 'rgba(100, 100, 100, 0.4)'
                              : withdrawingEventId === event.eventId
                              ? 'rgba(255, 111, 216, 0.5)'
                              : 'linear-gradient(135deg, rgba(255,111,216,0.8), rgba(255,157,255,0.8))',
                            color: participant?.hasClaimedRefund ? 'rgba(150, 150, 150, 0.6)' : '#05060f',
                            border: participant?.hasClaimedRefund 
                              ? '1px solid rgba(100, 100, 100, 0.2)'
                              : '1px solid rgba(255,111,216,0.4)',
                            padding: '14px 24px',
                            borderRadius: '14px',
                            fontSize: '15px',
                            fontWeight: 700,
                            cursor: participant?.hasClaimedRefund || withdrawingEventId === event.eventId ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: participant?.hasClaimedRefund ? 'none' : '0 18px 38px rgba(255,111,216,0.25)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            opacity: participant?.hasClaimedRefund ? 0.5 : (withdrawingEventId === event.eventId ? 0.7 : 1),
                          }}
                        >
                          {participant?.hasClaimedRefund 
                            ? '✅ Refund Already Claimed'
                            : withdrawingEventId === event.eventId 
                            ? 'Claiming…' 
                            : '💰 Claim Refund'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => refreshSaleDetails(event.eventId)}
                        style={{
                          background: 'rgba(10, 25, 60, 0.6)',
                          color: '#9ad6ff',
                          border: '1px solid rgba(120, 215, 255, 0.35)',
                          padding: '12px 22px',
                          borderRadius: '14px',
                          fontSize: '15px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Refresh data
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section
          style={{
            textAlign: 'center',
            marginTop: '56px',
            marginBottom: '40px',
            background: 'linear-gradient(135deg, rgba(0, 255, 224, 0.08), rgba(255, 111, 216, 0.1))',
            padding: '36px 32px',
            borderRadius: '22px',
            border: '1px solid rgba(105,246,255,0.25)',
            boxShadow: '0 24px 60px rgba(89, 0, 255, 0.25)',
          }}
        >
          <p style={{ fontSize: '22px', fontWeight: 700, marginBottom: '14px', color: '#fdfbff', letterSpacing: '0.06em' }}>
            Ready to bring your community on-chain?
          </p>
          <p
            style={{
              fontSize: '16px',
              color: 'rgba(219, 228, 255, 0.75)',
              maxWidth: '520px',
              margin: '0 auto 24px',
              letterSpacing: '0.04em',
              textShadow: '0 0 12px rgba(105,246,255,0.35)',
            }}
          >
            Deploy your first event in minutes. CryptoTicketing handles the minting logic, ownership proofs, and secondary
            sales compliance out-of-the-box.
          </p>
          <button
            type="button"
            style={{
              background: 'linear-gradient(135deg, rgba(0,255,224,0.9), rgba(255,111,216,0.9))',
              color: '#05060f',
              border: '1px solid rgba(105,246,255,0.4)',
              padding: '16px 36px',
              borderRadius: '999px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 20px 48px rgba(0,255,224,0.35)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Launch Console
          </button>
        </section>
      </main>

      <footer
        style={{
          background: 'linear-gradient(135deg, rgba(8, 8, 28, 0.95), rgba(89, 0, 255, 0.35))',
          color: '#7ddcff',
          padding: '32px 0',
          textAlign: 'center',
          borderTop: '1px solid rgba(105, 246, 255, 0.25)',
          position: 'relative',
        }}
      >
        <p style={{ margin: 0, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          © {new Date().getFullYear()} CryptoTicketing Labs. All rights reserved.
        </p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('⚠️ Clear ALL marketplace data (claim rights & listings)?\n\nThis will remove:\n- All claim right records\n- All marketplace listings\n\nThis action cannot be undone!')) {
              localStorage.removeItem('cryptoTicketing_claimRights');
              localStorage.removeItem('cryptoTicketing_resoldTickets');
              alert('✅ Cache cleared! The page will now reload.');
              window.location.reload();
            }
          }}
          style={{
            background: 'rgba(255, 68, 68, 0.15)',
            color: '#ff6b6b',
            border: '1px solid rgba(255, 68, 68, 0.4)',
            padding: '10px 20px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginTop: '16px',
          }}
          title="Clear marketplace cache"
        >
          🗑️ Clear Cache
        </button>
      </footer>
    </div>
  } />
    <Route path="/admin" element={
      <AdminPanel 
        ticketContractWithSigner={ticketContractWithSigner}
        onEventCreated={(newEvent) => {
          // Add new event to the events list
          setEvents((prev) => [...prev, newEvent]);
          // Fetch sale details for the new event
          setTimeout(() => {
            if (newEvent.eventId) {
              refreshSaleDetails(newEvent.eventId);
            }
          }, 500);
        }}
      />
    } />
    <Route path="/resale" element={
      <Resale ticketContractWithSigner={ticketContractWithSigner} walletAddress={walletAddress} />
    } />
    <Route path="/marketplace" element={
      <ResalePanel ticketContractWithSigner={ticketContractWithSigner} walletAddress={walletAddress} />
    } />
  

    
    </Routes>
  </Router>
  )



}

declare global {
  interface Window {
    ethereum?: any
  }
}


export default App
