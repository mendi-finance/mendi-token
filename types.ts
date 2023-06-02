import { Address } from "hardhat-deploy/types";
import "hardhat/types/config";

declare module "hardhat/types/config" {
    interface HardhatNetworkUserConfig {
        addresses?: { [key: string]: Address };
    }

    interface HttpNetworkUserConfig {
        addresses?: { [key: string]: Address };
    }

    interface HardhatNetworkConfig {
        addresses?: { [key: string]: Address };
    }

    interface HttpNetworkConfig {
        addresses?: { [key: string]: Address };
    }
}
