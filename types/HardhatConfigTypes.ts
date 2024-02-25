import { HttpNetworkUserConfig, HardhatNetworkUserConfig } from "hardhat/types";
import { HardhatUserConfig } from "hardhat/config";

// Extend the standard network configuration with your custom property
// Define interfaces for extended network configurations, implicitly including existing properties
interface MyExtendedHttpNetworkUserConfig extends HttpNetworkUserConfig {
    blockConfirmation?: number;
}

interface MyExtendedHardhatNetworkUserConfig extends HardhatNetworkUserConfig {
    blockConfirmation?: number;
}

// Create a type for the networks property, explicitly handling both standard and Hardhat network configs
export type MyNetworksUserConfig = {
    [K in keyof HardhatUserConfig["networks"]]: K extends "hardhat"
        ? MyExtendedHardhatNetworkUserConfig
        : MyExtendedHttpNetworkUserConfig;
};

// Extend the HardhatUserConfig to include the new networks type
interface MyHardhatUserConfig extends Omit<HardhatUserConfig, "networks"> {
    networks?: MyNetworksUserConfig;
}
