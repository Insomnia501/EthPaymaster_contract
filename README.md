# EthPaymaster_contract
EthPaymaster Contract

Phase 1: Basic Paymaster
1. Support sign signature in the paymaster relay service and verify the signature on-chain (contract).
2. Support ERC20 basic gas payment with no Oracle version(refine it later).

# Quick Start

## 1. SetUp account-abstract lib


```shell
cd lib/account-abstraction
git checkout releases/v0.6
yarn
yarn hardhat compile
```

## 2. init and compile contract

```shell
cd ../..
yarn
yarn hardhat compile
```

## 3. test
```shell
yarn hardhat test
```

## 4. deploy
```shell
yarn hardhat run scripts/deploy.ts --network ${our_network_name}
```
