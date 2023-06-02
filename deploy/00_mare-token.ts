import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {
        deployments: { deploy },
        getNamedAccounts,
    } = hre;

    const { adminAccount } = await getNamedAccounts();

    const mendi = await deploy("Mendi", {
        from: adminAccount,
        log: true,
        args: [adminAccount],
    });
};

const tags = ["mendi-token"];
export { tags };

export default func;
