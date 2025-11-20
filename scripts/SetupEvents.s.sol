// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/Ticket.sol";

contract SetupEvents is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        // Get the deployed contract address from environment variable
        address ticketAddress = vm.envAddress("TICKET_CONTRACT_ADDRESS");
        
        console.log("Configuring events for Ticket contract at:", ticketAddress);
        
        Ticket ticket = Ticket(ticketAddress);
        
        // Configure sales for the three events
        // Event 1: Chainlink Community Conference - 0.01 ETH stake, 50 tickets
        ticket.configureEventSale(1, 0.01 ether, 500, 50);
        
        // Event 2: Solidity Summit - 0.05 ETH stake, 100 tickets  
        ticket.configureEventSale(2, 0.05 ether, 100, 75);
        
        // Event 3: Web3 Music Fest - 0.02 ETH stake, 200 tickets
        ticket.configureEventSale(3, 0.02 ether, 200, 60);
        
        vm.stopBroadcast();
        
        console.log("Event sales configured successfully!");
        console.log("Event 1: 0.01 ETH stake, 500 tickets");
        console.log("Event 2: 0.05 ETH stake, 100 tickets");
        console.log("Event 3: 0.02 ETH stake, 200 tickets");
    }
}