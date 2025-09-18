import MeetingStaking from "../contracts/MeetingStaking.cdc"
import FungibleToken from "../../imports/f233dcee88fe0abe/FungibleToken.cdc"
import FlowToken from "../../imports/1654653399040a61/FlowToken.cdc"

transaction(organizerAddress: Address, meetingId: String) {
    let meetingManager: &{MeetingStaking.MeetingManagerPublic}
    let receiverCapability: Capability<&{FungibleToken.Receiver}>
    let participantAddress: Address

    prepare(signer: auth(Capabilities) &Account) {
        // Get participant's address
        self.participantAddress = signer.address

        // Get reference to organizer's MeetingManager
        self.meetingManager = getAccount(organizerAddress)
            .capabilities.get<&{MeetingStaking.MeetingManagerPublic}>(
                MeetingStaking.MeetingManagerPublicPath
            )
            .borrow() ?? panic("Could not borrow MeetingManager reference")

        // Get receiver capability
        self.receiverCapability = signer.capabilities.get<&{FungibleToken.Receiver}>(
            /public/flowTokenReceiver
        ) ?? panic("Could not get receiver capability")
    }

    execute {
        // Note: In production, this would need proper access control
        // The distributeRewards function needs to be callable by participants
        // Currently it's on MeetingManager which might not be accessible

        log("Reward claim transaction prepared. Implementation needs access control updates.")
    }
}