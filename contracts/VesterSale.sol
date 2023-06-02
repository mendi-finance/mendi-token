//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./Vester.sol";

contract VesterSale is Vester {
    using SafeMath for uint256;

    constructor(
        address mendi_,
        address recipient_,
        uint256 vestingAmount_,
        uint256 vestingBegin_,
        uint256 vestingEnd_
    ) Vester(mendi_, recipient_, vestingAmount_, vestingBegin_, vestingEnd_) {}

    function getUnlockedAmount()
        internal
        virtual
        override
        returns (uint256 amount)
    {
        uint256 blockTimestamp = getBlockTimestamp();
        uint256 currentPoint = vestingCurve(
            (blockTimestamp - vestingBegin).mul(1e18).div(
                vestingEnd - vestingBegin
            )
        );
        amount = vestingAmount
            .mul(currentPoint.sub(previousPoint))
            .div(finalPoint)
            .mul(5)
            .div(10);
        if (previousPoint == 0 && currentPoint > 0) {
            // distribute 50% on TGE
            amount = amount.add(vestingAmount.div(2));
        }
        previousPoint = currentPoint;
    }
}
