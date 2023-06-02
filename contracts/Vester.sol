//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./interfaces/IMendi.sol";
import "./interfaces/IClaimable.sol";
import "./interfaces/IVester.sol";

contract Vester is IVester, IClaimable {
    using SafeMath for uint256;

    uint256 public constant override segments = 100;

    address public immutable mendi;
    address public recipient;

    uint256 public immutable override vestingAmount;
    uint256 public immutable override vestingBegin;
    uint256 public immutable override vestingEnd;

    uint256 public previousPoint;
    uint256 public immutable finalPoint;

    constructor(
        address mendi_,
        address recipient_,
        uint256 vestingAmount_,
        uint256 vestingBegin_,
        uint256 vestingEnd_
    ) {
        require(vestingEnd_ > vestingBegin_, "Vester: END_TOO_EARLY");

        mendi = mendi_;
        recipient = recipient_;

        vestingAmount = vestingAmount_;
        vestingBegin = vestingBegin_;
        vestingEnd = vestingEnd_;

        finalPoint = vestingCurve(1e18);
    }

    function vestingCurve(uint256 x) public pure virtual returns (uint256 y) {
        uint256 speed = 1e18;
        for (uint256 i = 0; i < 100e16; i += 1e16) {
            if (x < i + 1e16) return y + (speed * (x - i)) / 1e16;
            y += speed;
            speed = (speed * 976) / 1000;
        }
    }

    function getUnlockedAmount() internal virtual returns (uint256 amount) {
        uint256 blockTimestamp = getBlockTimestamp();
        uint256 currentPoint = vestingCurve(
            (blockTimestamp - vestingBegin).mul(1e18).div(
                vestingEnd - vestingBegin
            )
        );
        amount = vestingAmount.mul(currentPoint.sub(previousPoint)).div(
            finalPoint
        );
        previousPoint = currentPoint;
    }

    function claim() public virtual override returns (uint256 amount) {
        require(msg.sender == recipient, "Vester: UNAUTHORIZED");
        uint256 blockTimestamp = getBlockTimestamp();
        if (blockTimestamp < vestingBegin) return 0;
        if (blockTimestamp > vestingEnd) {
            amount = IMendi(mendi).balanceOf(address(this));
        } else {
            amount = getUnlockedAmount();
        }
        if (amount > 0) IMendi(mendi).transfer(recipient, amount);
    }

    function setRecipient(address recipient_) public virtual {
        require(msg.sender == recipient, "Vester: UNAUTHORIZED");
        recipient = recipient_;
    }

    function getBlockTimestamp() public view virtual returns (uint256) {
        return block.timestamp;
    }
}
