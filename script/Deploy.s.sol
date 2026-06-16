// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/GoalFund.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        // goal: 0.01 ETH, duration: 30 days
        GoalFund fund = new GoalFund(0.01 ether, 30 days);
        console.log("GoalFund deployed at:", address(fund));
        vm.stopBroadcast();
    }
}
