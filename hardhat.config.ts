import * as dotenv from "dotenv";
dotenv.config();

import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-network-helpers";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import "hardhat-deploy";
import { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: "0.5.16",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            {
                version: "0.8.10",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    networks: {
        hardhat: {
            /*accounts: [
                {
                    privateKey:
                        process.env[
                            `${process.env.FORKING_NETWORK?.toUpperCase()}_DEPLOYER`
                        ]!,
                    balance: "10000000000000000000000",
                },
            ],*/
            companionNetworks: {
                mainnet: process.env.FORKING_NETWORK?.toLowerCase()!,
            },
            forking: {
                blockNumber: 166350,
                enabled: true,
                url: process.env[
                    `${process.env.FORKING_NETWORK?.toUpperCase()}_RPC_URL`
                ]!,
            },
            autoImpersonate: true,
            gasPrice: 1000000000,
        },
        linea: {
            chainId: 59144,
            url: process.env.LINEA_RPC_URL,
            accounts: [process.env.LINEA_DEPLOYER!],
            verify: {
                etherscan: {
                    apiUrl: process.env.LINEA_EXPLORER_API_URL,
                    apiKey: process.env.LINEA_EXPLORER_API_KEY,
                },
            },
            addresses: {
                usdc: "0x176211869ca2b568f2a7d4ee941e073a821ee1ff",
                msig: "0xe3CDa0A0896b70F0eBC6A1848096529AA7AEe9eE",
                vc: "0xcc22F6AA610D1b2a0e89EF228079cB3e1831b1D1",
                vault: "0x1d0188c4B276A09366D05d6Be06aF61a73bC7535",
                factory: "0xBe6c6A389b82306e88d74d1692B67285A9db9A47",
                usdcWhale: "0xd5efeedaeadbfaa3c5741010cce8a2cf61df2630",
            },
        },
        linea_goerli: {
            chainId: 59140,
            url: process.env.LINEA_GOERLI_RPC_URL,
            accounts: [process.env.LINEA_GOERLI_DEPLOYER!],
            verify: {
                etherscan: {
                    apiUrl: process.env.LINEA_GOERLI_EXPLORER_API_URL,
                    apiKey: process.env.LINEA_GOERLI_EXPLORER_API_KEY,
                },
            },
            addresses: {
                usdc: "",
                msig: "",
                vc: "",
                vault: "",
                factory: "",
            },
        },
    },
    namedAccounts: {
        adminAccount: {
            default: 0,
        },
        reservesAccount: {
            default: 1,
        },
    },
};

export default config;
