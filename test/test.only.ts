import { ethers } from "hardhat";
import { erc20TokenFixture } from "./_fixtures";
import { getImpersonatedSigner, getNetworkConfigValue } from "./_utils";

describe.only("Deneme Test", function () {
    let deployer, mendi, usdc, usdcWhale;

    this.beforeEach(async function () {
        const addresses = getNetworkConfigValue(hre, "addresses");
        if (!addresses) throw new Error("No addresses in config");

        [deployer] = await ethers.getSigners();

        [mendi] = await erc20TokenFixture({
            contractKey: "Mendi",
            contractArgs: [deployer.address],
        });

        usdc = await ethers.getContractAt(
            "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
            addresses.usdc
        );

        usdcWhale = await getImpersonatedSigner(addresses.usdcWhale);
    });
});
