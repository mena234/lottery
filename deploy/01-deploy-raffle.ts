import { network, ethers } from "hardhat";
import { networkConfig, developmentChains } from "../helper-hardhat-config";
import { verify } from "../utils/verify";
import { ContractTransactionReceipt } from "ethers";

const VRF_SUB_FUND_AMOUNT = ethers.parseEther("2");

const Raffle = async ({ getNamedAccounts, deployments }: any) => {
    const { deploy, log, get } = deployments;
    // const { deployer } = await getNamedAccounts();
    const deployer = await ethers.provider.getSigner();
    const chainId = network.config.chainId?.toString() as "31337" | "11155111";
    let vrfCoordinatorV2Address, subscriptionId;
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContractAt(
            "VRFCoordinatorV2Mock",
            (
                await deployments.get("VRFCoordinatorV2Mock")
            ).address,
            deployer
        );
        vrfCoordinatorV2Address = await vrfCoordinatorV2Mock.getAddress();
        const transactionReponse =
            await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionReponse.wait();
        subscriptionId = (
            (transactionReceipt as ContractTransactionReceipt).logs[0] as any
        ).args.subId.toString();
        await vrfCoordinatorV2Mock.fundSubscription(
            subscriptionId,
            VRF_SUB_FUND_AMOUNT
        );
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2;
        subscriptionId = networkConfig[chainId].subscriptionId;
    }

    const enteranceFee = networkConfig[chainId].enteranceFee;
    const gasLane = networkConfig[chainId].gasLane;
    const callbackGasLimit = networkConfig[chainId].callbackGasLimit;
    const interval = networkConfig[chainId].interval;
    const blockConfirmations = (network.config as any).blockConfirmation;
    const args = [
        vrfCoordinatorV2Address,
        enteranceFee,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        interval,
    ];
    const raffle = await deploy("Raffle", {
        from: deployer.address,
        args,
        log: true,
        waitConfirmations: blockConfirmations,
    });

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContractAt(
            "VRFCoordinatorV2Mock",
            (
                await deployments.get("VRFCoordinatorV2Mock")
            ).address,
            deployer
        );
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
        log("adding consumer...");
        log("Consumer added!");
    }

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        log("Verifying...");
        await verify(raffle.address, args);
    }
};

export default Raffle;
Raffle.tags = ["all", "raffle"];
