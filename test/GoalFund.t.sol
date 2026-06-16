// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/GoalFund.sol";

contract GoalFundTest is Test {

    GoalFund fund;

    address creator = makeAddr("creator");
    address alice   = makeAddr("alice");
    address bob     = makeAddr("bob");

    uint256 constant GOAL     = 1 ether;
    uint256 constant DURATION = 7 days;

    function setUp() public {
        vm.prank(creator);
        fund = new GoalFund(GOAL, DURATION);

        // give donors ETH to spend
        vm.deal(alice, 2 ether);
        vm.deal(bob,   2 ether);
    }

    // ─── contribute ───────────────────────────────────────────────────

    function test_Contribute_UpdatesBalances() public {
        vm.prank(alice);
        fund.contribute{value: 0.6 ether}();

        assertEq(fund.contributions(alice), 0.6 ether);
        assertEq(fund.totalRaised(),        0.6 ether);
    }

    function test_Contribute_EmitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit GoalFund.Contributed(alice, 0.5 ether);
        fund.contribute{value: 0.5 ether}();
    }

    function test_Contribute_Reverts_AfterDeadline() public {
        vm.warp(block.timestamp + DURATION + 1);
        vm.prank(alice);
        vm.expectRevert("Campaign ended");
        fund.contribute{value: 0.5 ether}();
    }

    function test_Contribute_Reverts_ZeroValue() public {
        vm.prank(alice);
        vm.expectRevert("Send some ETH");
        fund.contribute{value: 0}();
    }

    // ─── withdraw ─────────────────────────────────────────────────────

    function test_Withdraw_CreatorReceivesFunds() public {
        // fund the campaign to goal
        vm.prank(alice);
        fund.contribute{value: 0.6 ether}();
        vm.prank(bob);
        fund.contribute{value: 0.4 ether}();

        uint256 balanceBefore = creator.balance;
        vm.warp(block.timestamp + DURATION + 1);

        vm.prank(creator);
        fund.withdraw();

        assertEq(creator.balance, balanceBefore + 1 ether);
        assertTrue(fund.withdrawn());
    }

    function test_Withdraw_Reverts_NotCreator() public {
        vm.prank(alice);
        fund.contribute{value: 1 ether}();
        vm.warp(block.timestamp + DURATION + 1);

        vm.prank(alice);
        vm.expectRevert("Only creator");
        fund.withdraw();
    }

    function test_Withdraw_Reverts_GoalNotReached() public {
        vm.prank(alice);
        fund.contribute{value: 0.5 ether}();
        vm.warp(block.timestamp + DURATION + 1);

        vm.prank(creator);
        vm.expectRevert("Goal not reached");
        fund.withdraw();
    }

    function test_Withdraw_Reverts_CampaignStillActive() public {
        vm.prank(alice);
        fund.contribute{value: 1 ether}();

        vm.prank(creator);
        vm.expectRevert("Campaign still active");
        fund.withdraw();
    }

    function test_Withdraw_Reverts_AlreadyWithdrawn() public {
        vm.prank(alice);
        fund.contribute{value: 1 ether}();
        vm.warp(block.timestamp + DURATION + 1);

        vm.prank(creator);
        fund.withdraw();

        vm.prank(creator);
        vm.expectRevert("Already withdrawn");
        fund.withdraw();
    }

    // ─── refund ───────────────────────────────────────────────────────

    function test_Refund_DonorGetsMoneyBack() public {
        vm.prank(alice);
        fund.contribute{value: 0.3 ether}();
        vm.warp(block.timestamp + DURATION + 1);

        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        fund.refund();

        assertEq(alice.balance, balanceBefore + 0.3 ether);
        assertEq(fund.contributions(alice), 0);
    }

    function test_Refund_Reverts_GoalWasReached() public {
        vm.prank(alice);
        fund.contribute{value: 1 ether}();
        vm.warp(block.timestamp + DURATION + 1);

        vm.prank(alice);
        vm.expectRevert("Goal was reached, no refund");
        fund.refund();
    }

    function test_Refund_Reverts_NothingToRefund() public {
        vm.warp(block.timestamp + DURATION + 1);
        vm.prank(alice);
        vm.expectRevert("Nothing to refund");
        fund.refund();
    }

    function test_Refund_Reverts_CampaignStillActive() public {
        vm.prank(alice);
        fund.contribute{value: 0.3 ether}();

        vm.prank(alice);
        vm.expectRevert("Campaign still active");
        fund.refund();
    }

    function test_Refund_CannotDoubleRefund() public {
        vm.prank(alice);
        fund.contribute{value: 0.3 ether}();
        vm.warp(block.timestamp + DURATION + 1);

        vm.prank(alice);
        fund.refund();

        vm.prank(alice);
        vm.expectRevert("Nothing to refund");
        fund.refund();
    }

    // ─── view functions ───────────────────────────────────────────────

    function test_IsActive_TrueBeforeDeadline() public view {
        assertTrue(fund.isActive());
    }

    function test_IsActive_FalseAfterDeadline() public {
        vm.warp(block.timestamp + DURATION + 1);
        assertFalse(fund.isActive());
    }

    function test_IsGoalReached_FalseInitially() public view {
        assertFalse(fund.isGoalReached());
    }

    function test_IsGoalReached_TrueWhenFunded() public {
        vm.prank(alice);
        fund.contribute{value: 1 ether}();
        assertTrue(fund.isGoalReached());
    }
}
