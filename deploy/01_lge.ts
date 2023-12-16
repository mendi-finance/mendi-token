import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getNetworkConfigValue, getNetworkDeployment } from "../test/_utils";

const liquidityAmount = ethers.utils.parseEther("2500000");
const vestingAmount = ethers.utils.parseEther("3200000");
const bonusVestingAmount = ethers.utils.parseEther("300000");
const periodBegin = 1691672400; // 2023-08-10 13:00:00 PM GMT
const periodDuration = 7 * 24 * 60 * 60; // 7 days
const bonusDuration = 1 * 24 * 60 * 60; // 1 day
const vestingBegin = 1692288000; // 2023-08-21 13:00:00 PM GMT
const vestingDuration = 1 * 365 * 24 * 60 * 60; // 1 year

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    return false;
    const addresses = getNetworkConfigValue(hre, "addresses");
    if (!addresses) throw new Error("No addresses in config");

    const {
        deployments: { deploy, get },
        getNamedAccounts,
    } = hre;
    const vestingEnd = vestingBegin + vestingDuration;

    const { adminAccount } = await getNamedAccounts();
    const admin = await ethers.getSigner(adminAccount);

    const mendi = await getNetworkDeployment(hre, "Mendi");

    // Distributor
    const vesterDeploy = await deploy("Vester", {
        from: admin.address,
        log: true,
        args: [
            mendi.address,
            admin.address,
            vestingAmount,
            vestingBegin,
            vestingEnd,
        ],
        contract: "contracts/VesterSale.sol:VesterSale",
    });
    const vester = await ethers.getContractAt(
        "VesterSale",
        vesterDeploy.address
    );

    const distributorDeploy = await deploy("Distributor", {
        from: admin.address,
        log: true,
        args: [mendi.address, vester.address, admin.address],
        contract: "contracts/OwnedDistributor.sol:OwnedDistributor",
    });
    const distributor = await ethers.getContractAt(
        "OwnedDistributor",
        distributorDeploy.address
    );
    if (
        (await vester.recipient()).toLowerCase() !=
        distributor.address.toLowerCase()
    ) {
        await (await vester.setRecipient(distributor.address)).wait(1);
    }

    // Bonus Distributor
    const bonusVesterDeploy = await deploy("BonusVester", {
        from: admin.address,
        log: true,
        args: [
            mendi.address,
            admin.address,
            bonusVestingAmount,
            vestingBegin,
            vestingEnd,
        ],
        contract: "contracts/VesterSale.sol:VesterSale",
    });
    const bonusVester = await ethers.getContractAt(
        "VesterSale",
        bonusVesterDeploy.address
    );

    const bonusDistributorDeploy = await deploy("BonusDistributor", {
        from: admin.address,
        log: true,
        args: [mendi.address, bonusVester.address, admin.address],
        contract: "contracts/OwnedDistributor.sol:OwnedDistributor",
    });
    const bonusDistributor = await ethers.getContractAt(
        "OwnedDistributor",
        bonusDistributorDeploy.address
    );
    if (
        (await bonusVester.recipient()).toLowerCase() !=
        bonusDistributor.address.toLowerCase()
    ) {
        await (
            await bonusVester.setRecipient(bonusDistributor.address)
        ).wait(1);
    }

    const liquidityGeneratorDeploy = await deploy("LiquidityGenerator", {
        from: admin.address,
        log: true,
        args: [
            [
                admin.address,
                mendi.address,
                addresses.usdc,
                addresses.msig,
                distributor.address,
                bonusDistributor.address,
                periodBegin,
                periodDuration,
                bonusDuration,
            ],
        ],
    });
    const liquidityGenerator = await ethers.getContractAt(
        "LiquidityGenerator",
        liquidityGeneratorDeploy.address
    );

    // Set the liquidity generator as the distributor's admin
    if (
        (await distributor.admin()).toLowerCase() !=
        liquidityGenerator.address.toLowerCase()
    ) {
        await (await distributor.setAdmin(liquidityGenerator.address)).wait(1);
    }
    if (
        (await bonusDistributor.admin()).toLowerCase() !=
        liquidityGenerator.address.toLowerCase()
    ) {
        await (
            await bonusDistributor.setAdmin(liquidityGenerator.address)
        ).wait(1);
    }

    // LGE Depositor
    const lgeDepositor = await deploy("LGEDepositor", {
        from: admin.address,
        log: true,
        args: [
            liquidityGenerator.address,
            addresses.vault,
            addresses.factory,
            mendi.address,
            addresses.usdc,
            addresses.vc,
        ],
        contract: "contracts/LGEDepositor.sol:LGEDepositor",
    });
    await (
        await liquidityGenerator._setReservesManager(lgeDepositor.address)
    ).wait(1);
};

const tags = ["liquidity-generator"];
export { tags };

export default func;
