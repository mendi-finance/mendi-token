//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./Vester.sol";

contract VesterCliff is Vester {
    using SafeMath for uint256;

    uint256 public immutable vestingCliff;

    constructor(
        address mendi_,
        address recipient_,
        uint256 vestingAmount_,
        uint256 vestingBegin_,
        uint256 vestingEnd_,
        uint256 vestingCliff_
    ) Vester(mendi_, recipient_, vestingAmount_, vestingBegin_, vestingEnd_) {
        require(
            vestingCliff_ >= vestingBegin_,
            "VesterCliff::constructor: cliff is too early"
        );
        require(
            vestingCliff_ <= vestingEnd_,
            "VesterCliff::constructor: cliff is too late"
        );
        vestingCliff = vestingCliff_;
    }

    function claim() public virtual override returns (uint256 amount) {
        uint256 blockTimestamp = getBlockTimestamp();
        if (blockTimestamp < vestingCliff) return 0;

        amount = super.claim();
    }
}
