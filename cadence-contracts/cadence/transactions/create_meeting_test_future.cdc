import MeetingStaking from "../contracts/MeetingStaking.cdc"

// Create meeting transaction that always creates a meeting in the future
// Used for tests to avoid timing issues
transaction(
    meetingId: String,
    title: String,
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
        // Always create meeting 3600 seconds in the future from current time
        let startTime = getCurrentBlock().timestamp + 3600.0
        let endTime = startTime + 3600.0

        // Create the meeting with default calendar event ID and calculated times
        let id = self.meetingManager.createMeeting(
            meetingId: meetingId,
            calendarEventId: "",  // Empty for test
            title: title,
            startTime: startTime,
            endTime: endTime,
            stakeAmount: stakeAmount
        )

        log("Meeting created with ID: ".concat(id))
    }
}