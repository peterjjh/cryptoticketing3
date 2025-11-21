// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/Ticket.sol";

contract TicketTest is Test {
    Ticket public ticket;
    address public owner = address(0x1);
    address public user = address(0x2);
    address public userTwo = address(0x3);

    function setUp() public {
        vm.prank(owner);
        ticket = new Ticket("Test Ticket", "TEST");
    }

    function testMint() public {
        vm.prank(owner);
        uint256 tokenId = ticket.mint(user, 1);
        
        assertEq(ticket.ownerOf(tokenId), user);
        assertEq(tokenId, 0);
        
        Ticket.TicketInfo memory info = ticket.getTicket(tokenId);
        assertEq(info.eventId, 1);
        assertEq(uint(info.state), uint(Ticket.TicketState.Active));
    }

    function testCheckIn() public {
        vm.prank(owner);
        uint256 tokenId = ticket.mint(user, 1);
        
        vm.prank(owner);
        ticket.checkIn(tokenId);
        
        Ticket.TicketInfo memory info = ticket.getTicket(tokenId);
        assertEq(uint(info.state), uint(Ticket.TicketState.CheckedIn));
    }

    function testSaleWorkflowLotteryClaimAndWithdraw() public {
        vm.prank(owner);
        ticket.configureEventSale(1, 1 ether, 1, 50); // Added maxTransferPricePercent parameter

        vm.deal(user, 2 ether);
        vm.deal(userTwo, 2 ether);

        vm.prank(user);
        ticket.enterSale{value: 1 ether}(1);

        vm.prank(userTwo);
        ticket.enterSale{value: 1 ether}(1);

        bytes32 seed = keccak256("seed");
        vm.prank(owner);
        ticket.runLottery(1, 1, seed);

        bool userIsWinner = ticket.isSaleWinner(1, user);
        bool userTwoIsWinner = ticket.isSaleWinner(1, userTwo);
        assertTrue(userIsWinner != userTwoIsWinner, "exactly one winner expected");

        address winner = userIsWinner ? user : userTwo;
        address loser = userIsWinner ? userTwo : user;

        vm.prank(winner);
        uint256 tokenId = ticket.claimTicket(1);
        assertEq(ticket.ownerOf(tokenId), winner);

        assertEq(ticket.pendingRefunds(1, loser), 1 ether);
        vm.prank(loser);
        ticket.withdrawStake(1);
        assertEq(ticket.pendingRefunds(1, loser), 0);
    }

    function testTransferAndVerifyTicket() public {
        vm.prank(owner);
        uint256 tokenId = ticket.mint(user, 7);

        vm.prank(user);
        ticket.transferTicket(tokenId, userTwo, 0); // Added transferPrice parameter (0 for free transfer)
        assertEq(ticket.ownerOf(tokenId), userTwo);

        bool valid = ticket.verifyTicket(tokenId, 7, userTwo);
        assertTrue(valid);

        bool invalidEvent = ticket.verifyTicket(tokenId, 8, userTwo);
        assertFalse(invalidEvent);

        bool invalidHolder = ticket.verifyTicket(tokenId, 7, user);
        assertFalse(invalidHolder);
    }
}
