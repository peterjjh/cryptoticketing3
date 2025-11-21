// Quick script to check localStorage data for claim rights
// This simulates what's stored in browser localStorage

const targetAddress = '0xce9b59b712e0ec2d0cd3159453471db0d2da5dec';

console.log('\n=== CHECKING CLAIM RIGHTS DATA ===\n');

// Check if there's a data file (you'd need to manually export from browser)
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'localStorage-export.json');

if (fs.existsSync(dataFile)) {
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const claimRights = data.cryptoTicketing_claimRights || [];
  const resoldTickets = data.cryptoTicketing_resoldTickets || [];
  
  console.log('Total claim rights:', claimRights.length);
  console.log('Total resold tickets:', resoldTickets.length);
  console.log('\n--- All Claim Rights ---');
  claimRights.forEach((r, i) => {
    console.log(`\n[${i}] Event ID: ${r.eventId}`);
    console.log(`    Original Winner: ${r.originalWinner}`);
    console.log(`    New Owner: ${r.newOwner}`);
    console.log(`    Purchase Price: ${r.purchasePrice} ETH`);
    console.log(`    Timestamp: ${new Date(r.timestamp).toLocaleString()}`);
  });
  
  console.log('\n\n--- Claims for', targetAddress, '---');
  const claims = claimRights.filter(r => 
    r.newOwner?.toLowerCase() === targetAddress.toLowerCase() || 
    r.originalWinner?.toLowerCase() === targetAddress.toLowerCase()
  );
  
  if (claims.length === 0) {
    console.log('No claim rights found for this address');
  } else {
    claims.forEach((r, i) => {
      console.log(`\n[${i}] Event ID: ${r.eventId}`);
      console.log(`    Original Winner: ${r.originalWinner}`);
      console.log(`    New Owner: ${r.newOwner}`);
      console.log(`    Is Original Winner: ${r.originalWinner?.toLowerCase() === targetAddress.toLowerCase()}`);
      console.log(`    Is Current Owner: ${r.newOwner?.toLowerCase() === targetAddress.toLowerCase()}`);
    });
  }
} else {
  console.log('No localStorage export found.');
  console.log('\nTo export localStorage data:');
  console.log('1. Open browser console (F12)');
  console.log('2. Run this command:');
  console.log('\n   const data = {');
  console.log('     cryptoTicketing_claimRights: JSON.parse(localStorage.getItem("cryptoTicketing_claimRights") || "[]"),');
  console.log('     cryptoTicketing_resoldTickets: JSON.parse(localStorage.getItem("cryptoTicketing_resoldTickets") || "[]")');
  console.log('   };');
  console.log('   console.log(JSON.stringify(data, null, 2));');
  console.log('\n3. Copy the output and save to: localStorage-export.json');
  console.log('4. Run this script again: node check-storage.js\n');
}
