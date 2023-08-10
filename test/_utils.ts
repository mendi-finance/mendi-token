import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { ethers, network } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const soMath = {
    clamp(num: number, min: number, max: number) {
        return num <= min ? min : num >= max ? max : num;
    },
};

const getTokenContract = async (opts: {
    admin: SignerWithAddress;
    mintAmount?: BigNumber;
    existingAddress?: string;
    whaleAddress?: string;
    decimals?: string;
}) => {
    if (opts.existingAddress) {
        const token = await ethers.getContractAt(
            "MockERC20Token",
            opts.existingAddress
        );

        if (opts.whaleAddress) {
            const whale = await getImpersonatedSigner(opts.whaleAddress);
            const balance = await token.balanceOf(whale.address);

            await (
                await token.connect(whale).transfer(opts.admin.address, balance)
            ).wait(1);
        }

        return token;
    } else {
        const Token = await ethers.getContractFactory("MockERC20Token");
        const token = await Token.connect(opts.admin).deploy(
            opts.mintAmount || ethers.utils.parseEther("100000000"),
            18
        );
        return token;
    }
};

const getImpersonatedSigner = async (account: string) => {
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [account],
    });
    return ethers.getSigner(account);
};

const getNetworkConfigValue = (hre: HardhatRuntimeEnvironment, key: string) => {
    const companionNetwork =
        hre.companionNetworks?.["mainnet"]?.deployments?.getNetworkName();

    const addresses =
        hre.network.config?.[key] ??
        (companionNetwork
            ? hre.config.networks[companionNetwork]
            : undefined)?.[key];

    return addresses;
};

export {
    getImpersonatedSigner,
    getNetworkConfigValue,
    getTokenContract,
    soMath,
};
