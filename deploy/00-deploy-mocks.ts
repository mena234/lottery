import { network, ethers } from "hardhat";
import { networkConfig, developmentChains } from "../helper-hardhat-config";

const Mocks = async ({ getNamedAccounts, deployments }: any) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const BASE_FEE = ethers.parseEther("0.25")
    const GAS_PRICE_LINK = 1e9;
    const args = [BASE_FEE, GAS_PRICE_LINK]
    if (developmentChains.includes(network.name)) {
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            log: true,
            args
        })
    }
};

export default Mocks;
Mocks.tags = ["all", "mocks"]
