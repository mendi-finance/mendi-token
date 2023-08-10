import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import hre, { ethers } from "hardhat";
import { getImpersonatedSigner, getTokenContract, soMath } from "./_utils";

const mantissa = ethers.utils.parseEther("1");
const mendiAmount = ethers.utils.parseEther("2500000");
const vestingAmount = ethers.utils.parseEther("3200000");
const bonusVestingAmount = ethers.utils.parseEther("300000");
const initial = 5000;
const periodDuration = 3 * 24 * 60 * 60; // 3 days
const bonusDuration = 1 * 24 * 60 * 60; // 1 day
const vestingBeginGap = 30 * 60; // 30 minutes
const vestingDuration = 1 * 360 * 24 * 60 * 60; // 1 year

const PERIOD_BEGIN_OFFSET = 30 * 60; // 30 minutes

interface DeployFixture {
    admin: SignerWithAddress;
    reservesManager: SignerWithAddress;
    mendi: Contract;
    usdc: Contract;
    distributor: Contract;
    vester: Contract;
    bonusDistributor: Contract;
    bonusVester: Contract;
    periodBegin: number;
    periodEnd: number;
    vestingBegin: number;
    vestingEnd: number;
    liquidityGenerator: Contract;
}

describe("Liquidity Generator", function () {
    let deployment: DeployFixture;

    let participants: {
        address: string;
        signer: SignerWithAddress;
        balance: BigNumber;
        bonusDeposit: BigNumber;
        deposit: BigNumber;
    }[] = [];

    const fixture = async () => {
        // Accounts
        const [admin, reservesManager] = await ethers.getSigners();

        const addresses = hre.network.config.addresses;
        if (!addresses) throw new Error("No addresses in config");

        // Times
        const periodBegin =
            (await ethers.provider.getBlock("latest")).timestamp +
            PERIOD_BEGIN_OFFSET;
        const periodEnd = periodBegin + periodDuration;
        const vestingBegin = periodEnd + vestingBeginGap;
        const vestingEnd = vestingBegin + vestingDuration;

        // Mendi
        const mendi = await getTokenContract({
            admin: admin,
            mintAmount: ethers.utils.parseEther("100000000"),
            decimals: "18",
        });

        // USDC
        const usdc = await getTokenContract({
            admin: admin,
            mintAmount: ethers.utils.parseEther("100000"),
            existingAddress: addresses.usdc,
            whaleAddress: addresses.usdcWhale,
            decimals: "6",
        });

        // generate participants and send some usdc to participants from admin
        const participantCount = 2;
        participants = await makeParticipants(admin, participantCount);
        await Promise.all(
            participants.map(async participant => {
                await expect(
                    usdc.transfer(participant.address, participant.balance)
                ).not.to.reverted;
            })
        );

        // Distributor
        const Vester = await ethers.getContractFactory("VesterSale");
        const vester = await Vester.deploy(
            mendi.address,
            admin.address,
            vestingAmount,
            vestingBegin,
            vestingEnd
        );

        const Distributor = await ethers.getContractFactory("OwnedDistributor");
        const distributor = await Distributor.deploy(
            mendi.address,
            vester.address,
            admin.address
        );
        await (await vester.setRecipient(distributor.address)).wait(1);

        // Bonus Distributor
        const BonusVester = await ethers.getContractFactory("VesterSale");
        const bonusVester = await BonusVester.deploy(
            mendi.address,
            admin.address,
            bonusVestingAmount,
            vestingBegin,
            vestingEnd
        );

        const BonusDistributor = await ethers.getContractFactory(
            "OwnedDistributor"
        );
        const bonusDistributor = await BonusDistributor.deploy(
            mendi.address,
            bonusVester.address,
            admin.address
        );
        await (
            await bonusVester.setRecipient(bonusDistributor.address)
        ).wait(1);

        // Liquidity Generator
        const LiquidityGenerator = await ethers.getContractFactory(
            "LiquidityGenerator"
        );
        const liquidityGenerator = await LiquidityGenerator.deploy([
            admin.address,
            mendi.address,
            usdc.address,
            reservesManager.address,
            distributor.address,
            bonusDistributor.address,
            periodBegin,
            periodDuration,
            bonusDuration,
        ]);

        // Add Mendi to the liquidity generator
        await (
            await mendi.transfer(liquidityGenerator.address, mendiAmount)
        ).wait(1);

        // Add Mendi to Vester
        await (await mendi.transfer(vester.address, vestingAmount)).wait(1);

        // Add Mendi to Bonus Vester
        await (
            await mendi.transfer(bonusVester.address, bonusVestingAmount)
        ).wait(1);

        // Set the liquidity generator as the distributor's admin
        await (await distributor.setAdmin(liquidityGenerator.address)).wait(1);
        await (
            await bonusDistributor.setAdmin(liquidityGenerator.address)
        ).wait(1);

        return {
            admin,
            reservesManager,
            mendi,
            usdc,
            distributor,
            vester,
            bonusDistributor,
            bonusVester,
            periodBegin,
            periodEnd,
            vestingBegin,
            vestingEnd,
            liquidityGenerator,
        };
    };

    this.beforeEach("deploy fixture", async function () {
        deployment = await loadFixture(fixture);
    });

    it("Should deploy the liquidity generation contract", async function () {
        const { liquidityGenerator } = deployment;

        expect(liquidityGenerator.address).to.be.properAddress;
    });

    it("Should revert sending ether", async function () {
        const { admin, liquidityGenerator } = deployment;

        await expect(
            admin.sendTransaction({
                to: liquidityGenerator.address,
                value: ethers.utils.parseEther("1"),
            })
        ).to.be.revertedWith("LiquidityGenerator: BAD_CALL");
    });

    describe("Admin Functions", function () {
        it("Should allow the admin to set the new admin", async function () {
            const { liquidityGenerator, admin, reservesManager } = deployment;

            await expect(
                liquidityGenerator

                    .connect(admin)
                    ._setAdmin(reservesManager.address)
            ).not.to.be.reverted;

            expect(await liquidityGenerator.pendingAdmin()).to.equal(
                reservesManager.address
            );

            await expect(
                liquidityGenerator.connect(reservesManager)._acceptAdmin()
            ).not.to.be.reverted;

            expect(await liquidityGenerator.admin()).to.equal(
                reservesManager.address
            );
        });

        it("Should not allow the admin to set the new admin to the zero address", async function () {
            const { liquidityGenerator, admin } = deployment;

            await expect(
                liquidityGenerator
                    .connect(admin)
                    ._setAdmin(ethers.constants.AddressZero)
            ).to.be.revertedWith("LiquidityGenerator: INVALID_ADDRESS");
        });

        it("Should not allow a non-admin to set the new admin", async function () {
            const { liquidityGenerator, reservesManager } = deployment;

            await expect(
                liquidityGenerator
                    .connect(reservesManager)
                    ._setAdmin(reservesManager.address)
            ).to.be.revertedWith("LiquidityGenerator: FORBIDDEN");
        });

        it("Should allow the admin to set the reserves manager", async function () {
            const { liquidityGenerator, admin, reservesManager } = deployment;

            await expect(
                liquidityGenerator
                    .connect(admin)
                    ._setReservesManager(reservesManager.address)
            ).not.to.be.reverted;

            expect(await liquidityGenerator.reservesManager()).to.equal(
                reservesManager.address
            );
        });

        it("Should not allow the admin to set the reserves manager to the zero address", async function () {
            const { liquidityGenerator, admin } = deployment;

            await expect(
                liquidityGenerator
                    .connect(admin)
                    ._setReservesManager(ethers.constants.AddressZero)
            ).to.be.revertedWith("LiquidityGenerator: INVALID_ADDRESS");
        });

        it("Should not allow a non-admin to set the reserves manager", async function () {
            const { liquidityGenerator, reservesManager } = deployment;

            await expect(
                liquidityGenerator
                    .connect(reservesManager)
                    ._setReservesManager(reservesManager.address)
            ).to.be.revertedWith("LiquidityGenerator: FORBIDDEN");
        });
    });

    describe("Before Event Start", function () {
        this.beforeEach(async () => {
            const { periodBegin } = deployment;
            await time.increaseTo(periodBegin - 1000);
        });

        it("Should not allow to deposit", async function () {
            for (const participant of participants) {
                await expect(
                    depositParticipant(
                        participant.signer,
                        deployment,
                        participant.deposit
                    )
                ).to.be.revertedWith("LiquidityGenerator: TOO_SOON");
            }
        });

        it("Should not allow to finalize", async function () {
            const { liquidityGenerator } = deployment;

            await expect(liquidityGenerator.finalize()).to.be.revertedWith(
                "LiquidityGenerator: TOO_SOON"
            );
        });
    });

    describe("During Event", function () {
        this.beforeEach(async () => {
            const { periodBegin } = deployment;
            await time.increaseTo(periodBegin + 10);
        });

        it("Should deposit by participants", async function () {
            const { liquidityGenerator, periodBegin, usdc } = deployment;
            await time.increaseTo(periodBegin);

            for (const participant of participants) {
                await expect(
                    depositParticipant(
                        participant.signer,
                        deployment,
                        participant.bonusDeposit
                    )
                ).not.to.reverted;
            }

            // end of bonus period
            await time.increaseTo(periodBegin + bonusDuration + 10);

            for (const participant of participants) {
                await expect(
                    depositParticipant(
                        participant.signer,
                        deployment,
                        participant.deposit.sub(participant.bonusDeposit)
                    )
                ).not.to.reverted;
            }

            // Check participant shares
            for (const participant of participants) {
                const bonusDeposited = (
                    await liquidityGenerator.bonusDistributorRecipients(
                        participant.address
                    )
                ).shares;
                const normalDeposited = (
                    await liquidityGenerator.distributorRecipients(
                        participant.address
                    )
                ).shares;

                expect(bonusDeposited).to.equal(participant.bonusDeposit);
                expect(normalDeposited).to.equal(participant.deposit);
            }

            // Check total shares
            const totalBonusDeposit = participants.reduce(
                (acc, participant) => acc.add(participant.bonusDeposit),
                BigNumber.from(0)
            );
            const totalDeposit = participants.reduce(
                (acc, participant) => acc.add(participant.deposit),
                BigNumber.from(0)
            );
            expect(
                await liquidityGenerator.bonusDistributorTotalShares()
            ).to.equal(totalBonusDeposit);
            expect(await liquidityGenerator.distributorTotalShares()).to.equal(
                totalDeposit
            );
        });

        it("Should not allow low deposit", async function () {
            await time.increaseTo(deployment.periodBegin);

            for (const participant of participants) {
                await expect(
                    depositParticipant(
                        participant.signer,
                        deployment,
                        BigNumber.from(1)
                    )
                ).to.be.revertedWith("LiquidityGenerator: INVALID_VALUE");
            }
        });

        it("Should not allow to finalize", async function () {
            const { liquidityGenerator } = deployment;

            await expect(liquidityGenerator.finalize()).to.be.revertedWith(
                "LiquidityGenerator: TOO_SOON"
            );
        });
    });

    describe("After Event End", function () {
        this.beforeEach(async () => {
            const { periodBegin, periodEnd } = deployment;
            await time.increaseTo(periodBegin + 1000);

            // Participates
            for (const participant of participants) {
                await depositParticipant(
                    participant.signer,
                    deployment,
                    participant.deposit
                );
            }

            await time.increaseTo(periodEnd + 1000);
        });

        it("Should not allow to deposit", async function () {
            for (const participant of participants) {
                await expect(
                    depositParticipant(participant.signer, deployment)
                ).to.be.revertedWith("LiquidityGenerator: TOO_LATE");
            }
        });

        it("Should finalize", async function () {
            const { liquidityGenerator, usdc, reservesManager } = deployment;

            await expect(liquidityGenerator.finalize()).not.to.reverted;

            const totalDeposit = participants.reduce(
                (acc, participant) => acc.add(participant.deposit),
                BigNumber.from(0)
            );

            expect(await usdc.balanceOf(reservesManager.address)).to.equal(
                totalDeposit
            );

            // should not allow to finalize twice
            await expect(liquidityGenerator.finalize()).to.be.revertedWith(
                "LiquidityGenerator: FINALIZED"
            );
        });
    });
});

const depositParticipant = async (
    participant: SignerWithAddress,
    deployment: {
        usdc: Contract;
        liquidityGenerator: Contract;
    },
    depositAmount?: BigNumber
) => {
    const { usdc, liquidityGenerator } = deployment;
    const amount = depositAmount ?? (await usdc.balanceOf(participant.address));
    await expect(
        usdc.connect(participant).approve(liquidityGenerator.address, amount)
    ).not.to.reverted;
    return liquidityGenerator.connect(participant).deposit(amount);
};

const makeParticipants = async (admin: SignerWithAddress, count: number) => {
    const participants: any[] = [];

    for (let i = 0; i < count; i++) {
        const participant = ethers.Wallet.createRandom();
        const signer = await getImpersonatedSigner(participant.address);

        const balance = 1000 + Math.random() * 100;
        const deposit = balance * soMath.clamp(Math.random(), 0.1, 0.5);
        const bonusDeposit = deposit * Math.random();

        const balanceEther = balance.toFixed(6);
        const depositEther = deposit.toFixed(6);
        const bonusDepositEther = bonusDeposit.toFixed(6);

        const balanceWei = ethers.utils.parseUnits(balanceEther, 6);
        const depositWei = ethers.utils.parseUnits(depositEther, 6);
        const bonusDepositWei = ethers.utils.parseUnits(bonusDepositEther, 6);

        participants.push({
            address: participant.address,
            signer: signer,
            balance: balanceWei,
            deposit: depositWei,
            bonusDeposit: bonusDepositWei,
        });
    }

    // funding ether
    await Promise.all(
        participants.map(
            async p =>
                await expect(
                    admin.sendTransaction({
                        to: p.address,
                        value: ethers.utils.parseEther("1"),
                    })
                ).not.to.reverted
        )
    );

    return participants;
};
