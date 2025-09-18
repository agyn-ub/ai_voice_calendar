import MeetingStaking from "../contracts/MeetingStaking.cdc"

// Mark attendance for a single participant (used in tests)
transaction(meetingId: String, participant: Address, attended: Bool) {
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

        // Mark individual attendance
        meeting.markAttendance(participant: participant, attended: attended)

        let status = attended ? "attended" : "did not attend"
        log("Marked participant ".concat(participant.toString()).concat(" as ").concat(status))
    }
}