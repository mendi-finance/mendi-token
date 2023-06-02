//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

interface ILiquidityGenerator {
    function periodBegin() external pure returns (uint256);

    function periodEnd() external pure returns (uint256);

    function bonusEnd() external pure returns (uint256);

    function distributor() external pure returns (address);

    function bonusDistributor() external pure returns (address);

    function distributorTotalShares() external view returns (uint256);

    function bonusDistributorTotalShares() external view returns (uint256);

    function distributorRecipients(
        address
    )
        external
        view
        returns (uint256 shares, uint256 lastShareIndex, uint256 credit);

    function bonusDistributorRecipients(
        address
    )
        external
        view
        returns (uint256 shares, uint256 lastShareIndex, uint256 credit);

    function deposit() external payable;

    event Finalized(uint256 amountMendi, uint256 amountUSDC);

    event Deposit(
        address indexed sender,
        uint256 amount,
        uint256 distributorTotalShares,
        uint256 bonusDistributorTotalShares,
        uint256 newShares,
        uint256 newBonusShares
    );
    event PostponeUnlockTimestamp(
        uint256 prevUnlockTimestamp,
        uint256 unlockTimestamp
    );
    event Delivered(uint256 amountPair0, uint256 amountPair1);
}
