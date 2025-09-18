import MeetingStaking from "../contracts/MeetingStaking.cdc"

transaction(meetingId: String, attendees: [Address]) {
    let meetingManager: &MeetingStaking.MeetingManager

    prepare(signer: auth(Storage) &Account) {
        // Borrow reference to MeetingManager
        self.meetingManager = signer.storage.borrow<&MeetingStaking.MeetingManager>(
            from: MeetingStaking.MeetingManagerStoragePath
        ) ?? panic("MeetingManager not found")
    }

    execute {
        // Get the meeting
        let meeting = self.meetingManager.getMeeting(meetingId: meetingId)
            ?? panic("Meeting not found")

        // Mark batch attendance
        meeting.markBatchAttendance(attendees: attendees)

        log("Attendance marked for ".concat(attendees.length.toString()).concat(" participants"))
    }
}