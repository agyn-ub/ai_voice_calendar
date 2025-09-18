import "FlowToken"
import "FungibleToken"

transaction(recipient: Address, amount: UFix64) {
    let minter: &FlowToken.Minter

    prepare(signer: auth(Storage) &Account) {
        self.minter = signer.storage.borrow<&FlowToken.Minter>(
            from: /storage/flowTokenMinter
        ) ?? panic("Could not borrow minter")
    }

    execute {
        let recipientVault = getAccount(recipient)
            .capabilities.get<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
            .borrow() ?? panic("Could not borrow receiver")

        recipientVault.deposit(from: <-self.minter.mintTokens(amount: amount))
    }
}