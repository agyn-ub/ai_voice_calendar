# MeetingStake Smart Contract

A Solidity smart contract for staking FLOW tokens on meeting attendance, deployed on Flow EVM.

## Overview

This contract allows meeting organizers to require attendees to stake FLOW tokens. Attendees who join the meeting and submit the attendance code get their stake refunded. Those who miss the meeting forfeit their stake to the organizer.

## Setup

1. Copy `.env.example` to `.env` and add your private key:
```bash
cp .env.example .env
```

2. Install dependencies:
```bash
forge install
```

3. Compile contracts:
```bash
forge build
```

## Deployment

### Deploy to Flow EVM Testnet

```bash
forge script script/Deploy.s.sol --rpc-url flow_testnet --broadcast
```

Or with explicit RPC:
```bash
forge script script/Deploy.s.sol --rpc-url https://testnet.evm.nodes.onflow.org --broadcast
```

## Network Information

- **Network**: Flow EVM Testnet
- **Chain ID**: 545
- **RPC URL**: https://testnet.evm.nodes.onflow.org
- **Explorer**: https://evm-testnet.flowscan.io
- **Faucet**: https://testnet-faucet.onflow.org/

## Getting Test FLOW (EVM)

1. Go to [Flow Testnet Faucet](https://testnet-faucet.onflow.org/)
2. Enter your MetaMask address (0x...)
3. Request FLOW tokens for testing

## Contract Functions

### For Organizers
- `createMeeting()` - Create a meeting with stake requirement
- `generateAttendanceCode()` - Generate code during meeting
- `settleMeeting()` - Distribute stakes after meeting

### For Attendees
- `stake()` - Stake FLOW to commit to attending
- `submitAttendanceCode()` - Submit code to prove attendance

## Testing

Run tests:
```bash
forge test
```

Run tests with gas reporting:
```bash
forge test --gas-report
```

## Contract Addresses

After deployment, save the contract address in the frontend `.env`:
```
NEXT_PUBLIC_MEETING_STAKE_ADDRESS=0x...
```