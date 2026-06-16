// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title GoalFund
/// @notice Crowdfunding with a goal and deadline.
///         If the goal is reached, the creator withdraws.
///         If the deadline passes without reaching the goal, donors get a full refund.
contract GoalFund {

    // ─── STATE ────────────────────────────────────────────────────────

    address public immutable creator;
    uint256 public immutable goal;       // in wei
    uint256 public immutable deadline;   // block.timestamp

    mapping(address => uint256) public contributions;
    uint256 public totalRaised;
    bool public withdrawn;               // creator already withdrew

    // ─── EVENTS ───────────────────────────────────────────────────────

    event Contributed(address indexed donor, uint256 amount);
    event GoalReached(uint256 totalRaised);
    event Withdrawn(address indexed creator, uint256 amount);
    event Refunded(address indexed donor, uint256 amount);

    // ─── CONSTRUCTOR ──────────────────────────────────────────────────

    /// @param goal_     Funding goal in wei.
    /// @param duration_ Campaign window in seconds from deployment.
    constructor(uint256 goal_, uint256 duration_) {
        require(goal_ > 0, "Goal must be positive");
        require(duration_ > 0, "Duration must be positive");
        creator  = msg.sender;
        goal     = goal_;
        deadline = block.timestamp + duration_;
    }

    // ─── EXTERNAL FUNCTIONS ───────────────────────────────────────────

    /// @notice Contribute ETH to the campaign.
    function contribute() external payable {
        require(block.timestamp < deadline, "Campaign ended");
        require(msg.value > 0, "Send some ETH");

        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;

        emit Contributed(msg.sender, msg.value);

        if (totalRaised >= goal) emit GoalReached(totalRaised);
    }

    /// @notice Creator withdraws funds if goal was reached after deadline.
    function withdraw() external {
        require(msg.sender == creator, "Only creator");
        require(block.timestamp >= deadline, "Campaign still active");
        require(totalRaised >= goal, "Goal not reached");
        require(!withdrawn, "Already withdrawn");

        withdrawn = true;
        uint256 amount = totalRaised;

        (bool ok, ) = creator.call{value: amount}("");
        require(ok, "Transfer failed");

        emit Withdrawn(creator, amount);
    }

    /// @notice Donors claim a full refund if goal was not reached after deadline.
    function refund() external {
        require(block.timestamp >= deadline, "Campaign still active");
        require(totalRaised < goal, "Goal was reached, no refund");

        uint256 amount = contributions[msg.sender];
        require(amount > 0, "Nothing to refund");

        // CEI: update state before transfer
        contributions[msg.sender] = 0;

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Refund failed");

        emit Refunded(msg.sender, amount);
    }

    // ─── VIEW FUNCTIONS ───────────────────────────────────────────────

    /// @notice Returns true if the campaign goal has been met.
    function isGoalReached() external view returns (bool) {
        return totalRaised >= goal;
    }

    /// @notice Returns true if the campaign window is still open.
    function isActive() external view returns (bool) {
        return block.timestamp < deadline;
    }
}
