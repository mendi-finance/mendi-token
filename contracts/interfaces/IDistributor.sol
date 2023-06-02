//SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.5.0;

interface IDistributor {
    function totalShares() external view returns (uint256);

    function recipients(
        address
    )
        external
        view
        returns (uint256 shares, uint256 lastShareIndex, uint256 credit);
}
