// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./IERC20.sol";

bytes32 constant TOKEN_MASK = 0x000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
bytes32 constant ID_MASK = 0x00FFFFFFFFFFFFFFFFFFFFFF0000000000000000000000000000000000000000;

uint256 constant ID_SHIFT = 160;
bytes32 constant TOKENSPEC_MASK = 0xFF00000000000000000000000000000000000000000000000000000000000000;

type Token is bytes32;
type TokenSpecType is bytes32;

library TokenSpec {
    TokenSpecType constant ERC20 =
        TokenSpecType.wrap(
            0x0000000000000000000000000000000000000000000000000000000000000000
        );

    TokenSpecType constant ERC721 =
        TokenSpecType.wrap(
            0x0100000000000000000000000000000000000000000000000000000000000000
        );

    TokenSpecType constant ERC1155 =
        TokenSpecType.wrap(
            0x0200000000000000000000000000000000000000000000000000000000000000
        );

    TokenSpecType constant NATIVE =
        TokenSpecType.wrap(
            0xEE00000000000000000000000000000000000000000000000000000000000000
        );
}

library TokenLib {
    using TokenLib for Token;
    using TokenLib for bytes32;

    function wrap(bytes32 data) internal pure returns (Token) {
        return Token.wrap(data);
    }

    function unwrap(Token tok) internal pure returns (bytes32) {
        return Token.unwrap(tok);
    }

    function addr(Token tok) internal pure returns (address) {
        return address(uint160(uint256(tok.unwrap() & TOKEN_MASK)));
    }

    function id(Token tok) internal pure returns (uint256) {
        return uint256((tok.unwrap() & ID_MASK) >> ID_SHIFT);
    }

    function spec(Token tok) internal pure returns (TokenSpecType) {
        return TokenSpecType.wrap(tok.unwrap() & TOKENSPEC_MASK);
    }
}

function toToken(IERC20 tok) pure returns (Token) {
    return Token.wrap(bytes32(uint256(uint160(address(tok)))));
}

function toToken(
    TokenSpecType spec_,
    uint88 id_,
    address addr_
) pure returns (Token) {
    return
        Token.wrap(
            TokenSpecType.unwrap(spec_) |
                bytes32((bytes32(uint256(id_)) << ID_SHIFT) & ID_MASK) |
                bytes32(uint256(uint160(addr_)))
        );
}

interface IAuthorizer {
    /**
     * @dev Returns true if `account` can perform the action described by `actionId` in the contract `where`.
     */
    function canPerform(
        bytes32 actionId,
        address account,
        address where
    ) external view returns (bool);
}

interface IPool {
    function poolParams() external view returns (bytes memory);
}

interface ISwap is IPool {
    function velocore__execute(
        address user,
        Token[] calldata tokens,
        int128[] memory amounts,
        bytes calldata data
    ) external returns (int128[] memory, int128[] memory);

    function swapType() external view returns (string memory);

    function listedTokens() external view returns (Token[] memory);

    function lpTokens() external view returns (Token[] memory);

    function underlyingTokens(Token lp) external view returns (Token[] memory);
    //function spotPrice(Token token, Token base) external view returns (uint256);
}

interface IGauge is IPool {
    /**
     * @dev This method is called by Vault.execute().
     * the parameters and return values are the same as velocore__execute.
     * The only difference is that the vault will call velocore__emission before calling velocore__gauge.
     */
    function velocore__gauge(
        address user,
        Token[] calldata tokens,
        int128[] memory amounts,
        bytes calldata data
    ) external returns (int128[] memory deltaGauge, int128[] memory deltaPool);

    /**
     * @dev This method is called by Vault.execute() before calling velocore__emission or changing votes.
     *
     * The vault will credit emitted VC into the gauge balance.
     * IGauge is expected to update its internal ledger.
     * @param newEmissions newly emitted VCs since last emission
     */
    function velocore__emission(uint256 newEmissions) external;

    function stakeableTokens() external view returns (Token[] memory);

    function stakedTokens(
        address user
    ) external view returns (uint256[] memory);

    function stakedTokens() external view returns (uint256[] memory);

    function emissionShare(address user) external view returns (uint256);

    function naturalBribes() external view returns (Token[] memory);
}

interface IConverter {
    /**
     * @dev This method is called by Vault.execute().
     * Vault will transfer any positively specified amounts directly to the IConverter before calling velocore__convert.
     *
     * Instead of returning balance delta numbers, IConverter is expected to directly transfer outputs back to vault.
     * Vault will measure the difference, and credit the user.
     */
    function velocore__convert(
        address user,
        Token[] calldata tokens,
        int128[] memory amounts,
        bytes calldata data
    ) external;
}

interface IBribe is IPool {
    /**
     * @dev This method is called when someone vote/harvest from/to a @param gauge,
     * and when this IBribe happens to be attached to the gauge.
     *
     * Attachment can happen without IBribe's permission. Implementations must verify that @param gauge is correct.
     *
     * Returns balance deltas; their net differences are credited as bribe.
     * deltaExternal must be zero or negative; Vault will take specified amounts from the contract's balance
     *
     * @param  gauge  the gauge to bribe for.
     * @param  elapsed  elapsed time after last call; can be used to save gas.
     */
    function velocore__bribe(
        IGauge gauge,
        uint256 elapsed
    )
        external
        returns (
            Token[] memory bribeTokens,
            int128[] memory deltaGauge,
            int128[] memory deltaPool,
            int128[] memory deltaExternal
        );

    function bribeTokens(IGauge gauge) external view returns (Token[] memory);

    function bribeRates(IGauge gauge) external view returns (uint256[] memory);
}

interface IFacet {
    function initializeFacet() external;
}

interface IFactory {
    function pools(Token quote, Token base) external view returns (IPool pool);
}

struct VelocoreOperation {
    bytes32 poolId;
    bytes32[] tokenInformations;
    bytes data;
}

interface IVault {
    event Swap(
        ISwap indexed pool,
        address indexed user,
        Token[] tokenRef,
        int128[] delta
    );
    event Gauge(
        IGauge indexed pool,
        address indexed user,
        Token[] tokenRef,
        int128[] delta
    );
    event Convert(
        IConverter indexed pool,
        address indexed user,
        Token[] tokenRef,
        int128[] delta
    );
    event Vote(IGauge indexed pool, address indexed user, int256 voteDelta);
    event UserBalance(
        address indexed to,
        address indexed from,
        Token[] tokenRef,
        int128[] delta
    );
    event BribeAttached(IGauge indexed gauge, IBribe indexed bribe);
    event BribeKilled(IGauge indexed gauge, IBribe indexed bribe);
    event GaugeKilled(IGauge indexed gauge, bool killed);

    function notifyInitialSupply(Token, uint128, uint128) external;

    function attachBribe(IGauge gauge, IBribe bribe) external;

    function killBribe(IGauge gauge, IBribe bribe) external;

    function killGauge(IGauge gauge, bool t) external;

    function ballotToken() external returns (Token);

    function emissionToken() external returns (Token);

    function execute(
        Token[] calldata tokenRef,
        int128[] memory deposit,
        VelocoreOperation[] calldata ops
    ) external payable;

    function query(
        address user,
        Token[] calldata tokenRef,
        int128[] memory deposit,
        VelocoreOperation[] calldata ops
    ) external returns (int128[] memory);

    function admin_setFunctions(
        address implementation,
        bytes4[] calldata sigs
    ) external;

    function admin_addFacet(IFacet implementation) external;

    function admin_setAuthorizer(IAuthorizer auth_) external;

    function inspect(address lens, bytes memory data) external;
}
