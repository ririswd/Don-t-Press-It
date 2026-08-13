import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";
import { pad, toHex, type Hex } from "viem";

const INCO_EXECUTOR = "0x4b9911b0191B0b6a6eA8F2Ed562e20Cff5AC8624";

async function installIncoMock() {
  const artifact = await hre.artifacts.readArtifact("IncoLightningMock");
  await hre.network.provider.send("hardhat_setCode", [INCO_EXECUTOR, artifact.deployedBytecode]);
}

function attestation(handle: Hex, value: bigint) {
  return { handle, value: pad(toHex(value), { size: 32 }) };
}

describe("DontPressIt", function () {
  async function createStartedRoom(maxPlayers = 2) {
    await installIncoMock();
    const [host, player] = await hre.viem.getWalletClients();
    const game = await hre.viem.deployContract("DontPressIt");

    await game.write.createRoom([maxPlayers], { account: host.account });
    await game.write.joinRoom([1n], { account: player.account });
    await game.write.startGame([1n], { account: host.account });

    return { game, host, player };
  }

  it("creates a room with the host enrolled and a point-only starting pot", async function () {
    await installIncoMock();
    const [host] = await hre.viem.getWalletClients();
    const game = await hre.viem.deployContract("DontPressIt");

    await game.write.createRoom([4], { account: host.account });

    const room = await game.read.getRoom([1n]);
    expect(room[0].toLowerCase()).to.equal(host.account.address.toLowerCase());
    expect(room[1][0].toLowerCase()).to.equal(host.account.address.toLowerCase());
    expect(room[2]).to.equal(1); // playerCount
    expect(room[3]).to.equal(4); // maxPlayers
    expect(room[6]).to.equal(1000n); // points, never a token balance
    expect(await game.read.isPlayer([1n, host.account.address])).to.equal(true);
    expect(await game.read.playerIndex([1n, host.account.address])).to.equal(1);
  });

  it("only accepts room sizes from two to four players", async function () {
    await installIncoMock();
    const [host] = await hre.viem.getWalletClients();
    const game = await hre.viem.deployContract("DontPressIt");

    await expect(game.write.createRoom([1], { account: host.account }))
      .to.be.rejectedWith("Room must have 2-4 players");
    await expect(game.write.createRoom([5], { account: host.account }))
      .to.be.rejectedWith("Room must have 2-4 players");
  });

  it("enforces joining rules and keeps player indices one-based", async function () {
    await installIncoMock();
    const [host, player, third] = await hre.viem.getWalletClients();
    const game = await hre.viem.deployContract("DontPressIt");

    await expect(game.write.joinRoom([99n], { account: player.account }))
      .to.be.rejectedWith("Room does not exist");

    await game.write.createRoom([2], { account: host.account });
    await game.write.joinRoom([1n], { account: player.account });

    expect(await game.read.playerIndex([1n, player.account.address])).to.equal(2);
    await expect(game.write.joinRoom([1n], { account: player.account }))
      .to.be.rejectedWith("Already joined");
    await expect(game.write.joinRoom([1n], { account: third.account }))
      .to.be.rejectedWith("Room is full");
  });

  it("requires the host and at least two players before starting", async function () {
    await installIncoMock();
    const [host, player] = await hre.viem.getWalletClients();
    const game = await hre.viem.deployContract("DontPressIt");

    await game.write.createRoom([2], { account: host.account });
    await expect(game.write.startGame([1n], { account: player.account }))
      .to.be.rejectedWith("Only host");
    await expect(game.write.startGame([1n], { account: host.account }))
      .to.be.rejectedWith("Need at least 2 players");

    await game.write.joinRoom([1n], { account: player.account });
    const beforeStart = await time.latest();
    await game.write.startGame([1n], { account: host.account });
    const room = await game.read.getRoom([1n]);

    expect(room[4]).to.equal(1); // round
    expect(room[7]).to.equal(true); // started
    expect(Number(await game.read.getRoundDeadline([1n]))).to.be.greaterThan(beforeStart);
    await expect(game.write.joinRoom([1n], { account: player.account }))
      .to.be.rejectedWith("Game already started");
  });

  it("unblocks an abandoned round and allows the same room to continue", async function () {
    const { game, host, player } = await createStartedRoom();

    const deadline = await game.read.getRoundDeadline([1n]);
    await time.increaseTo(Number(deadline) + 1);

    await game.write.expireRound([1n], { account: player.account });
    const expired = await game.read.getRoom([1n]);
    expect(expired[9]).to.equal(true); // roundFinalized
    expect(expired[10]).to.equal(false); // ended

    await game.write.nextRound([1n], { account: host.account });
    const next = await game.read.getRoom([1n]);
    expect(next[4]).to.equal(2); // round
    expect(next[5]).to.equal(0); // submittedCount
    expect(next[9]).to.equal(false); // roundFinalized
  });

  it("does not let anyone expire a round before its deadline", async function () {
    const { game, player } = await createStartedRoom();

    await expect(game.write.expireRound([1n], { account: player.account }))
      .to.be.rejectedWith("Round still active");
  });

  it("keeps choices private until every player submits, then finalizes a sole winner", async function () {
    const { game, host, player } = await createStartedRoom();

    await expect(game.write.submitChoice([1n, "0x01"], { account: host.account, value: 0n }))
      .to.be.rejectedWith("Inco fee not paid");

    await game.write.submitChoice([1n, "0x01"], { account: host.account, value: 1n });
    expect(await game.read.hasSubmitted([1n, host.account.address])).to.equal(true);
    expect((await game.read.getRoom([1n]))[8]).to.equal(false); // revealReady

    await game.write.submitChoice([1n, "0x00"], { account: player.account, value: 1n });
    const roomBeforeFinalization = await game.read.getRoom([1n]);
    const [pressCountHandle, winnerHandle] = await game.read.getRoundHandles([1n]);
    expect(roomBeforeFinalization[8]).to.equal(true); // revealReady

    await game.write.finalizeRound(
      [1n, attestation(pressCountHandle, 1n), [], attestation(winnerHandle, 1n), []],
      { account: host.account },
    );

    const result = await game.read.getRoom([1n]);
    expect(result[9]).to.equal(true); // roundFinalized
    expect(result[10]).to.equal(true); // ended
    expect(result[11].toLowerCase()).to.equal(host.account.address.toLowerCase());
  });

  it("grows the point pot when nobody presses and starts a clean next round", async function () {
    const { game, host, player } = await createStartedRoom();

    await game.write.submitChoice([1n, "0x00"], { account: host.account, value: 1n });
    await game.write.submitChoice([1n, "0x00"], { account: player.account, value: 1n });
    const [pressCountHandle, winnerHandle] = await game.read.getRoundHandles([1n]);
    await game.write.finalizeRound(
      [1n, attestation(pressCountHandle, 0n), [], attestation(winnerHandle, 0n), []],
      { account: player.account },
    );

    const finalized = await game.read.getRoom([1n]);
    expect(finalized[6]).to.equal(1500n);
    expect(finalized[10]).to.equal(false);

    await game.write.nextRound([1n], { account: host.account });
    expect(await game.read.hasSubmitted([1n, host.account.address])).to.equal(false);
    expect(await game.read.hasSubmitted([1n, player.account.address])).to.equal(false);
  });

  it("does not end the operation when more than one player presses", async function () {
    const { game, host, player } = await createStartedRoom();

    await game.write.submitChoice([1n, "0x01"], { account: host.account, value: 1n });
    await game.write.submitChoice([1n, "0x01"], { account: player.account, value: 1n });
    const [pressCountHandle, winnerHandle] = await game.read.getRoundHandles([1n]);
    await game.write.finalizeRound(
      [1n, attestation(pressCountHandle, 2n), [], attestation(winnerHandle, 0n), []],
      { account: host.account },
    );

    const result = await game.read.getRoom([1n]);
    expect(result[9]).to.equal(true);
    expect(result[10]).to.equal(false);
    expect(result[6]).to.equal(1000n);
  });
});
