import { HardhatUserConfig } from "hardhat/config";
import "dotenv/config";
import "@nomiclabs/hardhat-ethers";
//import "module-alias/register";
import "@nomiclabs/hardhat-etherscan";
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import 'hardhat-deploy'

import { ProxyAgent, setGlobalDispatcher } from "undici";
const proxyAgent = new ProxyAgent("http://127.0.0.1:7890");
setGlobalDispatcher(proxyAgent);

const withOptimizations = true;
const defaultNetwork = "hardhat"; // "hardhat" for tests

const config: HardhatUserConfig = {
  solidity: {
    compilers: [    //可指定多个sol版本
      {
        version: "0.8.23",
        settings: {
          optimizer: {
            enabled: withOptimizations,
            runs: 1000
          }
        }
      },
    ],
  },  
  defaultNetwork: defaultNetwork,
  networks: {
    hardhat: {
      blockGasLimit: 10000000, allowUnlimitedContractSize: !withOptimizations
    }, sepolia: {
        url: 'https://eth-sepolia.g.alchemy.com/v2/CH4apxhy9YIw2jj2uhKnZxtMnKIJbx5e',
        accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : []
    }, ethereum: {
        url: 'https://eth-mainnet.g.alchemy.com/v2/GlAFz_VOPK6XUapGQx5WkLNguXulcdMJ',
        accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : []
    }, mumbai: {
        url: 'https://polygon-mumbai.g.alchemy.com/v2/msaJegrQLaLoy3szqaYUebeTejvKLeJO',
        accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : []
    }, opt_sepolia: {
        url: 'https://opt-sepolia.g.alchemy.com/v2/5iTtSotuDzoKGqXASF2s2cWANWUif84c',
        accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : []
    }, linea_goerli: {
        url: 'https://linea-goerli.infura.io/v3/cccdbc4128e6479ab9b4a8bbec835283',
        accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : []
    }, 
},
etherscan: {
    apiKey: process.env.ETHSCAN_API_KEY
},
};

export default config;
