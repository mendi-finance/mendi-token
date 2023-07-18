import * as dotenv from "dotenv";
dotenv.config();

import "@nomicfoundation/hardhat-network-helpers";
import "@nomiclabs/hardhat-waffle";
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
            companionNetworks: {
                mainnet: process.env.FORKING_NETWORK?.toLowerCase()!,
            },
            forking: {
                enabled: true,
                url: process.env[
                    `${process.env.FORKING_NETWORK?.toUpperCase()}_RPC_URL`
                ]!,
            },
            autoImpersonate: true,
            gasPrice: 1000000000,
            addresses: {
                usdc: "0xf56dc6695cF1f5c364eDEbC7Dc7077ac9B586068",
                msig: "0x1Ed1b93377B6b4Fa4cC7146a06C8912185C9EAb0",
            },
        },
        linea_goerli: {
            chainId: 59140,
            url: process.env.LINEA_GOERLI_RPC_URL,
            accounts: [process.env.LINEA_GOERLI_DEPLOYER!],
            verify: {
                etherscan: {
                    apiUrl: "https://explorer.goerli.linea.build",
                    apiKey: "abc",
                },
            },
            addresses: {
                usdc: "0xf56dc6695cF1f5c364eDEbC7Dc7077ac9B586068",
                msig: "0xE2556B10E11aD8F5c0bE37E3f6A7BE43A4C472b8",
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
