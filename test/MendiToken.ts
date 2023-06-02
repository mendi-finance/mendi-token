import { expect } from "chai";
import { ethers } from "hardhat";

describe("Mendi Token", function () {
    it("Should mint 100m tokens to given accounts", async function () {
        const totalSupply = ethers.utils.parseEther("100000000");
        const account = "0x1110000000000000000000000000000000000000";

        const Mendi = await ethers.getContractFactory("Mendi");
        const mendi = await Mendi.deploy(account);

        expect(await mendi.totalSupply()).to.equal(totalSupply);
        expect(await mendi.balanceOf(account)).to.equal(totalSupply);
    });
});
