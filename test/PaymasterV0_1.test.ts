import { Wallet } from 'ethers'
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
  SimpleAccount,
  EntryPoint,

} from '../lib/account-abstraction/typechain'
import {
  PaymasterV0_1,
  PaymasterV0_1__factory
} from '../typechain'
import {
  createAccount,
  createAccountOwner, createAddress,
  deployEntryPoint, simulationResultCatch
} from './testutils'
import { fillAndSign } from './UserOp'
import { arrayify, defaultAbiCoder, hexConcat, parseEther } from 'ethers/lib/utils'
import { UserOperation } from './UserOperation'

const MOCK_VALID_UNTIL = '0x00000000deadbeef'
const MOCK_VALID_AFTER = '0x0000000000001234'
const MOCK_SIG = '0x1234'

describe('EntryPoint with VerifyingPaymaster', function () {
  let entryPoint: EntryPoint
  let accountOwner: Wallet
  const ethersSigner = ethers.provider.getSigner()
  let account: SimpleAccount
  let offchainSigner: Wallet

  let paymaster: PaymasterV0_1
  before(async function () {
    this.timeout(20000)
    entryPoint = await deployEntryPoint()

    offchainSigner = createAccountOwner()
    accountOwner = createAccountOwner()

    paymaster = await new PaymasterV0_1__factory(ethersSigner).deploy(entryPoint.address, offchainSigner.address)
    await paymaster.addStake(1, { value: parseEther('2') })
    await entryPoint.depositTo(paymaster.address, { value: parseEther('1') });
    ({ proxy: account } = await createAccount(ethersSigner, accountOwner.address, entryPoint.address))
  })

  describe('#parsePaymasterAndData', () => {
    it('should parse data properly', async () => {
      const paymasterAndData = hexConcat(['0x00', paymaster.address, defaultAbiCoder.encode(['uint48', 'uint48'], [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]), MOCK_SIG])
      console.log(paymasterAndData)
      const res = await paymaster.parsePaymasterAndData(paymasterAndData)
      expect(res.validUntil).to.be.equal(ethers.BigNumber.from(MOCK_VALID_UNTIL))
      expect(res.validAfter).to.be.equal(ethers.BigNumber.from(MOCK_VALID_AFTER))
      expect(res.signature).equal(MOCK_SIG)
    })
  })

  describe('#getHash', () => {
    it('should get hash properly', async () => {
      const userOp:UserOperation = {
        callData: "0xb61d27f60000000000000000000000001c7d4b196cb0c7b01d743fbc6116a902379c7238000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000044095ea7b30000000000000000000000000000000000325602a77416a16136fdafd04b299fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000",
        callGasLimit: "0x54fa",
        initCode: "0x9406cc6185a346906296840746125a0e449764545fbfb9cf000000000000000000000000340966abb6e37a06014546e0542b3aafad4550810000000000000000000000000000000000000000000000000000000000000000",
        maxFeePerGas: "0x2aa887baca",
        maxPriorityFeePerGas: "0x59682f00",
        nonce: "0x00",
        preVerificationGas: "0xae64",
        sender: "0xF8498599744BC37e141cb800B67Dbf103a6b5881",
        signature: "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c",
        verificationGasLimit: "0x05fa35",
        paymasterAndData: "0xE99c4Db5E360B8c84bF3660393CB2A85c3029b4400000000000000000000000000000000000000000000000000000000171004449600000000000000000000000000000000000000000000000000000017415804969e46721fc1938ac427add8a9e0d5cba2be5b17ccda9b300d0d3eeaff1904dfc23e276abd1ba6e3e269ec6aa36fe6a2442c18d167b53d7f9f0d1b3ebe80b09a6200"
      }
      const validUntil = "0x001710044496";
      const validAfter = "0x001741580496";
      const TRUE_SIG = "0x9e46721fc1938ac427add8a9e0d5cba2be5b17ccda9b300d0d3eeaff1904dfc23e276abd1ba6e3e269ec6aa36fe6a2442c18d167b53d7f9f0d1b3ebe80b09a6200"
      //const paymasterAndData = hexConcat(['0x00', paymaster.address, defaultAbiCoder.encode(['uint48', 'uint48'], [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]), MOCK_SIG])
      //console.log(paymasterAndData)
      const res = await paymaster.getHash(userOp, validUntil, validAfter)
      console.log(res)
      expect(res).equal(TRUE_SIG)
    })
  })

  describe('#validatePaymasterUserOp', () => {
    it('should reject on no signature', async () => {
      const userOp = await fillAndSign({
        sender: account.address,
        paymasterAndData: hexConcat([paymaster.address, '0x00', defaultAbiCoder.encode(['uint48', 'uint48'], [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]), '0x1234'])
      }, accountOwner, entryPoint)
      await expect(entryPoint.callStatic.simulateValidation(userOp)).to.be.revertedWith('invalid signature length in paymasterAndData')
    })

    it('should reject on invalid signature', async () => {
      const userOp = await fillAndSign({
        sender: account.address,
        paymasterAndData: hexConcat([paymaster.address, '0x00', defaultAbiCoder.encode(['uint48', 'uint48'], [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]), '0x' + '00'.repeat(65)])
      }, accountOwner, entryPoint)
      await expect(entryPoint.callStatic.simulateValidation(userOp)).to.be.revertedWith('ECDSA: invalid signature')
    })

    describe('with wrong signature', () => {
      let wrongSigUserOp: UserOperation
      const beneficiaryAddress = createAddress()
      before(async () => {
        const sig = await offchainSigner.signMessage(arrayify('0xdead'))
        wrongSigUserOp = await fillAndSign({
          sender: account.address,
          paymasterAndData: hexConcat([paymaster.address, '0x00', defaultAbiCoder.encode(['uint48', 'uint48'], [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]), sig])
        }, accountOwner, entryPoint)
      })

      it('should return signature error (no revert) on wrong signer signature', async () => {
        const ret = await entryPoint.callStatic.simulateValidation(wrongSigUserOp).catch(simulationResultCatch)
        expect(ret.returnInfo.sigFailed).to.be.true
      })

      it('handleOp revert on signature failure in handleOps', async () => {
        await expect(entryPoint.estimateGas.handleOps([wrongSigUserOp], beneficiaryAddress)).to.revertedWith('AA34 signature error')
      })
    })

    it('succeed with valid signature', async () => {
      const userOp1 = await fillAndSign({
        sender: account.address,
        paymasterAndData: hexConcat([paymaster.address, '0x00', defaultAbiCoder.encode(['uint48', 'uint48'], [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]), '0x' + '00'.repeat(65)])
      }, accountOwner, entryPoint)
      const hash = await paymaster.getHash(userOp1, MOCK_VALID_UNTIL, MOCK_VALID_AFTER)
      const sig = await offchainSigner.signMessage(arrayify(hash))
      const userOp = await fillAndSign({
        ...userOp1,
        paymasterAndData: hexConcat([paymaster.address, '0x00', defaultAbiCoder.encode(['uint48', 'uint48'], [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]), sig])
      }, accountOwner, entryPoint)
      const res = await entryPoint.callStatic.simulateValidation(userOp).catch(simulationResultCatch)
      expect(res.returnInfo.sigFailed).to.be.false
      expect(res.returnInfo.validAfter).to.be.equal(ethers.BigNumber.from(MOCK_VALID_AFTER))
      expect(res.returnInfo.validUntil).to.be.equal(ethers.BigNumber.from(MOCK_VALID_UNTIL))
    })
  })
})
