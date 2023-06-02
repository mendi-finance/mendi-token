//SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.5.0;

interface IVelodromePairFactory {
    function createPair(
        address tokenA,
        address tokenB,
        bool stable
    ) external returns (address pair);

    function getPair(
        address tokenA,
        address tokenB,
        bool stable
    ) external view returns (address pair);
}
