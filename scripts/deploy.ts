// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

import {ethers} from "hardhat";


const network_configs = {
    mumbai:{
        _matic_usd_aggregator: "0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada",
        _usdc_usd_aggregator: "0x572dDec9087154dC5dfBB1546Bb62713147e0Ab0",
        _usdc_address: "0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97"
    }, ethereum: {}, polygon: {},
    sepolia: {
        _eth_usd_aggregator: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
        _usdc_usd_aggregator: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E",
        _usdc_address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
    },
}



async function main() {
    const network = hre.network.name;
    console.log("Network:", network, "configs:", network_configs[network]);

    let config = network_configs[network];

    let [addr] = await ethers.getSigners()
    let signer = await addr.getAddress()

    console.log("Deploy contract EOA address: " + signer);

    //const entryPointAddress = await deployContract("EntryPoint", "EntryPoint", []);
    const entryPointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

    const testAddress = "0x0E1375d18a4A2A867bEfe908E87322ad031386a6"

    //const ERC20PaymasterAddress = await deployContract("ERC20Paymaster", "ERC20Paymaster",
    //    [config._usdc_address, entryPointAddress, config._usdc_usd_aggregator, config._eth_usd_aggregator, addr.address]);
    
    //const verifyingPaymasterAddress = await deployContract("PaymasterV0_1", "PaymasterV0_1",[entryPointAddress, signer]);
    
    const paymasterV1_1Address = await deployContract("PaymasterV1_1", "PaymasterV1_1",
    [entryPointAddress, testAddress, config._usdc_address, config._usdc_usd_aggregator, config._eth_usd_aggregator,signer]);
    

    console.log("------------ RESULT ---------------")
    console.log("[ContractAddress] EntryPointAddress: %s", entryPointAddress);
    //console.log("[ContractAddress] VerifyingPaymasterAddress: %s", verifyingPaymasterAddress);
    //console.log("[ContractAddress] ERC20PaymasterAddress: %s", ERC20PaymasterAddress);
    //console.log("[ContractAddress] PaymasterV1Address: %s", paymasterV1Address);
    console.log("[ContractAddress] PaymasterV1_1Address: %s", paymasterV1_1Address);
    console.log("------------ RESULT ---------------")

    console.log("[Success] All contracts have been deployed success.")
    
}

async function deployContract(name:string, contractName:string, constructorParams:any[]) {
    console.log("[%s] Start to deploy", name);
    console.log("[%s] ConstructorArguments: %s", name, constructorParams);
    const factory = await ethers.getContractFactory(contractName);
    const contract = await factory.deploy(...constructorParams);
    await contract.deployed();
    const address = await contract.address;
    console.log("deploy done.")
    //await verifyOnBlockscan(address, constructorParams);
    console.log("[%s] Contract address: %s", name, address);
    return address;
}

async function verifyOnBlockscan(address:string, args:any[]) {
  let success = false;
  while (!success) {
      try {
          let params = {
              address: address,
              constructorArguments: args,
          };
          await hre.run("verify:verify", params);
          console.log("verify successfully");
          success = true;
      } catch (error) {
          console.log(`Script failed: ${error}`);
          console.log(`Trying again in 3 seconds...`);
          await new Promise((resolve) => setTimeout(resolve, 3000));
      }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});