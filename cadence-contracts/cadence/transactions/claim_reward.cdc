import MeetingStaking from "../contracts/MeetingStaking.cdc"
import "FungibleToken"
import "FlowToken"

transaction(organizerAddress: Address, meetingId: String) {
    let meetingManager: &MeetingStaking.MeetingManager
    let receiverVault: &FlowToken.Vault
    let participantAddress: Address

    prepare(signer: auth(Storage) &Account) {
        // Get participant's address
        self.participantAddress = signer.address

        // Get reference to organizer's MeetingManager (needs to be the organizer signing)
        self.meetingManager = signer.storage.borrow<&MeetingStaking.MeetingManager>(
            from: MeetingStaking.MeetingManagerStoragePath
        ) ?? panic("MeetingManager not found. This transaction must be signed by the organizer.")

        // Get receiver vault reference
        self.receiverVault = signer.storage.borrow<&FlowToken.Vault>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow Flow token vault")
    }

    execute {
        // Claim reward using the new function
        self.meetingManager.claimReward(
            meetingId: meetingId,
            participant: self.participantAddress,
            recipientVault: self.receiverVault
        )

        log("Reward claimed successfully")
    }
}