import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";

describe("DontPressIt timeout safety", function () {
  it("unblocks an abandoned round and allows the same room to continue", async function () {
    const [host, player] = await hre.viem.getWalletClients();
    const game = await hre.viem.deployContract("DontPressIt");

    await game.write.createRoom([2], { account: host.account });
    await game.write.joinRoom([1n], { account: player.account });
    await game.write.startGame([1n], { account: host.account });

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
    const [host, player] = await hre.viem.getWalletClients();
    const game = await hre.viem.deployContract("DontPressIt");

    await game.write.createRoom([2], { account: host.account });
    await game.write.joinRoom([1n], { account: player.account });
    await game.write.startGame([1n], { account: host.account });

    await expect(game.write.expireRound([1n], { account: player.account }))
      .to.be.rejectedWith("Round still active");
  });
});
