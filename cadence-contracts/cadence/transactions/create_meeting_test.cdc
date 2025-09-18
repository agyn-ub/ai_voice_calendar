import MeetingStaking from "../contracts/MeetingStaking.cdc"

// Simplified create meeting transaction for tests (without calendar event ID and end time)
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
        // Create the meeting with default calendar event ID and end time
        let id = self.meetingManager.createMeeting(
            meetingId: meetingId,
            calendarEventId: "",  // Empty for test
            title: title,
            startTime: startTime,
            endTime: startTime + 3600.0,  // Default to 1 hour meeting
            stakeAmount: stakeAmount
        )

        log("Meeting created with ID: ".concat(id))
    }
}