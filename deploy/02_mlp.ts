import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {
        deployments: { deploy },
        getNamedAccounts,
    } = hre;

    const { adminAccount } = await getNamedAccounts();

    const mlp = await deploy("MendiLoyaltyPoint", {
        from: adminAccount,
        log: true,
        args: [],
    });
};

const tags = ["mlp"];
export { tags };

export default func;
