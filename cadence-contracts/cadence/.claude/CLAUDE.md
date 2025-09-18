# Cadence Development Instructions

## Syntax Requirements

- Always use proper resource syntax: @{NonFungibleToken.NFT}
- Implement required interfaces: NonFungibleToken, MetadataViews
- Use view functions for read-only operations
- Follow auth capability patterns for transactions

## Testing Protocol

- Write unit tests for all contract functions
- Test resource creation and destruction
- Verify proper event emission
- Validate access controls and permissions
- Test for breaking changes and edge cases

## Standard Patterns

Reference the Flow documentation for:

- Contract deployment and initialization
- Resource collection patterns
- Proper error handling and panics
- Gas optimization techniques
