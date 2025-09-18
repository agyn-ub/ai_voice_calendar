import MeetingStaking from "../contracts/MeetingStaking.cdc"
import "FungibleToken"
import "FlowToken"

transaction(organizerAddress: Address, meetingId: String, stakeAmount: UFix64) {
    let participantVault: @{FungibleToken.Vault}
    let meetingManagerRef: &{MeetingStaking.MeetingManagerPublic}
    let participantAddress: Address

    prepare(signer: auth(Storage) &Account) {
        // Get participant's address
        self.participantAddress = signer.address

        // Get reference to organizer's MeetingManager
        self.meetingManagerRef = getAccount(organizerAddress)
            .capabilities.get<&{MeetingStaking.MeetingManagerPublic}>(
                MeetingStaking.MeetingManagerPublicPath
            )
            .borrow() ?? panic("Could not borrow MeetingManager reference")

        // Withdraw stake amount from participant's vault
        let vaultRef = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow Flow token vault")

        self.participantVault <- vaultRef.withdraw(amount: stakeAmount)
    }

    execute {
        // Get the meeting
        let meeting = self.meetingManagerRef.getMeeting(meetingId: meetingId)
            ?? panic("Meeting not found")

        // Join and stake
        meeting.addParticipant(address: self.participantAddress)
        meeting.depositStake(from: <-self.participantVault, participant: self.participantAddress)

        log("Successfully joined meeting and deposited stake")
    }
}