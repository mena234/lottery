import { assert, expect } from "chai";
import { developmentChains, networkConfig } from "../../helper-hardhat-config";
import { network, ethers, deployments } from "hardhat";

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let deployer: any,
              chainId: keyof typeof networkConfig,
              raffle: any,
              vrfCoordinatorV2Mock: any,
              raffleEnteranceFee: any,
              interval: any;

          beforeEach(async function () {
              deployer = await ethers.provider.getSigner();
              chainId = network.config.chainId as 31337 | 11155111;
              await deployments.fixture(["all"]); // deploy with tags
              raffle = await ethers.getContractAt(
                  "Raffle",
                  (
                      await deployments.get("Raffle")
                  ).address,
                  deployer
              );
              vrfCoordinatorV2Mock = await ethers.getContractAt(
                  "VRFCoordinatorV2Mock",
                  (
                      await deployments.get("VRFCoordinatorV2Mock")
                  ).address,
                  deployer
              );
              raffleEnteranceFee = await raffle.getEnteranceFee();
              interval = await raffle.getInterval();
          });

          describe("constructor", function () {
              it("initializes the raffle correctly", async function () {
                  const raffleState = await raffle.getRaffleState();
                  assert.equal(raffleState.toString(), "0");
                  assert.equal(
                      interval.toString(),
                      networkConfig[chainId].interval
                  );
              });
          });

          describe("EnterRaffle", function () {
              it("reverts when you don't pay enough", async function () {
                  await expect(
                      raffle.enterRaffle()
                  ).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__NotEnoughETHEntered"
                  );
              });

              it("records player when they enter", async function () {
                  await raffle.enterRaffle({
                      value: raffleEnteranceFee,
                  });
                  const playerFromContract = await raffle.getPlayer(0);
                  assert.equal(playerFromContract, deployer.address);
              });

              it("emits event on enter", async function () {
                  await expect(
                      raffle.enterRaffle({
                          value: raffleEnteranceFee,
                      })
                  ).to.emit(raffle, "RaffleEnter");
              });

              it("doesnt allow enterance when raffle is calculating", async function () {
                  await raffle.enterRaffle({ value: raffleEnteranceFee });
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
                  // We pretent to be a Chainlink Keeper
                  await raffle.performUpkeep("0x");
                  await expect(
                      raffle.enterRaffle({
                          value: raffleEnteranceFee,
                      })
                  ).to.be.revertedWithCustomError(raffle, "Raffle_NotOpen");
              });
          });

          describe("checkUpkeep", function () {
              it("returns false if people haven't sent any ETH", async function () {
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall(
                      "0x"
                  );
                  assert(!upkeepNeeded);
              });

              it("returns false raffle isn't open", async function () {
                  await raffle.enterRaffle({ value: raffleEnteranceFee });
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
                  await raffle.performUpkeep("0x");
                  const raffleState = await raffle.getRaffleState();
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall(
                      "0x"
                  );
                  assert.equal(raffleState.toString(), "1");
                  assert.equal(upkeepNeeded, false);
              });

              it("returns false if enough time hasn't passed", async function () {
                  await raffle.enterRaffle({ value: raffleEnteranceFee });
                  console.log(Number(interval) - 1);
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) - 5,
                  ]);
                  await network.provider.send("evm_mine", []);
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall(
                      "0x"
                  );
                  console.log(upkeepNeeded);
                  assert(!upkeepNeeded);
              });

              it("returns true if enough time has passed, has players, eth, and is open", async function () {
                  await raffle.enterRaffle({ value: raffleEnteranceFee });
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
                  const { upkeepNeeded } = await raffle.checkUpkeep.staticCall(
                      "0x"
                  );
                  assert(upkeepNeeded);
              });
          });

          describe("performUpkeep", function () {
              it("it can only run if checkupkeep is true", async function () {
                  await raffle.enterRaffle({ value: raffleEnteranceFee });
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
                  const tx = await raffle.performUpkeep("0x");
                  assert(tx);
              });

              it("reverts when checkupkeep is false", async function () {
                  await expect(
                      raffle.performUpkeep("0x")
                  ).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__UpkeepNotNeeded"
                  );
              });

              it("update the raffle state, emits an event, and calls the vrf coordinator", async function () {
                  await raffle.enterRaffle({ value: raffleEnteranceFee });
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
                  const txResponse = await raffle.performUpkeep("0x");
                  const txReceipt = await txResponse.wait(1);
                  const requestId = txReceipt.logs[1].args.requestId;
                  const raffleState = await raffle.getRaffleState();
                  assert(Number(requestId) > 0);
                  assert(raffleState.toString(), "1");
              });
          });

          describe("fulfillRandomWords", function () {
              beforeEach(async function () {
                  await raffle.enterRaffle({ value: raffleEnteranceFee });
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
              });
              it("can only be called after performUpkeep", async function () {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(
                          0,
                          await raffle.getAddress()
                      )
                  ).to.be.reverted;
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(
                          1,
                          await raffle.getAddress()
                      )
                  ).to.be.reverted;
              });

              it("picks a winner, resets the lottery, and sends money", async function () {
                  const additionalEnters = 3;
                  const startingAccountIndex = 1;
                  const accounts = await ethers.getSigners();
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEnters;
                      i++
                  ) {
                      const accountConnectedRaffle = raffle.connect(
                          accounts[i]
                      );
                      await accountConnectedRaffle.enterRaffle({
                          value: raffleEnteranceFee,
                      });
                  }
                  await new Promise(async function (resolve: any, reject: any) {
                      console.log("run here.");
                      //   Here we listen to the WinnerPicked event before call the fulfillRandomWords function
                      //   Because if we call the function first and the event get fired before listen to it, the listener
                      //   will never be resolved.
                      raffle.once("WinnerPicked", async function () {
                          try {
                              const recentWinner =
                                  await raffle.getRecentWinner();
                              console.log(recentWinner);
                              console.log(accounts[0].address);
                              console.log(accounts[1].address);
                              console.log(accounts[2].address);
                              console.log(accounts[3].address);
                              const raffleState = await raffle.getRaffleState();
                              const endingTimeStamp =
                                  await raffle.getLatestTimeStamp();
                              const numPlayer =
                                  await raffle.getNumberOfPlayers();
                              const winnerEndingBalance =
                                  await ethers.provider.getBalance(
                                      accounts[1].address
                                  );
                              assert.equal(numPlayer.toString(), "0");
                              assert.equal(raffleState.toString(), "0");
                              assert(endingTimeStamp > startingTimeStamp);
                              //   Assuming all variables should be BigInt
                              const winnerStartingBalanceBigInt = BigInt(
                                  winnerStartingBalance
                              ); // Convert to BigInt if not already
                              const raffleEnteranceFeeBigInt =
                                  BigInt(raffleEnteranceFee); // Convert to BigInt if not already
                              const additionalEntersBigInt =
                                  BigInt(additionalEnters); // Convert to BigInt if not already

                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  (
                                      winnerStartingBalanceBigInt +
                                      raffleEnteranceFeeBigInt *
                                          additionalEntersBigInt +
                                      raffleEnteranceFeeBigInt
                                  ).toString()
                              );
                          } catch (e) {
                              reject();
                          }
                          resolve();
                      });

                      const startingTimeStamp =
                          await raffle.getLatestTimeStamp();
                      const tx = await raffle.performUpkeep("0x");
                      const txReceipt = await tx.wait(1);
                      const winnerStartingBalance =
                          await ethers.provider.getBalance(accounts[1].address);
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.logs[1].args.requestId,
                          raffle.target
                      );
                  });
              }).timeout(2000000);
          });
      });
