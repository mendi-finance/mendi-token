import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import hre, { ethers } from "hardhat";
import { erc20TokenFixture, lgeFixture } from "./_fixtures";
import { getImpersonatedSigner, getNetworkConfigValue } from "./_utils";

describe.only("Deneme Test", function () {
    let deployer: SignerWithAddress,
        mendi: Contract,
        mendiAmount: BigNumber,
        usdc: Contract,
        usdcWhale: SignerWithAddress,
        usdcAmount: BigNumber;

    let liquidityGenerator: Contract, lgeDepositor: Contract;

    let periodBegin: bigint, periodEnd: bigint, bonusEnd: bigint;

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

        await (
            await usdc
                .connect(usdcWhale)
                .transfer(
                    deployer.address,
                    await usdc.balanceOf(usdcWhale.address)
                )
        ).wait(1);

        mendiAmount = await mendi.balanceOf(deployer.address);
        usdcAmount = await usdc.balanceOf(deployer.address);

        [liquidityGenerator, lgeDepositor] = await lgeFixture();
        periodBegin = BigInt(await liquidityGenerator.periodBegin());
        periodEnd = BigInt(await liquidityGenerator.periodEnd());
        bonusEnd = BigInt(await liquidityGenerator.bonusEnd());
    });

    it("Test", async function () {
        const mendiDeposit = ethers.utils.parseEther("2500000");
        const oneUSDC = ethers.utils.parseUnits("1", 6);
        const tenUSDC = ethers.utils.parseUnits("10", 6);

        await expect(
            usdc.approve(
                liquidityGenerator.address,
                ethers.constants.MaxUint256
            )
        ).to.not.reverted;

        // revert before period begin
        await expect(liquidityGenerator.deposit(oneUSDC)).to.revertedWith(
            "LiquidityGenerator: TOO_SOON"
        );

        // go to lge begin
        await time.increaseTo(periodBegin);

        // deposit 1 usdc revert < 10usdc
        await expect(liquidityGenerator.deposit(oneUSDC)).to.revertedWith(
            "LiquidityGenerator: INVALID_VALUE"
        );

        // success on > 10usdc
        await expect(liquidityGenerator.deposit(tenUSDC)).to.not.reverted;

        const totalShares = await liquidityGenerator.distributorTotalShares();
        expect(totalShares).eq(tenUSDC);

        // revert finalize
        await expect(liquidityGenerator.finalize()).to.revertedWith(
            "LiquidityGenerator: TOO_SOON"
        );

        // go to lge end
        await time.increaseTo(periodEnd);

        // deposit after end
        await expect(liquidityGenerator.deposit(tenUSDC)).to.revertedWith(
            "LiquidityGenerator: TOO_LATE"
        );

        // revert lp deposit before lge
        await expect(lgeDepositor.deposit()).to.revertedWith(
            "LGEDepositor: NOT_FINALIZED"
        );

        // finalize
        await expect(liquidityGenerator.finalize()).to.not.reverted;

        // revert because no mendi on depositor
        await expect(lgeDepositor.deposit()).to.reverted;

        console.log((await mendi.balanceOf(deployer.address)).toString());
        // send mendi
        await expect(mendi.transfer(lgeDepositor.address, mendiDeposit)).to.not
            .reverted;

        // success deposit
        await expect(lgeDepositor.deposit()).to.not.reverted;
    });
});
