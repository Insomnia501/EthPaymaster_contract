import { Wallet } from 'ethers'
import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
  EntryPoint,
  SimpleAccount,
} from '../lib/account-abstraction/typechain'
import {
  PaymasterV1,
  PaymasterV1__factory
} from '../typechain'
import {
  AddressZero,
  createAccount,
  createAccountOwner, createAddress, decodeRevertReason,
  deployEntryPoint, packPaymasterData2, parseValidationData
} from './testutils'
import { DefaultsForUserOp, fillAndSign, fillSignAndPack, fillSignAndPack2, packUserOp, simulateValidation } from './UserOp'
import { arrayify, defaultAbiCoder, hexConcat, parseEther } from 'ethers/lib/utils'
import { PackedUserOperation } from './UserOperation'

const MOCK_VALID_UNTIL = '0x00000000deadbeef'
const MOCK_VALID_AFTER = '0x0000000000001234'
const MOCK_SIG = '0x1234'

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

describe('EntryPoint with PaymasterV1', function () {
  let entryPoint: EntryPoint
  let accountOwner: Wallet
  const ethersSigner = ethers.provider.getSigner()
  let account: SimpleAccount
  let offchainSigner: Wallet
  let network = "sepolia"
  let config = network_configs[network]

  let paymaster: PaymasterV1
  before(async function () {
    this.timeout(20000)
    entryPoint = await deployEntryPoint()

    offchainSigner = createAccountOwner()
    accountOwner = createAccountOwner()

    paymaster = await new PaymasterV1__factory(ethersSigner).deploy(entryPoint.address, offchainSigner.address, config._usdc_address, config._usdc_usd_aggregator, config._eth_usd_aggregator, offchainSigner.address)
    await paymaster.addStake(1, { value: parseEther('2') })
    await entryPoint.depositTo(paymaster.address, { value: parseEther('1') });
    ({ proxy: account } = await createAccount(ethersSigner, accountOwner.address, entryPoint.address))
  })

  describe('#parsePaymasterAndData', () => {
    it('should parse data properly', async () => {
      const paymasterAndData = packPaymasterData2(
        '0x00',
        paymaster.address,
        DefaultsForUserOp.paymasterVerificationGasLimit,
        DefaultsForUserOp.paymasterPostOpGasLimit,
        hexConcat([
          defaultAbiCoder.encode(['uint48', 'uint48'], [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]), MOCK_SIG
        ])
      )
      console.log(paymasterAndData)
      const res = await paymaster.parsePaymasterAndData(paymasterAndData)
      // console.log('MOCK_VALID_UNTIL, MOCK_VALID_AFTER', MOCK_VALID_UNTIL, MOCK_VALID_AFTER)
      // console.log('validUntil after', res.validUntil, res.validAfter)
      // console.log('MOCK SIG', MOCK_SIG)
      // console.log('sig', res.signature)
      expect(res.validUntil).to.be.equal(ethers.BigNumber.from(MOCK_VALID_UNTIL))
      expect(res.validAfter).to.be.equal(ethers.BigNumber.from(MOCK_VALID_AFTER))
      expect(res.signature).equal(MOCK_SIG)
    })
  })

  describe('#validatePaymasterUserOp', () => {
    it('should reject on no signature', async () => {
      const userOp = await fillSignAndPack(
      
      {
        sender: account.address,
        paymaster: paymaster.address,
        paymasterData: hexConcat([defaultAbiCoder.encode(['uint48', 'uint48'], [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]), '0x1234'])
      }, accountOwner, entryPoint)
      expect(await simulateValidation(userOp, entryPoint.address)
        .catch(e => decodeRevertReason(e)))
        .to.include('invalid signature length in paymasterAndData')
    })

    it('should reject on invalid signature', async () => {
      const userOp = await fillSignAndPack2(
        '0x00',
        {
          sender: account.address,
          paymaster: paymaster.address,
          paymasterData: hexConcat(
            [defaultAbiCoder.encode(['uint48', 'uint48'], [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]), '0x' + '00'.repeat(65)])
        },
        accountOwner, entryPoint)
      expect(await simulateValidation(userOp, entryPoint.address)
        .catch(e => decodeRevertReason(e)))
        .to.include('ECDSAInvalidSignature')
    })

    describe('with wrong signature', () => {
      let wrongSigUserOp: PackedUserOperation
      const beneficiaryAddress = createAddress()
      before(async () => {
        const sig = await offchainSigner.signMessage(arrayify('0xdead'))
        wrongSigUserOp = await fillSignAndPack2(
          '0x00',
          {
            sender: account.address,
            paymaster: paymaster.address,
            paymasterData: hexConcat([defaultAbiCoder.encode(['uint48', 'uint48'], [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]), sig])
          }, 
          accountOwner, entryPoint)
      })

      it('should return signature error (no revert) on wrong signer signature', async () => {
        const ret = await simulateValidation(wrongSigUserOp, entryPoint.address)
        expect(parseValidationData(ret.returnInfo.paymasterValidationData).aggregator).to.match(/0x0*1$/)
      })

      it('handleOp revert on signature failure in handleOps', async () => {
        await expect(entryPoint.estimateGas.handleOps([wrongSigUserOp], beneficiaryAddress)).to.revertedWith('AA34 signature error')
      })
    })

    it('succeed with valid signature', async () => {
      const userOp1 = await fillAndSign({
        sender: account.address,
        paymaster: paymaster.address,
        paymasterData: hexConcat(
          [defaultAbiCoder.encode(['uint48', 'uint48'], [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]), '0x' + '00'.repeat(65)])
      }, accountOwner, entryPoint)
      const hash = await paymaster.getHash(packUserOp(userOp1), MOCK_VALID_UNTIL, MOCK_VALID_AFTER)
      const sig = await offchainSigner.signMessage(arrayify(hash))
      const userOp = await fillSignAndPack2(
        '0x00',
        {
          ...userOp1,
          paymaster: paymaster.address,
          paymasterData: hexConcat([defaultAbiCoder.encode(['uint48', 'uint48'], [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]), sig])
        }, 
        accountOwner, entryPoint)
      const res = await simulateValidation(userOp, entryPoint.address)
      const validationData = parseValidationData(res.returnInfo.paymasterValidationData)
      expect(validationData).to.eql({
        aggregator: AddressZero,
        validAfter: parseInt(MOCK_VALID_AFTER),
        validUntil: parseInt(MOCK_VALID_UNTIL)
      })
    })
  })
})
