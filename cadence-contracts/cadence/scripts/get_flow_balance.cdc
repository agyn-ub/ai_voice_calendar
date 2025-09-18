import "FungibleToken"
import "FlowToken"

access(all) fun main(address: Address): UFix64 {
    let account = getAccount(address)
    let vaultRef = account.capabilities.get<&{FungibleToken.Balance}>(/public/flowTokenBalance)
        .borrow() ?? panic("Could not borrow balance reference")

    return vaultRef.balance
}