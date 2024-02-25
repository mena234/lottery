import { ethers } from "hardhat";

export const networkConfig = {
    31337: {
        name: "hardhat",
        vrfCoordinatorV2: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
        enteranceFee: ethers.parseEther("0.01"),
        gasLane:
            "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        callbackGasLimit: "500000",
        interval: 30,
        subscriptionId: "0",
    },
    11155111: {
        name: "sepolia",
        vrfCoordinatorV2: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
        enteranceFee: ethers.parseEther("0.01"),
        gasLane:
            "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        callbackGasLimit: "2500000",
        subscriptionId: "9495",
        interval: 30,
    },
};

export const developmentChains = ["hardhat", "localhost"];
