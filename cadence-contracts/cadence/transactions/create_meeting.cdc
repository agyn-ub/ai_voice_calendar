import MeetingStaking from "../contracts/MeetingStaking.cdc"

transaction(
    meetingId: String,
    calendarEventId: String,
    title: String,
    startTime: UFix64,
    endTime: UFix64,
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
        // Create the meeting
        let id = self.meetingManager.createMeeting(
            meetingId: meetingId,
            calendarEventId: calendarEventId,
            title: title,
            startTime: startTime,
            endTime: endTime,
            stakeAmount: stakeAmount
        )

        log("Meeting created with ID: ".concat(id))
    }
}