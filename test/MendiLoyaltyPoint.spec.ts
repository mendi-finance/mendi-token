import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract } from "ethers";
import { deployments, ethers } from "hardhat";
import { getImpersonatedSigner } from "./_utils";

const mlpFixture = deployments.createFixture(
    async ({ deployments }, options) => {
        await deployments.fixture(undefined, {
            keepExistingDeployments: true,
        });

        const [deployer, minter] = await ethers.getSigners();

        const mlpDeploy = await deployments.get("MendiLoyaltyPoint");
        const mlp = await ethers.getContractAt(
            "MendiLoyaltyPoint",
            mlpDeploy.address
        );

        return [deployer, minter, mlp] as const;
    }
);

describe.only("Mendi Loyalty Point", function () {
    let deployer: SignerWithAddress,
        mintSigner: SignerWithAddress,
        mlp: Contract;

    this.beforeEach(async function () {
        [deployer, mintSigner, mlp] = await mlpFixture();
    });

    it("Should deploy properly", async function () {
        expect(mlp.address).to.be.properAddress;
    });

    describe("Admin Actions", async function () {
        it("Should set mint signer", async function () {
            const mintSignerRole = await mlp.MINT_SIGNER_ROLE();

            await expect(
                mlp
                    .connect(deployer)
                    .grantRole(mintSignerRole, mintSigner.address)
            ).to.not.reverted;

            expect(
                await mlp.hasRole(mintSignerRole, mintSigner.address)
            ).to.equal(true);
        });
    });

    describe("Mint Actions", async function () {
        let userData = [
            "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
            ethers.utils.parseEther("1.321"),
        ] as const;

        let mintSignerRole: string;
        let user: SignerWithAddress;

        this.beforeEach(async function () {
            mintSignerRole = await mlp.MINT_SIGNER_ROLE();
            user = await getImpersonatedSigner(userData[0]);

            await expect(
                mlp
                    .connect(deployer)
                    .grantRole(mintSignerRole, mintSigner.address)
            ).to.not.reverted;
        });

        it("Should revert on wrong signature", async function () {
            const fakeSignature = deployer.signMessage("fakeSig");

            await expect(
                mlp
                    .connect(user)
                    .mintWithPermit(userData[0], userData[1], fakeSignature)
            ).to.revertedWith("MLP: not permitted");
        });

        it("Should mint on correct signature", async function () {
            var message = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(
                    ["address", "uint256"],
                    userData
                )
            );
            var signature = await mintSigner.signMessage(
                ethers.utils.arrayify(message)
            );

            await expect(
                mlp
                    .connect(deployer)
                    .grantRole(mintSignerRole, mintSigner.address)
            ).to.not.reverted;

            await expect(
                mlp
                    .connect(user)
                    .mintWithPermit(userData[0], userData[1], signature)
            ).to.not.reverted;
        });
    });
});
