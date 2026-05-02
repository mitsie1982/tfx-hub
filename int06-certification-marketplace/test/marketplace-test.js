const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Certification Marketplace", function () {
	it("onboards provider, creates course, and mints badge", async function () {
		const [owner, provider, learner] = await ethers.getSigners();
		const Badge = await ethers.getContractFactory("Badge");
		const badge = await Badge.deploy();
		await badge.deployed();

		const Marketplace = await ethers.getContractFactory("CertificationMarketplace");
		const market = await Marketplace.deploy(badge.address, 500);
		await market.deployed();
		// Set Marketplace as minter before transferring ownership
		await badge.setMinter(market.address, true);
		await badge.transferOwnership(market.address);
		expect(await badge.owner()).to.equal(market.address);
		await market.connect(owner).onboardProvider(provider.address, "Acme Bootcamp");
		await market.connect(provider).createCourse("Electrician Level 1", ethers.utils.parseEther("0.1"));
		const tx = await market.connect(provider).mintBadge(learner.address, 1, "ipfs://example-metadata");
		await tx.wait();
		expect(await badge.ownerOf(1)).to.equal(learner.address);
	});

	it("prevents non-provider from creating course", async function () {
		const [owner, provider, notProvider] = await ethers.getSigners();
		const Badge = await ethers.getContractFactory("Badge");
		const badge = await Badge.deploy();
		await badge.deployed();
		const Marketplace = await ethers.getContractFactory("CertificationMarketplace");
		const market = await Marketplace.deploy(badge.address, 500);
		await market.deployed();
		await badge.setMinter(market.address, true);
		await badge.transferOwnership(market.address);
		expect(await badge.owner()).to.equal(market.address);
		await expect(
			market.connect(notProvider).createCourse("Hacking 101", 1000)
		).to.be.revertedWith("not a provider");
	});

	it("prevents minting badge for inactive course", async function () {
		const [owner, provider, learner] = await ethers.getSigners();
		const Badge = await ethers.getContractFactory("Badge");
		const badge = await Badge.deploy();
		await badge.deployed();
		const Marketplace = await ethers.getContractFactory("CertificationMarketplace");
		const market = await Marketplace.deploy(badge.address, 500);
		await market.deployed();
		await badge.setMinter(market.address, true);
		await badge.transferOwnership(market.address);
		expect(await badge.owner()).to.equal(market.address);
		await market.connect(owner).onboardProvider(provider.address, "Acme Bootcamp");
		// No course created yet
		await expect(
			market.connect(owner).mintBadge(learner.address, 1, "ipfs://meta")
		).to.be.revertedWith("invalid course");
	});

	// Removed redundant pipeline burn test; isolated burn test below is sufficient.
	
	it("burns badge and updates state", async function () {
		const [owner, provider, learner] = await ethers.getSigners();
		const Badge = await ethers.getContractFactory("Badge");
		const badge = await Badge.deploy();
		await badge.deployed();
		// Mint badge directly before transferring ownership
		await badge.setMinter(owner.address, true);
		await badge.issueBadge(learner.address, "ipfs://meta");
		await badge.transferOwnership(owner.address); // keep owner for burn
		// burn badge
		await badge.connect(owner).burnBadge(1);
		await expect(badge.ownerOf(1)).to.be.revertedWith("ERC721: invalid token ID");
	});

	it("updates platform fee", async function () {
		const [owner, provider] = await ethers.getSigners();
		const Badge = await ethers.getContractFactory("Badge");
		const badge = await Badge.deploy();
		await badge.deployed();
		const Marketplace = await ethers.getContractFactory("CertificationMarketplace");
		const market = await Marketplace.deploy(badge.address, 500);
		await market.deployed();
		await badge.transferOwnership(market.address);
		await market.connect(owner).setPlatformFee(1000);
		expect(await market.platformFeeBasisPoints()).to.equal(1000);
	});
});
