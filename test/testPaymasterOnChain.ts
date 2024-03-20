import { ethers } from 'hardhat'
import { UserOperation } from './UserOperation'
import "dotenv/config";


/**
 * init paymaster：
 * 1.entryPoint depositTo(Paymaster address and token amount)
 */


async function main() {

    let [addr, ...addrs] = await ethers.getSigners();
    console.log("Address: %s", addr.address);
    //const entryPointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
    const paymasterV1_1Address = "0xE99c4Db5E360B8c84bF3660393CB2A85c3029b44";

    // init wallet
    const provider = ethers.provider;
    const privateKey = process.env.PRIVATE_KEY;
    const myWallet = new ethers.Wallet(privateKey, provider);

    ///paymaster init
    //const paymasterV1_1Factory = await ethers.getContractFactory("PaymasterV1_1");
    //const paymasterV1_1 = await paymasterV1_1Factory.attach(paymasterV1_1Address);

    const paymasterV1_1ABI = [
        'function getHash(UserOperation userOp, uint48 validUntil, uint48 validAfter) public view returns (bytes32)',
    ];
    
    const paymasterV1_1Contract = new ethers.Contract(paymasterV1_1Address, paymasterV1_1ABI, provider).connect(myWallet);
    
    const userOp: UserOperation = {
        sender: "0xF8498599744BC37e141cb800B67Dbf103a6b5881",
        nonce: "0x00",
        initCode: "0x9406cc6185a346906296840746125a0e449764545fbfb9cf000000000000000000000000340966abb6e37a06014546e0542b3aafad4550810000000000000000000000000000000000000000000000000000000000000000",
        callData: "0xb61d27f60000000000000000000000001c7d4b196cb0c7b01d743fbc6116a902379c7238000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044095ea7b30000000000000000000000000000000000325602a77416a16136fdafd04b299fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000",
        callGasLimit: "0x54fa",
        verificationGasLimit: "0x05fa35",
        preVerificationGas: "0xae64",
        maxFeePerGas: "0x2aa887baca",
        maxPriorityFeePerGas: "0x59682f00",
        paymasterAndData: "0xE99c4Db5E360B8c84bF3660393CB2A85c3029b4400000000000000000000000000000000000000000000000000000000171004449600000000000000000000000000000000000000000000000000000017415804969e46721fc1938ac427add8a9e0d5cba2be5b17ccda9b300d0d3eeaff1904dfc23e276abd1ba6e3e269ec6aa36fe6a2442c18d167b53d7f9f0d1b3ebe80b09a6200",
        signature: "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
    };
    const validUntil = "0x001710044496";
    const validAfter = "0x001741580496";
    const TRUE_SIG = "0x9e46721fc1938ac427add8a9e0d5cba2be5b17ccda9b300d0d3eeaff1904dfc23e276abd1ba6e3e269ec6aa36fe6a2442c18d167b53d7f9f0d1b3ebe80b09a6200";
    
    const userOpEncodedData = ethers.utils.defaultAbiCoder.encode(
        [
            "(address,uint256,bytes,bytes,uint256,uint256,uint256,uint256,uint256,bytes,bytes)"
        ],
        [
            [
                userOp.sender,
                userOp.nonce,
                userOp.initCode,
                userOp.callData,
                userOp.callGasLimit,
                userOp.verificationGasLimit,
                userOp.preVerificationGas,
                userOp.maxFeePerGas,
                userOp.maxPriorityFeePerGas,
                userOp.paymasterAndData,
                userOp.signature
            ]
        ]
    );
    console.log("Start To test")
    const tx = await paymasterV1_1Contract.getHash(userOp, validUntil, validAfter);
    console.log(`Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});