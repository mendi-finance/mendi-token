//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./interfaces/IMendi.sol";
import "./interfaces/IClaimable.sol";

abstract contract Distributor is IClaimable {
    using SafeMath for uint256;

    uint256 public constant MANTISSA2 = 2 ** 160;

    address public immutable mendi;
    address public immutable claimable;

    struct Recipient {
        uint256 shares;
        uint256 lastShareIndex;
        uint256 credit;
    }
    mapping(address => Recipient) public recipients;

    uint256 public totalShares;
    uint256 public shareIndex;

    event UpdateShareIndex(uint256 shareIndex);
    event UpdateCredit(
        address indexed account,
        uint256 lastShareIndex,
        uint256 credit
    );
    event EditRecipient(
        address indexed account,
        uint256 shares,
        uint256 totalShares
    );

    constructor(address mendi_, address claimable_) {
        mendi = mendi_;
        claimable = claimable_;
    }

    function updateShareIndex()
        public
        virtual
        nonReentrant
        returns (uint256 _shareIndex)
    {
        if (totalShares == 0) return shareIndex;
        uint256 amount = IClaimable(claimable).claim();
        if (amount == 0) return shareIndex;

        _shareIndex = amount.mul(MANTISSA2).div(totalShares).add(shareIndex);
        shareIndex = _shareIndex;
        emit UpdateShareIndex(_shareIndex);
    }

    function updateCredit(address account) public returns (uint256 credit) {
        uint256 _shareIndex = updateShareIndex();
        if (_shareIndex == 0) return 0;
        Recipient storage recipient = recipients[account];
        credit =
            recipient.credit +
            _shareIndex.sub(recipient.lastShareIndex).mul(recipient.shares) /
            MANTISSA2;
        recipient.lastShareIndex = _shareIndex;
        recipient.credit = credit;
        emit UpdateCredit(account, _shareIndex, credit);
    }

    function claimInternal(
        address account
    ) internal virtual returns (uint256 amount) {
        amount = updateCredit(account);
        if (amount > 0) {
            recipients[account].credit = 0;
            IMendi(mendi).transfer(account, amount);
            emit Claim(account, amount);
        }
    }

    function claim() external virtual override returns (uint256 amount) {
        return claimInternal(msg.sender);
    }

    function editRecipientInternal(address account, uint256 shares) internal {
        updateCredit(account);
        Recipient storage recipient = recipients[account];
        uint256 prevShares = recipient.shares;
        uint256 _totalShares = shares > prevShares
            ? totalShares.add(shares - prevShares)
            : totalShares.sub(prevShares - shares);
        totalShares = _totalShares;
        recipient.shares = shares;
        emit EditRecipient(account, shares, _totalShares);
    }

    // Prevents a contract from calling itself, directly or indirectly.
    bool internal _notEntered = true;
    modifier nonReentrant() {
        require(_notEntered, "Distributor: REENTERED");
        _notEntered = false;
        _;
        _notEntered = true;
    }
}
