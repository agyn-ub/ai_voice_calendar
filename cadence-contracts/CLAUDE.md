# Flow Project AI Assistant Configuration

## Project Overview

This is a Flow blockchain application with Cadence smart contracts and FCL frontend integration.

## Team-wide Development Standards

- MCP servers standardized across development environments
- Git workflow and commit message standards enforced
- Follow official Flow documentation patterns
- Use incremental, checkpoint-based development
- Test on emulator before testnet deployment
- Implement proper resource handling with @ and & syntax
- Follow MetadataViews standards for NFT projects

## Frequently Used Commands

- `flow emulator start` - Start local development environment
- `flow project deploy --network emulator` - Deploy contracts locally
- `flow transactions send ./cadence/transactions/example.cdc --network emulator` - Execute transactions locally
- `npm run dev` - Start frontend development server

## Key Files to Reference

- flow.json - Project configuration and contract deployments
- cadence/contracts/ - Smart contract implementations
- frontend/src/config.js - FCL configuration and contract addresses

## MCP Servers

- Use flow-mcp for reading blockchain data, managing accounts, checking balances, and interacting with native contracts.
- Use flow-defi-mcp fro checking token prices, swapping tokens on decentralized exchanges, and interacting with ERC20 tokens.

## Architecture Notes

[Document your specific project architecture, contract relationships, and deployment strategies]
