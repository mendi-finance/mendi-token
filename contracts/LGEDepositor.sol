//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/AccessControl.sol";

import "./interfaces/IERC20.sol";
import "./interfaces/IOwnedDistributor.sol";
import "./interfaces/VelocoreInterfaces.sol";
import "./libraries/SafeMath.sol";
import "./libraries/SafeToken.sol";

contract LGEDepositor is AccessControl {
    using TokenLib for Token;
    using SafeToken for address;

    address public immutable liquidityGenerator;
    IVault public immutable vault;
    IFactory public immutable factory;
    address public immutable mendi;
    address public immutable usdc;
    address public immutable vc;

    Token public immutable mendiToken;
    Token public immutable usdcToken;
    Token public immutable vcToken;
    IPool public immutable mendiUSDCPool;
    Token public immutable mendiUSDCPoolToken;

    uint256 finalizeAt;
    bool deposited;

    uint8 constant SWAP = 0;
    uint8 constant GAUGE = 1;

    uint8 constant EXACTLY = 0;
    uint8 constant AT_MOST = 1;
    uint8 constant ALL = 2;

    bytes32 public HARVESTER_ROLE = keccak256("HARVESTER_ROLE");

    modifier onlyLG() {
        require(msg.sender == liquidityGenerator, "LGEDepositor: ONLY_LG");
        _;
    }

    constructor(
        address liquidityGenerator_,
        IVault vault_,
        IFactory factory_,
        address mendi_,
        address usdc_,
        address vc_
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());

        liquidityGenerator = liquidityGenerator_;
        vault = vault_;
        factory = factory_;
        mendi = mendi_;
        usdc = usdc_;
        vc = vc_;

        mendiToken = toToken(IERC20(mendi));
        usdcToken = toToken(IERC20(usdc));
        vcToken = toToken(IERC20(vc));

        mendiUSDCPool = factory.pools(mendiToken, usdcToken);
        mendiUSDCPoolToken = toToken(IERC20(address(mendiUSDCPool)));
    }

    function finalize() external onlyLG {
        finalizeAt = getBlockTimestamp();
    }

    function deposit() external {
        require(finalizeAt > 0, "LGEDepositor: NOT_FINALIZED");

        addLPInternal();
        stakeLPInternal();

        deposited = true;
    }

    function harvest(address to) external onlyRole(HARVESTER_ROLE) {
        require(deposited, "LGEDepositor: NOT_DEPOSITED");

        harvestVCInternal();

        sendAllInternal(vcToken, to);
    }

    function withdraw(address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            getBlockTimestamp() > finalizeAt + 180 days,
            "LGEDepositor: NOT_FINALIZED"
        );

        unstakeLPInternal();
        removeLPInternal();

        sendAllInternal(vcToken, to);
        sendAllInternal(mendiToken, to);
        sendAllInternal(usdcToken, to);
    }

    /* Internal Liquidity Functions */

    function addLPInternal() internal {
        approveAllInternal(mendiToken, address(vault));
        approveAllInternal(usdcToken, address(vault));

        run3Internal(
            0,
            mendiUSDCPool,
            SWAP,
            mendiToken,
            EXACTLY,
            int128(int256(mendiToken.addr().balanceOf(address(this)))),
            usdcToken,
            EXACTLY,
            int128(int256(usdcToken.addr().balanceOf(address(this)))),
            mendiUSDCPoolToken,
            AT_MOST,
            0
        );

        removeApproveInternal(mendiToken, address(vault));
        removeApproveInternal(usdcToken, address(vault));
    }

    function stakeLPInternal() internal {
        approveAllInternal(mendiUSDCPoolToken, address(vault));

        run2Internal(
            0,
            mendiUSDCPool,
            GAUGE,
            mendiUSDCPoolToken,
            EXACTLY,
            int128(int256(mendiUSDCPoolToken.addr().balanceOf(address(this)))),
            vcToken,
            AT_MOST,
            0
        );

        removeApproveInternal(mendiUSDCPoolToken, address(vault));
    }

    function harvestVCInternal() internal {
        run1Internal(0, mendiUSDCPool, GAUGE, vcToken, AT_MOST, 0);
    }

    function unstakeLPInternal() internal {
        uint256 stakedAmount = IGauge(address(mendiUSDCPool)).stakedTokens(
            address(this)
        )[0];

        run2Internal(
            0,
            mendiUSDCPool,
            GAUGE,
            mendiUSDCPoolToken,
            EXACTLY,
            -(int128(uint128(stakedAmount))),
            vcToken,
            AT_MOST,
            0
        );
    }

    function removeLPInternal() internal {
        approveAllInternal(mendiUSDCPoolToken, address(vault));

        run3Internal(
            0,
            mendiUSDCPool,
            SWAP,
            mendiToken,
            AT_MOST,
            0,
            usdcToken,
            AT_MOST,
            0,
            mendiUSDCPoolToken,
            EXACTLY,
            int128(int256(mendiUSDCPoolToken.addr().balanceOf(address(this))))
        );

        removeApproveInternal(mendiUSDCPoolToken, address(vault));
    }

    function run1Internal(
        uint256 value,
        IPool pool,
        uint8 method,
        Token t1,
        uint8 m1,
        int128 a1
    ) internal {
        Token[] memory tokens = new Token[](1);

        VelocoreOperation[] memory ops = new VelocoreOperation[](1);

        tokens[0] = (t1);

        ops[0].poolId =
            bytes32(bytes1(method)) |
            bytes32(uint256(uint160(address(pool))));
        ops[0].tokenInformations = new bytes32[](1);
        ops[0].data = "";

        ops[0].tokenInformations[0] =
            bytes32(bytes1(0x00)) |
            bytes32(bytes2(uint16(m1))) |
            bytes32(uint256(uint128(uint256(int256(a1)))));
        vault.execute{value: value}(tokens, new int128[](1), ops);
    }

    function run2Internal(
        uint256 value,
        IPool pool,
        uint8 method,
        Token t1,
        uint8 m1,
        int128 a1,
        Token t2,
        uint8 m2,
        int128 a2
    ) internal {
        Token[] memory tokens = new Token[](2);

        VelocoreOperation[] memory ops = new VelocoreOperation[](1);

        tokens[0] = (t1);
        tokens[1] = (t2);

        ops[0].poolId =
            bytes32(bytes1(method)) |
            bytes32(uint256(uint160(address(pool))));
        ops[0].tokenInformations = new bytes32[](2);
        ops[0].data = "";

        ops[0].tokenInformations[0] =
            bytes32(bytes1(0x00)) |
            bytes32(bytes2(uint16(m1))) |
            bytes32(uint256(uint128(uint256(int256(a1)))));
        ops[0].tokenInformations[1] =
            bytes32(bytes1(0x01)) |
            bytes32(bytes2(uint16(m2))) |
            bytes32(uint256(uint128(uint256(int256(a2)))));
        vault.execute{value: value}(tokens, new int128[](2), ops);
    }

    function run3Internal(
        uint256 value,
        IPool pool,
        uint8 method,
        Token t1,
        uint8 m1,
        int128 a1,
        Token t2,
        uint8 m2,
        int128 a2,
        Token t3,
        uint8 m3,
        int128 a3
    ) internal {
        Token[] memory tokens = new Token[](3);

        VelocoreOperation[] memory ops = new VelocoreOperation[](1);

        tokens[0] = (t1);
        tokens[1] = (t2);
        tokens[2] = (t3);

        ops[0].poolId =
            bytes32(bytes1(method)) |
            bytes32(uint256(uint160(address(pool))));
        ops[0].tokenInformations = new bytes32[](3);
        ops[0].data = "";

        ops[0].tokenInformations[0] =
            bytes32(bytes1(0x00)) |
            bytes32(bytes2(uint16(m1))) |
            bytes32(uint256(uint128(uint256(int256(a1)))));
        ops[0].tokenInformations[1] =
            bytes32(bytes1(0x01)) |
            bytes32(bytes2(uint16(m2))) |
            bytes32(uint256(uint128(uint256(int256(a2)))));
        ops[0].tokenInformations[2] =
            bytes32(bytes1(0x02)) |
            bytes32(bytes2(uint16(m3))) |
            bytes32(uint256(uint128(uint256(int256(a3)))));
        vault.execute{value: value}(tokens, new int128[](3), ops);
    }

    /* Internal Helper Functions */

    function sendAllInternal(Token token, address to) internal {
        token.addr().safeTransfer(to, token.addr().balanceOf(address(this)));
    }

    function approveAllInternal(Token token, address spender) internal {
        token.addr().safeApprove(
            spender,
            token.addr().balanceOf(address(this))
        );
    }

    function removeApproveInternal(Token token, address spender) internal {
        token.addr().safeApprove(spender, 0);
    }

    /* Admin Functions */

    function _recover(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            getBlockTimestamp() > finalizeAt + 7 days,
            "LGEDepositor: NOT_RECOVER_TIME"
        );
        require(!deposited, "LGEDepositor: DEPOSIT_SUCCEEDED");
        uint256 amount = token.balanceOf(address(this));
        token.safeTransfer(msg.sender, amount);
    }

    /* Misc Functions */

    function getBlockTimestamp() public view virtual returns (uint256) {
        return block.timestamp;
    }
}
