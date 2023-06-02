//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

interface IClaimable {
    function claim() external returns (uint256 amount);

    event Claim(address indexed account, uint256 amount);
}
