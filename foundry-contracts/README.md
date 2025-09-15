# Meeting Stake Smart Contract

Smart contract for staking FLOW tokens on meeting attendance.

## Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Add your private key to `.env` (get it from MetaMask)

## Deploy to Flow EVM Testnet

```bash
# Load environment variables
source .env

# Deploy the contract
forge script script/Deploy.s.sol:DeployScript --rpc-url $RPC_URL --broadcast --verify
```

## After Deployment

1. Copy the deployed contract address from the console output
2. Add it to the frontend `.env.local`:
```
NEXT_PUBLIC_MEETING_STAKE_ADDRESS=0x...your_contract_address
```

## Testing

```bash
forge test
```

## Contract Functions

- `createMeeting()` - Create a meeting with staking requirement
- `stake()` - Stake FLOW for a meeting
- `generateAttendanceCode()` - Generate attendance code (organizer only)
- `submitAttendanceCode()` - Submit code to confirm attendance
- `settleMeeting()` - Settle and distribute stakes after meeting
