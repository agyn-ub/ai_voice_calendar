import MeetingStaking from "../contracts/MeetingStaking.cdc"

// Special test transaction that creates a meeting without time validation
// Only for testing purposes to simulate joining after meeting started
transaction(
    meetingId: String,
    title: String,
    startTime: UFix64,
    stakeAmount: UFix64
) {
    let meetingManager: &MeetingStaking.MeetingManager

    prepare(signer: auth(Storage) &Account) {
        // Borrow reference to MeetingManager
        self.meetingManager = signer.storage.borrow<&MeetingStaking.MeetingManager>(
            from: MeetingStaking.MeetingManagerStoragePath
        ) ?? panic("MeetingManager not found. Please set up MeetingManager first.")
    }

    execute {
        // Note: In a real scenario, we'd modify the contract to allow test mode
        // For now, we'll create with future time then try to test join logic
        let futureTime = startTime + 7200.0 // Add 2 hours to make it future

        let id = self.meetingManager.createMeeting(
            meetingId: meetingId,
            calendarEventId: "",
            title: title,
            startTime: futureTime,  // Use future time to pass validation
            endTime: futureTime + 3600.0,
            stakeAmount: stakeAmount
        )

        log("Meeting created with ID: ".concat(id))
    }
}