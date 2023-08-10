import { expect } from "chai";
import { ethers } from "hardhat";

import { mendiTokenFixture, teamVestingFixture } from "../_fixtures";

describe.skip("Owned Distributor Live", function () {
    const rewardPerSecond = ethers.utils.parseEther("100000000");

    describe("Constructor", function () {
        it("Should set the correct values", async function () {
            const [mendiToken] = await mendiTokenFixture();
            const { teamVester, teamDistributor } = await teamVestingFixture();

            expect(await teamDistributor.mendi()).to.equal(mendiToken.address);
            expect(await teamDistributor.claimable()).to.equal(
                teamVester.address
            );
        });
    });

    describe("Claiming", function () {
        let deployment: any;

        beforeEach(async function () {
            deployment = await teamVestingFixture();
        });

        it("Should allow a user to claim their share", async function () {
            const { distributor, mendi } = deployment;

            const [user] = await ethers.getSigners();
        });
    });
});
