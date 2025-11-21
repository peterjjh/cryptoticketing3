// Run this in browser console to check and create pending transfer if needed

console.log('\n=== CHECKING PENDING TRANSFERS ===\n');

// Check current data
const pendingTransfers = JSON.parse(localStorage.getItem('cryptoTicketing_pendingTransfers') || '[]');
const claimRights = JSON.parse(localStorage.getItem('cryptoTicketing_claimRights') || '[]');

console.log('Current pending transfers:', pendingTransfers.length);
console.log('Current claim rights:', claimRights.length);

console.log('\n--- Pending Transfers ---');
pendingTransfers.forEach((t, i) => {
  console.log(`\n[${i}]`, {
    eventId: t.eventId,
    seller: t.seller,
    buyer: t.buyer,
    price: t.price,
    completed: t.completed,
    timestamp: new Date(t.timestamp).toLocaleString()
  });
});

console.log('\n--- Claim Rights ---');
claimRights.forEach((r, i) => {
  console.log(`\n[${i}]`, {
    eventId: r.eventId,
    originalWinner: r.originalWinner,
    newOwner: r.newOwner,
    purchasePrice: r.purchasePrice,
    timestamp: new Date(r.timestamp).toLocaleString()
  });
});

// If there's a claim right but no pending transfer, create one
if (claimRights.length > 0 && pendingTransfers.length === 0) {
  console.log('\n⚠️ Found claim rights but no pending transfers!');
  console.log('\nCreating pending transfer from claim rights...');
  
  const newTransfers = claimRights.map(cr => ({
    eventId: cr.eventId,
    seller: cr.originalWinner,
    buyer: cr.newOwner,
    price: cr.purchasePrice,
    timestamp: cr.timestamp,
    completed: false
  }));
  
  localStorage.setItem('cryptoTicketing_pendingTransfers', JSON.stringify(newTransfers));
  console.log('✅ Created', newTransfers.length, 'pending transfer(s)');
  console.log('\nNow refresh the page and connect with seller wallet:', claimRights[0].originalWinner);
} else if (pendingTransfers.length > 0) {
  console.log('\n✅ Pending transfers exist!');
  const incomplete = pendingTransfers.filter(t => !t.completed);
  if (incomplete.length > 0) {
    console.log('\nTo see the orange alert box:');
    console.log('1. Connect wallet with address:', incomplete[0].seller);
    console.log('2. Refresh the page');
    console.log('3. You should see "⚠️ Action Required: Complete Transfers" at the top');
  } else {
    console.log('\n✅ All transfers are completed!');
  }
}
