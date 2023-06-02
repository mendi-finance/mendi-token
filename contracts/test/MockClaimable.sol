//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IClaimable.sol";

contract MockClaimable is IClaimable {
    address public token;
    address public recipient;

    uint256 public claimPerSecond;
    uint256 public lastClaim;

    constructor(address token_, uint256 claimPerSecond_, uint256 lastClaim_) {
        token = token_;
        claimPerSecond = claimPerSecond_;
        lastClaim = lastClaim_;
    }

    function claim() external override returns (uint256) {
        if (lastClaim > block.timestamp) {
            return 0;
        }

        require(
            recipient == address(0) || recipient == msg.sender,
            "MockClaimable: not recipient"
        );

        uint256 amount = claimPerSecond * (block.timestamp - lastClaim);
        lastClaim = block.timestamp;
        IERC20(token).transfer(recipient, amount);
        return amount;
    }

    function setRecipient(address recipient_) external {
        recipient = recipient_;
    }
}
