import { deployments, ethers } from "hardhat";

import { BigNumberish, Contract } from "ethers";
import { Deployment } from "hardhat-deploy/types";

type ERC20FixtureOutput = [Contract];
type ERC20FixtureOptions = {
    contractKey?: string;
    contractArgs?: any[];
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
            tokenContract = await ethers.getContractAt(
                options.contractKey,
                tokenDeploy.address
            );
        }
    }

    if (!tokenContract) {
        const [deployer] = await ethers.getSigners();
        tokenDeploy = await deploy(options?.contractKey || "MockERC20Token", {
            from: deployer.address,
            args: options?.contractArgs ?? [
                ethers.utils.parseEther("1000"),
                18,
            ],
        });
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

export { erc20TokenFixture, lgeFixture };
