import { deployments, ethers } from "hardhat";

import { recipients, amounts } from "../deploy/02_team-vesting";
import { BigNumberish } from "ethers";

const mendiTokenFixture = deployments.createFixture(
    async ({ deployments, companionNetworks }, options) => {
        await deployments.fixture(undefined, {
            keepExistingDeployments: true,
        });

        const companionDeployments = companionNetworks["mainnet"].deployments;
        const [deployer] = await ethers.getSigners();

        const mendiTokenDeploy = await companionDeployments.get("Mendi");
        const mendiToken = await ethers.getContractAt(
            "Mendi",
            mendiTokenDeploy.address
        );

        return {
            deployer,
            mendiToken,
        };
    }
);

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

export { mendiTokenFixture, teamVestingFixture };
