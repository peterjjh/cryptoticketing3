import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'

type UpcomingEvent = {
  id: string
  name: string
  date: string
  venue: string
  tickets: number
}

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

  const upcomingEvents = useMemo<UpcomingEvent[]>(
    () => [
      {
        id: '1',
        name: 'Doja Cat: Tour Ma Vie World Tour',
        date: 'Dec 1, 2026',
        venue: 'Madison Square Garden, NY',
        tickets: 15000,
      },
      {
        id: '2',
        name: 'Hamilton (NY)',
        date: 'Nov 4, 2025',
        venue: 'Richard Rodgers Theatre, NY',
        tickets: 300,
      },
      {
        id: '3',
        name: '2025 Skechers World Champions Cup (Golf), Thursday',
        date: 'Dec 4, 2025',
        venue: 'Feather Sound Country Club',
        tickets: 200,
      },
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
    () => [
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
        description: 'The Skechers World Champions Cup supporting Shriners Children’s is an annual three-team, three-day stroke play tournament that is now the fourth global team competition on the worldwide golf calendar.',
      },
    ],
    [],
  )

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
      'function getSaleOverview(uint256) view returns (uint256 stakeAmount,uint256 ticketSupply,uint256 ticketsMinted,bool isOpen,bool lotteryExecuted,uint256 entrantsCount,uint256 winnersCount)',
      'function enterSale(uint256) payable',
      'function hasEnteredSale(uint256,address) view returns (bool)',
      'function isSaleWinner(uint256,address) view returns (bool)',
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
      console.warn('Falling back to static events', error)
      setEvents(fallbackEvents)
      setEventsError(
        eventsApiUrl
          ? 'Unable to load events from backend. Showing sample data instead.'
          : 'Events API not configured. Showing sample data.',
      )
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

  return (
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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
            }}
          >
            {upcomingEvents.map((event) => (
              <article
                key={event.id}
                style={{
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
                <p style={{ marginTop: '14px', fontSize: '14px', color: '#ff6fd8', letterSpacing: '0.05em' }}>
                  {event.tickets} tickets remaining
                </p>
              </article>
            ))}
          </div>
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
                      <div
                        style={{
                          marginTop: '12px',
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
                          ? participant.isWinner
                            ? 'You won the lottery! Claim your ticket from the contract.'
                            : 'You have entered the lottery. Await the draw or withdraw if not selected.'
                          : 'You have not entered this lottery yet.'}
                      </div>
                    )}

                    <div style={{ marginTop: '18px', display: 'flex', gap: '12px' }}>
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
        }}
      >
        <p style={{ margin: 0, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          © {new Date().getFullYear()} CryptoTicketing Labs. All rights reserved.
        </p>
      </footer>
    </div>
  )
}

declare global {
  interface Window {
    ethereum?: any
  }
}

export default App
