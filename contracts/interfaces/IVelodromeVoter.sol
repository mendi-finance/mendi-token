//SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.5.0;

interface IVelodromeVoter {
    function gauges(address _pool) external view returns (address);

    function claimable(address _gauge) external view returns (uint256);

    function createGauge(address _pool) external returns (address);

    function whitelist(address token) external;

    function distribute(address _gauge) external;

    function vote(
        uint256 tokenId,
        address[] calldata _poolVote,
        uint256[] calldata _weights
    ) external;

    function votes(
        uint256 _tokenId,
        address _pool
    ) external view returns (uint256);
}
