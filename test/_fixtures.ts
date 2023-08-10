import { deployments, ethers } from "hardhat";

import { recipients, amounts } from "../deploy/03_team-vesting";
import { BigNumberish, Contract } from "ethers";
import { Deployment } from "hardhat-deploy/types";

type ERC20FixtureOutput = [Contract];
type ERC20FixtureOptions = {
    contractKey?: string;
    contractArgs?: any[];
    mockContractKey?: string;
    mockSupply?: BigNumberish;
    mockDecimals?: BigNumberish;
};
const erc20TokenFixture = deployments.createFixture<
    ERC20FixtureOutput,
    ERC20FixtureOptions
>(async ({ deployments, companionNetworks }, options) => {
    const { deploy } = deployments;

    await deployments.fixture(undefined, {
        keepExistingDeployments: true,
    });
    const companionDeployments = companionNetworks["mainnet"].deployments;

    let tokenDeploy: Deployment | null = null;
    let tokenContract: Contract | null = null;

    if (options && options.contractKey) {
        tokenDeploy = await companionDeployments.getOrNull(options.contractKey);
        if (tokenDeploy) {
            console.log(
                `Contract with key ${options?.contractKey} is found at ${tokenDeploy.address}.`
            );
            tokenContract = await ethers.getContractAt(
                options.contractKey,
                tokenDeploy.address
            );
        } else {
            console.log(
                `Contract with key ${options?.contractKey} not found, will be deployed a new one.`
            );
            const [deployer] = await ethers.getSigners();
            tokenDeploy = await deploy(options.contractKey, {
                from: deployer.address,
                args: options.contractArgs,
            });
        }
    }

    if (!tokenContract) {
        const [deployer] = await ethers.getSigners();
        tokenDeploy = await deploy(
            options?.mockContractKey || "MockERC20Token",
            {
                from: deployer.address,
                args: [
                    options?.mockSupply ?? ethers.utils.parseEther("1000"),
                    options?.mockDecimals ?? 18,
                ],
            }
        );
        tokenContract = tokenContract = await ethers.getContractAt(
            "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
            tokenDeploy.address
        );
    }

    if (!tokenContract)
        throw new Error("Not able to create a fixture for erc20");

    return [tokenContract];
});

type LGEFixtureOutput = [Contract, Contract];
type LGEFixtureOptions = {};
const lgeFixture = deployments.createFixture<
    LGEFixtureOutput,
    LGEFixtureOptions
>(async ({ deployments, companionNetworks }, options) => {
    const liquidityGenerator = await ethers.getContract("LiquidityGenerator");
    const lgeDepositor = await ethers.getContract("LGEDepositor");

    return [liquidityGenerator, lgeDepositor];
});

const teamVestingFixture = deployments.createFixture(
    async ({ deployments, companionNetworks }, options) => {
        await deployments.fixture(undefined, {
            keepExistingDeployments: true,
        });

        const companionDeployments = companionNetworks["mainnet"].deployments;
        const [deployer] = await ethers.getSigners();

        const teamVesterDeploy = await companionDeployments.get("TeamVester");
        const teamVester = await ethers.getContractAt(
            "VesterCliff",
            teamVesterDeploy.address
        );

        const teamDistributorDeploy = await companionDeployments.get(
            "TeamDistributor"
        );
        const teamDistributor = await ethers.getContractAt(
            "OwnedDistributor",
            teamDistributorDeploy.address
        );

        const participants: {
            [address: string]: {
                shares: BigNumberish;
                lastClaimed: number;
                totalClaimed: number;
            };
        } = {};
        for (const [index, recipient] of recipients.entries()) {
            participants[recipient] = {
                shares: amounts[index],
                lastClaimed: 0,
                totalClaimed: 0,
            };
        }

        const [, , randomUser] = await ethers.getSigners();

        return {
            deployer,
            teamVester,
            teamDistributor,
            participants,
            randomUser,
        };
    }
);

export { erc20TokenFixture, lgeFixture, teamVestingFixture };
