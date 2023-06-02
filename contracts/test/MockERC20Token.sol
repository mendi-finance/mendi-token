//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20Token is ERC20 {
    uint8 private immutable _decimals;

    constructor(uint256 supply, uint8 decimals_) ERC20("MockERC20", "MCK") {
        _decimals = decimals_;

        _mint(msg.sender, supply);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
