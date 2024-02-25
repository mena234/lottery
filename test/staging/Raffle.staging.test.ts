import { assert, expect } from "chai";
import { developmentChains, networkConfig } from "../../helper-hardhat-config";
import { network, ethers, deployments } from "hardhat";

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
          let deployer: any, raffle: any, raffleEnteranceFee: any;

          beforeEach(async function () {
              deployer = await ethers.provider.getSigner();
              raffle = await ethers.getContractAt(
                  "Raffle",
                  (
                      await deployments.get("Raffle")
                  ).address,
                  deployer
              );
              raffleEnteranceFee = await raffle.getEnteranceFee();
          });

          describe("fulfillRandomWords", function () {
              it("Works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                  const startingTimestamp = await raffle.getLatestTimeStamp;
                  //   const [deployerAccount] = await ethers.getSigners();

                  await new Promise(async (resolve: any, reject: any) => {
                      raffle.once("WinnerPicked", async () => {
                          try {
                              const recentWinner =
                                  await raffle.getRecentWinner();
                              const raffleState = await raffle.getRaffleState();
                              const endingTimeStamp =
                                  await raffle.getLatestTimeStamp();
                              const winnerEndingBalance =
                                  await ethers.provider.getBalance(
                                      await deployer.address
                                  );
                              await expect(raffle.getPlayer(0)).to.be.reverted;
                              assert.equal(raffleState.toString(), "0");
                              assert.equal(
                                  recentWinner.toString(),
                                  deployer.address
                              );
                              assert(endingTimeStamp > startingTimestamp);
                              assert.equal(
                                  winnerEndingBalance,
                                  winnerStartingBalance + raffleEnteranceFee
                              );
                              resolve()
                          } catch (error) {
                              console.log(error);
                              reject();
                          }
                      });
                      await raffle.enterRaffle({ value: raffleEnteranceFee });
                      const winnerStartingBalance =
                          await ethers.provider.getBalance(deployer.address);
                  });
              }).timeout(300000);
          });
      });
