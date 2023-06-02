//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

//IERC20
interface IMendi {
    function balanceOf(address account) external view returns (uint256);

    function transfer(address dst, uint256 rawAmount) external returns (bool);
}
