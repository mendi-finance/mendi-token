//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

abstract contract SoulBoundToken is IERC20 {
    string public name;
    string public symbol;
    uint256 public decimals;
    uint256 public maxSupply;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 decimals_,
        uint256 maxSupply_
    ) {
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
        maxSupply = maxSupply_;
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        revert("SBT: no transfer");
    }

    function allowance(
        address owner,
        address spender
    ) public view returns (uint256) {
        return 0;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        revert("SBT: no approve");
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public returns (bool) {
        revert("SBT: no transfer");
    }

    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "SBT: mint to the zero address");

        uint256 newTotalSupply = _totalSupply + amount;
        require(newTotalSupply <= maxSupply, "SBT: max supply reached");

        _totalSupply = newTotalSupply;
        unchecked {
            // Overflow not possible: balance + amount is at most totalSupply + amount, which is checked above.
            _balances[account] += amount;
        }
        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
            _balances[account] = accountBalance - amount;
            // Overflow not possible: amount <= accountBalance <= totalSupply.
            _totalSupply -= amount;
        }

        emit Transfer(account, address(0), amount);
    }
}

contract MendiLoyaltyPoint is AccessControl, SoulBoundToken {
    using ECDSA for bytes32;
    using Address for address;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant MINT_SIGNER_ROLE = keccak256("MINT_SIGNER_ROLE");

    mapping(address => uint256) private _minted;

    constructor()
        SoulBoundToken("Mendi Loyalty Point", "MLP", 18, 1_000_000 * 10e18)
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function mintWithPermit(
        address to,
        uint256 cumulativeAmount,
        uint256 expire,
        bytes memory signature
    ) public {
        require(expire > block.timestamp, "MLP: expired");

        address msgSender = _msgSender();
        if (msgSender != to) {
            require(hasRole(MINTER_ROLE, msgSender), "MLP: user or minter");
        }

        bytes32 message = getSignMessage(to, cumulativeAmount, expire);
        require(verifySignature(message, signature), "MLP: not permitted");
        console.log("MLP");

        uint256 oldMinted = _minted[to];
        require(cumulativeAmount > oldMinted, "MLP: nothing to mint");

        uint256 mintAmount;
        unchecked {
            // Overflow not possible: oldMinted < cumulativeAmount.
            mintAmount = cumulativeAmount - oldMinted;
        }

        _minted[to] = cumulativeAmount;
        _mint(to, mintAmount);
    }

    function burn(uint256 amount) public {
        _burn(_msgSender(), amount);
    }

    function getSignMessage(
        address account,
        uint256 cumulativeAmount,
        uint256 expire
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(account, cumulativeAmount, expire));
    }

    function verifySignature(
        bytes32 message,
        bytes memory signature
    ) public view returns (bool) {
        bytes32 hash = message.toEthSignedMessageHash();
        address recoveredSigner = hash.recover(signature);
        return hasRole(MINT_SIGNER_ROLE, recoveredSigner);
    }
}
