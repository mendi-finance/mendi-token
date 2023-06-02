//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

interface IVelodromeVotingEscrow {
    function balanceOf(address account) external view returns (uint256);

    function balanceOfNFT(uint256 _tokenId) external view returns (uint256);

    function tokenOfOwnerByIndex(
        address owner,
        uint256 index
    ) external view returns (uint256 tokenId);

    function getVotes(address account) external view returns (uint256);

    function create_lock(
        uint256 _value,
        uint256 _lock_duration
    ) external returns (uint256);
}
