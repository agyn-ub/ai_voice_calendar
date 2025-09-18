import MeetingStaking from "../contracts/MeetingStaking.cdc"

transaction {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Check if MeetingManager already exists
        if signer.storage.borrow<&MeetingStaking.MeetingManager>(from: MeetingStaking.MeetingManagerStoragePath) == nil {
            // Create and save MeetingManager resource
            let meetingManager <- MeetingStaking.createMeetingManager()
            signer.storage.save(<-meetingManager, to: MeetingStaking.MeetingManagerStoragePath)

            // Create public capability
            let publicCap = signer.capabilities.storage.issue<&{MeetingStaking.MeetingManagerPublic}>(
                MeetingStaking.MeetingManagerStoragePath
            )
            signer.capabilities.publish(publicCap, at: MeetingStaking.MeetingManagerPublicPath)
        }
    }

    execute {
        log("MeetingManager setup completed")
    }
}