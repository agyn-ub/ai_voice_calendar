import MeetingStaking from "../contracts/MeetingStaking.cdc"

transaction(meetingId: String) {
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

        // Check if can finalize
        assert(meeting.canFinalize(), message: "Meeting cannot be finalized yet")

        // Finalize the meeting
        meeting.finalizeMeeting()

        // Get and log statistics
        let stats = meeting.getAttendanceStats()
        log("Meeting finalized. Attendees: ".concat(stats["attended"]!.toString())
            .concat(", No-shows: ").concat(stats["noShows"]!.toString()))
    }
}