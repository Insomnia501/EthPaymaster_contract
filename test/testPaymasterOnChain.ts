import { ethers } from 'hardhat'
import { UserOperation } from './UserOperation'
import "dotenv/config";


async function main() {

    let [addr, ...addrs] = await ethers.getSigners();
    console.log("Address: %s", addr.address);
    //const entryPointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
    const paymasterV1_1Address = "0xd93349Ee959d295B115Ee223aF10EF432A8E8523";
    //2 test contract："0x6Ef271e83c8450B94dB344754B2ecf13409510bd"
    //1 test contract："0xd93349Ee959d295B115Ee223aF10EF432A8E8523";

    // init wallet
    const provider = ethers.provider;
    const privateKey = process.env.PRIVATE_KEY;
    const myWallet = new ethers.Wallet(privateKey, provider);

    //const paymasterV1_1ABI = [
    //    'function getHash(UserOperation userOp, uint48 validUntil, uint48 validAfter) public view returns (bytes32)',
    //    'function parsePaymasterAndData(bytes paymasterAndData) public pure returns(uint48 validUntil, uint48 validAfter, bytes calldata signature)',
    //];
    const paymasterV1_1ABI = [
        {
          "inputs": [
            {
              "internalType": "contract IEntryPoint",
              "name": "_entryPoint",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "_verifyingSigner",
              "type": "address"
            },
            {
              "internalType": "contract IERC20Metadata",
              "name": "_token",
              "type": "address"
            },
            {
              "internalType": "contract IOracle",
              "name": "_tokenOracle",
              "type": "address"
            },
            {
              "internalType": "contract IOracle",
              "name": "_nativeAssetOracle",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "_owner",
              "type": "address"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "uint32",
              "name": "priceMarkup",
              "type": "uint32"
            },
            {
              "indexed": false,
              "internalType": "uint32",
              "name": "updateThreshold",
              "type": "uint32"
            }
          ],
          "name": "ConfigUpdated",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "previousOwner",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "newOwner",
              "type": "address"
            }
          ],
          "name": "OwnershipTransferred",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "address",
              "name": "user",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "actualTokenNeeded",
              "type": "uint256"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "actualGasCost",
              "type": "uint256"
            }
          ],
          "name": "UserOperationSponsored",
          "type": "event"
        },
        {
          "inputs": [],
          "name": "REFUND_POSTOP_COST",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "components": [
                {
                  "internalType": "address",
                  "name": "sender",
                  "type": "address"
                },
                {
                  "internalType": "uint256",
                  "name": "nonce",
                  "type": "uint256"
                },
                {
                  "internalType": "bytes",
                  "name": "initCode",
                  "type": "bytes"
                },
                {
                  "internalType": "bytes",
                  "name": "callData",
                  "type": "bytes"
                },
                {
                  "internalType": "uint256",
                  "name": "callGasLimit",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "verificationGasLimit",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "preVerificationGas",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "maxFeePerGas",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "maxPriorityFeePerGas",
                  "type": "uint256"
                },
                {
                  "internalType": "bytes",
                  "name": "paymasterAndData",
                  "type": "bytes"
                },
                {
                  "internalType": "bytes",
                  "name": "signature",
                  "type": "bytes"
                }
              ],
              "internalType": "struct UserOperation",
              "name": "userOp",
              "type": "tuple"
            }
          ],
          "name": "_verifyingTest",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint32",
              "name": "unstakeDelaySec",
              "type": "uint32"
            }
          ],
          "name": "addStake",
          "outputs": [],
          "stateMutability": "payable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "deposit",
          "outputs": [],
          "stateMutability": "payable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "entryPoint",
          "outputs": [
            {
              "internalType": "contract IEntryPoint",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "getDeposit",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "components": [
                {
                  "internalType": "address",
                  "name": "sender",
                  "type": "address"
                },
                {
                  "internalType": "uint256",
                  "name": "nonce",
                  "type": "uint256"
                },
                {
                  "internalType": "bytes",
                  "name": "initCode",
                  "type": "bytes"
                },
                {
                  "internalType": "bytes",
                  "name": "callData",
                  "type": "bytes"
                },
                {
                  "internalType": "uint256",
                  "name": "callGasLimit",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "verificationGasLimit",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "preVerificationGas",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "maxFeePerGas",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "maxPriorityFeePerGas",
                  "type": "uint256"
                },
                {
                  "internalType": "bytes",
                  "name": "paymasterAndData",
                  "type": "bytes"
                },
                {
                  "internalType": "bytes",
                  "name": "signature",
                  "type": "bytes"
                }
              ],
              "internalType": "struct UserOperation",
              "name": "userOp",
              "type": "tuple"
            },
            {
              "internalType": "uint48",
              "name": "validUntil",
              "type": "uint48"
            },
            {
              "internalType": "uint48",
              "name": "validAfter",
              "type": "uint48"
            }
          ],
          "name": "getHash",
          "outputs": [
            {
              "internalType": "bytes32",
              "name": "",
              "type": "bytes32"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "components": [
                {
                  "internalType": "address",
                  "name": "sender",
                  "type": "address"
                },
                {
                  "internalType": "uint256",
                  "name": "nonce",
                  "type": "uint256"
                },
                {
                  "internalType": "bytes",
                  "name": "initCode",
                  "type": "bytes"
                },
                {
                  "internalType": "bytes",
                  "name": "callData",
                  "type": "bytes"
                },
                {
                  "internalType": "uint256",
                  "name": "callGasLimit",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "verificationGasLimit",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "preVerificationGas",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "maxFeePerGas",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "maxPriorityFeePerGas",
                  "type": "uint256"
                },
                {
                  "internalType": "bytes",
                  "name": "paymasterAndData",
                  "type": "bytes"
                },
                {
                  "internalType": "bytes",
                  "name": "signature",
                  "type": "bytes"
                }
              ],
              "internalType": "struct UserOperation",
              "name": "userOp",
              "type": "tuple"
            },
            {
              "internalType": "uint48",
              "name": "validUntil",
              "type": "uint48"
            },
            {
              "internalType": "uint48",
              "name": "validAfter",
              "type": "uint48"
            }
          ],
          "name": "getHashTest",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            },
            {
              "internalType": "bytes",
              "name": "",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "",
              "type": "bytes"
            },
            {
              "internalType": "bytes32",
              "name": "",
              "type": "bytes32"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "nativeAssetOracle",
          "outputs": [
            {
              "internalType": "contract IOracle",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "owner",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "bytes",
              "name": "paymasterAndData",
              "type": "bytes"
            }
          ],
          "name": "parsePaymasterAndData",
          "outputs": [
            {
              "internalType": "uint48",
              "name": "validUntil",
              "type": "uint48"
            },
            {
              "internalType": "uint48",
              "name": "validAfter",
              "type": "uint48"
            },
            {
              "internalType": "bytes",
              "name": "signature",
              "type": "bytes"
            }
          ],
          "stateMutability": "pure",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "enum IPaymaster.PostOpMode",
              "name": "mode",
              "type": "uint8"
            },
            {
              "internalType": "bytes",
              "name": "context",
              "type": "bytes"
            },
            {
              "internalType": "uint256",
              "name": "actualGasCost",
              "type": "uint256"
            }
          ],
          "name": "postOp",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "previousPrice",
          "outputs": [
            {
              "internalType": "uint192",
              "name": "",
              "type": "uint192"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "priceDenominator",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "priceMarkup",
          "outputs": [
            {
              "internalType": "uint32",
              "name": "",
              "type": "uint32"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "priceUpdateThreshold",
          "outputs": [
            {
              "internalType": "uint32",
              "name": "",
              "type": "uint32"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "renounceOwnership",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "name": "senderNonce",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "token",
          "outputs": [
            {
              "internalType": "contract IERC20",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "tokenDecimals",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "tokenOracle",
          "outputs": [
            {
              "internalType": "contract IOracle",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "newOwner",
              "type": "address"
            }
          ],
          "name": "transferOwnership",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "unlockStake",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint32",
              "name": "_priceMarkup",
              "type": "uint32"
            },
            {
              "internalType": "uint32",
              "name": "_updateThreshold",
              "type": "uint32"
            }
          ],
          "name": "updateConfig",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "updatePrice",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "components": [
                {
                  "internalType": "address",
                  "name": "sender",
                  "type": "address"
                },
                {
                  "internalType": "uint256",
                  "name": "nonce",
                  "type": "uint256"
                },
                {
                  "internalType": "bytes",
                  "name": "initCode",
                  "type": "bytes"
                },
                {
                  "internalType": "bytes",
                  "name": "callData",
                  "type": "bytes"
                },
                {
                  "internalType": "uint256",
                  "name": "callGasLimit",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "verificationGasLimit",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "preVerificationGas",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "maxFeePerGas",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "maxPriorityFeePerGas",
                  "type": "uint256"
                },
                {
                  "internalType": "bytes",
                  "name": "paymasterAndData",
                  "type": "bytes"
                },
                {
                  "internalType": "bytes",
                  "name": "signature",
                  "type": "bytes"
                }
              ],
              "internalType": "struct UserOperation",
              "name": "userOp",
              "type": "tuple"
            },
            {
              "internalType": "bytes32",
              "name": "userOpHash",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "maxCost",
              "type": "uint256"
            }
          ],
          "name": "validatePaymasterUserOp",
          "outputs": [
            {
              "internalType": "bytes",
              "name": "context",
              "type": "bytes"
            },
            {
              "internalType": "uint256",
              "name": "validationData",
              "type": "uint256"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "verifyingSigner",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address payable",
              "name": "withdrawAddress",
              "type": "address"
            }
          ],
          "name": "withdrawStake",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address payable",
              "name": "withdrawAddress",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "name": "withdrawTo",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "to",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            }
          ],
          "name": "withdrawToken",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ];
    const paymasterV1_1Contract = new ethers.Contract(paymasterV1_1Address, paymasterV1_1ABI, provider).connect(myWallet);
    
    const userOp: UserOperation = {
        sender: "0xFfDB071C2b58CCC10Ad386f9Bb4E8d3d664CE73c",
        nonce: "0x00",
        initCode: "0x9406cc6185a346906296840746125a0e449764545fbfb9cf000000000000000000000000b6bcf9517d193f551d0e3d6860103972dd13de7b0000000000000000000000000000000000000000000000000000000000000000",
        callData: "0xb61d27f60000000000000000000000001c7d4b196cb0c7b01d743fbc6116a902379c7238000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044095ea7b30000000000000000000000000000000000325602a77416a16136fdafd04b299fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000",
        callGasLimit: "0x54fa",
        verificationGasLimit: "0x05fa35",
        preVerificationGas: "0xae64",
        maxFeePerGas: "0x59682fb0",
        maxPriorityFeePerGas: "0x59682f00",
        paymasterAndData: "0xd93349Ee959d295B115Ee223aF10EF432A8E852300000000000000000000000000000000000000000000000000000000171004449600000000000000000000000000000000000000000000000000000017415804965c29b27a4ff543dec825cb9f591828c0072091715aba190f366d6c6ad58cf7894500a4ded3b7d912a4a66f0217ec28dd5adc20896d1d929119f95bd7f7c6b1121b",
        signature: "0xb650f49b49a00d03416d9c47c54f318fab68c2634635eb2ea2dac1ce5cc1ac5c47ed293d5e9b4a4ba481e2913abdf9d1df8276d528e7066f08b46e53c1dd507c1c"
    };
    const validUntil = 1710044496;
    const validAfter = 1741580496;
    console.log("--- Start To test contract interact ---");
    
    //const res = await paymasterV1_1Contract.parsePaymasterAndData(userOp.paymasterAndData);
    const res = await paymasterV1_1Contract.getHashTest(userOp,validUntil,validAfter);
    console.log(`res:${res}`);

    //console.log(`Transaction hash: ${tx.hash}`);
    //const receipt = await tx.wait();
    //console.log(`Transaction confirmed in block: ${receipt.blockNumber}`); */

    console.log("---- Start To check ECDSA sig --- ");
    // test ECDSA
    const hash = "0x8ad4946fb4665c29754b83495e796fa03013aaa0f194326afad73ce2fc5b91e9"
    const verifyingEOA = "0x0E1375d18a4A2A867bEfe908E87322ad031386a6"
    //const newPaymasterContract = "0x6Ef271e83c8450B94dB344754B2ecf13409510bd"
    const signature = "0x5c29b27a4ff543dec825cb9f591828c0072091715aba190f366d6c6ad58cf7894500a4ded3b7d912a4a66f0217ec28dd5adc20896d1d929119f95bd7f7c6b1121b"
    //const signature = await myWallet.signMessage(ethers.utils.arrayify(hash));
    //console.log(signature);
    const signedHash = ethers.utils.hashMessage(ethers.utils.arrayify(hash));
    
    const recoveredAddress = ethers.utils.recoverAddress(signedHash, signature);
    
    if (recoveredAddress.toLowerCase() === verifyingEOA.toLowerCase()){
        console.log("Success!")
    }
    else {
        console.log(`failed!,${recoveredAddress}`)
    }

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});