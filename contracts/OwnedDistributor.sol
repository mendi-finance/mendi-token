//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "./Distributor.sol";

contract OwnedDistributor is Distributor {
    address public admin;

    event SetAdmin(address newAdmin);

    constructor(
        address mendi_,
        address claimable_,
        address admin_
    ) Distributor(mendi_, claimable_) {
        admin = admin_;
    }

    function editRecipient(address account, uint256 shares) public virtual {
        require(msg.sender == admin, "OwnedDistributor: UNAUTHORIZED");
        editRecipientInternal(account, shares);
    }

    function editRecipients(
        address[] memory accounts,
        uint256[] memory shares
    ) public virtual {
        require(msg.sender == admin, "OwnedDistributor: UNAUTHORIZED");
        require(
            accounts.length == shares.length,
            "OwnedDistributor: INVALID_INPUT"
        );

        for (uint256 i = 0; i < accounts.length; i++) {
            editRecipientInternal(accounts[i], shares[i]);
        }
    }

    function setAdmin(address admin_) public virtual {
        require(msg.sender == admin, "OwnedDistributor: UNAUTHORIZED");
        admin = admin_;
        emit SetAdmin(admin_);
    }
}
