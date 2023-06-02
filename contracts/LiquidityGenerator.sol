//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "./interfaces/IERC20.sol";
import "./interfaces/IOwnedDistributor.sol";
import "./interfaces/IVelodromeGauge.sol";
import "./interfaces/IVelodromePairFactory.sol";
import "./interfaces/IVelodromeRouter.sol";
import "./interfaces/IVelodromeVoter.sol";
import "./libraries/SafeMath.sol";
import "./libraries/SafeToken.sol";

contract LiquidityGenerator {
    using SafeMath for uint256;
    using SafeToken for address;

    struct ConstuctorParams {
        address admin_;
        address mendi_;
        address usdc_;
        address reservesManager_;
        address distributor_;
        address bonusDistributor_;
        uint256 periodBegin_;
        uint256 periodDuration_;
        uint256 bonusDuration_;
    }

    address public immutable mendi;
    address public immutable usdc;
    address public immutable distributor;
    address public immutable bonusDistributor;
    uint256 public immutable periodBegin;
    uint256 public immutable periodEnd;
    uint256 public immutable bonusEnd;
    bool public finalized = false;
    bool public delivered = false;
    address public admin;
    address public pendingAdmin;
    address public reservesManager;

    event AdminChanged(address prevAdmin, address newAdmin);
    event PendingAdminChanged(
        address prevPendingAdmin,
        address newPendingAdmin
    );
    event ReservesManagerChanged(
        address prevReservesManager,
        address newReservesManager
    );
    event Finalized(uint256 amountMendi, uint256 amountUSDC);
    event Deposit(
        address indexed sender,
        uint256 amount,
        uint256 distributorTotalShares,
        uint256 bonusDistributorTotalShares,
        uint256 newShares,
        uint256 newBonusShares
    );

    constructor(ConstuctorParams memory params_) {
        require(
            params_.periodDuration_ > 0,
            "LiquidityGenerator: INVALID_PERIOD_DURATION"
        );
        require(
            params_.bonusDuration_ > 0 &&
                params_.bonusDuration_ <= params_.periodDuration_,
            "LiquidityGenerator: INVALID_BONUS_DURATION"
        );
        admin = params_.admin_;
        mendi = params_.mendi_;
        usdc = params_.usdc_;
        reservesManager = params_.reservesManager_;
        distributor = params_.distributor_;
        bonusDistributor = params_.bonusDistributor_;
        periodBegin = params_.periodBegin_;
        periodEnd = params_.periodBegin_.add(params_.periodDuration_);
        bonusEnd = params_.periodBegin_.add(params_.bonusDuration_);
    }

    function distributorTotalShares()
        public
        view
        returns (uint256 totalShares)
    {
        return IOwnedDistributor(distributor).totalShares();
    }

    function bonusDistributorTotalShares()
        public
        view
        returns (uint256 totalShares)
    {
        return IOwnedDistributor(bonusDistributor).totalShares();
    }

    function distributorRecipients(
        address account
    )
        public
        view
        returns (uint256 shares, uint256 lastShareIndex, uint256 credit)
    {
        return IOwnedDistributor(distributor).recipients(account);
    }

    function bonusDistributorRecipients(
        address account
    )
        public
        view
        returns (uint256 shares, uint256 lastShareIndex, uint256 credit)
    {
        return IOwnedDistributor(bonusDistributor).recipients(account);
    }

    function _setAdmin(address admin_) external {
        require(msg.sender == admin, "LiquidityGenerator: FORBIDDEN");
        require(admin_ != address(0), "LiquidityGenerator: INVALID_ADDRESS");
        address prevPendingAdmin = pendingAdmin;
        pendingAdmin = admin_;
        emit PendingAdminChanged(prevPendingAdmin, pendingAdmin);
    }

    function _acceptAdmin() external {
        require(msg.sender == pendingAdmin, "LiquidityGenerator: FORBIDDEN");
        address prevAdmin = admin;
        address prevPendingAdmin = pendingAdmin;
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit AdminChanged(prevAdmin, admin);
        emit PendingAdminChanged(prevPendingAdmin, pendingAdmin);
    }

    function _setReservesManager(address reservesManager_) external {
        require(msg.sender == admin, "LiquidityGenerator: FORBIDDEN");
        require(
            reservesManager_ != address(0),
            "LiquidityGenerator: INVALID_ADDRESS"
        );
        address prevReservesManager = reservesManager;
        reservesManager = reservesManager_;
        emit ReservesManagerChanged(prevReservesManager, reservesManager);
    }

    function finalize() public {
        require(!finalized, "LiquidityGenerator: FINALIZED");
        uint256 blockTimestamp = getBlockTimestamp();
        require(blockTimestamp >= periodEnd, "LiquidityGenerator: TOO_SOON");

        uint256 _amountMendi = mendi.myBalance();
        uint256 _amountUSDC = usdc.balanceOf(reservesManager);

        finalized = true;
        emit Finalized(_amountMendi, _amountUSDC);
    }

    function deposit(uint256 amountUSDC) external payable {
        uint256 blockTimestamp = getBlockTimestamp();
        require(blockTimestamp >= periodBegin, "LiquidityGenerator: TOO_SOON");
        require(blockTimestamp < periodEnd, "LiquidityGenerator: TOO_LATE");
        require(amountUSDC >= 1e7, "LiquidityGenerator: INVALID_VALUE"); // minimum 10 USDC

        // Pull usdc to reserves manager
        usdc.safeTransferFrom(msg.sender, reservesManager, amountUSDC);

        (uint256 _prevSharesBonus, , ) = IOwnedDistributor(bonusDistributor)
            .recipients(msg.sender);
        uint256 _newSharesBonus = _prevSharesBonus;
        if (blockTimestamp < bonusEnd) {
            _newSharesBonus = _prevSharesBonus.add(amountUSDC);
            IOwnedDistributor(bonusDistributor).editRecipient(
                msg.sender,
                _newSharesBonus
            );
        }
        (uint256 _prevShares, , ) = IOwnedDistributor(distributor).recipients(
            msg.sender
        );
        uint256 _newShares = _prevShares.add(amountUSDC);
        IOwnedDistributor(distributor).editRecipient(msg.sender, _newShares);
        emit Deposit(
            msg.sender,
            amountUSDC,
            distributorTotalShares(),
            bonusDistributorTotalShares(),
            _newShares,
            _newSharesBonus
        );
    }

    receive() external payable {
        revert("LiquidityGenerator: BAD_CALL");
    }

    function getBlockTimestamp() public view virtual returns (uint256) {
        return block.timestamp;
    }
}
