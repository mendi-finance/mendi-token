//SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.5.0;

interface IVelodromeGauge {
    function deposit(uint256 amount, uint256 tokenId) external;

    function withdrawAll() external;

    function withdraw(uint256 amount) external;

    function balanceOf(address account) external view returns (uint256);

    function getReward(address account, address[] calldata tokens) external;
}
