import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Function to auto-detect the latest deployed contract address
function getLatestContractAddress(): string | null {
  try {
    const broadcastPath = path.join(__dirname, '../../broadcast/Deploy.s.sol/31337/run-latest.json');
    
    if (fs.existsSync(broadcastPath)) {
      const broadcastData = JSON.parse(fs.readFileSync(broadcastPath, 'utf8'));
      
      const ticketDeployment = broadcastData.transactions?.find(
        (tx: any) => tx.contractName === 'Ticket' && tx.transactionType === 'CREATE'
      );
      
      if (ticketDeployment) {
        console.log(`✅ Auto-detected Ticket contract address: ${ticketDeployment.contractAddress}`);
        return ticketDeployment.contractAddress;
      }
    }
    
    console.log('⚠️  Could not auto-detect contract address from broadcast file');
    return null;
  } catch (error) {
    console.error('❌ Error reading contract address:', error);
    return null;
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'CryptoTicketing backend is running' });
});

app.get('/api/config', (req, res) => {
  const contractAddress = getLatestContractAddress();
  
  res.json({
    contractAddress,
    rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
    chainId: process.env.CHAIN_ID || 31337,
    network: process.env.NETWORK || 'anvil-local'
  });
});

app.post('/api/hash', (req, res) => {
  const { data } = req.body;
  const hash = Buffer.from(data).toString('hex');
  res.json({ hash });
});

app.get('/api/events', async (req, res) => {
  try {
    const dataPath = path.join(__dirname, '../../data/events.json');
    let persisted: any[] = [];
    if (fs.existsSync(dataPath)) {
      const raw = fs.readFileSync(dataPath, 'utf8');
      persisted = JSON.parse(raw || '[]');
    }

    const contractAddress = getLatestContractAddress();
    const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';

    if (!contractAddress) {
      return res.json({ events: [] });
    }

    try {
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const abi = ['function eventOwners(uint256) view returns (address)'];
      const contract = new ethers.Contract(contractAddress, abi, provider);

      const checks = await Promise.all(
        persisted.map(async (ev) => {
          try {
            const owner = await contract.eventOwners(ev.eventId);
            return { ev, onChain: owner && owner !== ethers.constants.AddressZero };
          } catch (e) {
            return { ev, onChain: false };
          }
        }),
      );

      const onChainEvents = checks.filter((c) => c.onChain).map((c) => c.ev);
      return res.json({ events: onChainEvents });
    } catch (err) {
      console.error('Error checking on-chain state for events', err);
      return res.json({ events: [] });
    }
  } catch (error) {
    console.error('Failed to load persisted events', error);
    return res.json({ events: [] });
  }
});

app.post('/api/events', (req, res) => {
  const newEvent = req.body;
  if (!newEvent || typeof newEvent.eventId === 'undefined') {
    return res.status(400).json({ error: 'Invalid event payload' });
  }

  try {
    const dataDir = path.join(__dirname, '../../data');
    const dataPath = path.join(dataDir, 'events.json');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    let persisted: any[] = [];
    if (fs.existsSync(dataPath)) {
      persisted = JSON.parse(fs.readFileSync(dataPath, 'utf8') || '[]');
    }

    if (persisted.find((e) => e.eventId === newEvent.eventId)) {
      return res.status(200).json({ ok: true, message: 'Event already exists' });
    }

    persisted.push(newEvent);
    fs.writeFileSync(dataPath, JSON.stringify(persisted, null, 2), 'utf8');
    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Failed to persist new event', error);
    return res.status(500).json({ error: 'Failed to persist event' });
  }
});

app.delete('/api/events/:eventId', (req, res) => {
  const eventId = parseInt(req.params.eventId);
  if (!Number.isFinite(eventId)) {
    return res.status(400).json({ error: 'Invalid eventId' });
  }

  try {
    const dataPath = path.join(__dirname, '../../data/events.json');
    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ error: 'No persisted events' });
    }

    let persisted = JSON.parse(fs.readFileSync(dataPath, 'utf8') || '[]');
    const filtered = persisted.filter((e: any) => e.eventId !== eventId);

    if (filtered.length === persisted.length) {
      return res.status(404).json({ error: 'Event not found' });
    }

    fs.writeFileSync(dataPath, JSON.stringify(filtered, null, 2), 'utf8');
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Failed to delete event', error);
    return res.status(500).json({ error: 'Failed to delete event' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

export default app;
