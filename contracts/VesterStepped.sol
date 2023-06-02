//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "./Vester.sol";

contract VesterStepped is Vester {
    constructor(
        address mendi_,
        address recipient_,
        uint256 vestingAmount_,
        uint256 vestingBegin_,
        uint256 vestingEnd_
    ) Vester(mendi_, recipient_, vestingAmount_, vestingBegin_, vestingEnd_) {}

    function vestingCurve(
        uint256 x
    ) public pure virtual override returns (uint256 y) {
        uint256 speed = 1e18;
        for (uint256 i = 0; i < 100e16; i += 1e16) {
            if (x < i) return y;
            y += speed;
            speed = (speed * 976) / 1000;
        }
    }
}
