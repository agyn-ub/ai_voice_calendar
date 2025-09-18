import MeetingStaking from "../contracts/MeetingStaking.cdc"

transaction(meetingId: String, participant: Address, attended: Bool) {
    let meetingManager: auth(MeetingStaking.Owner) &MeetingStaking.MeetingManager

    prepare(signer: auth(Storage) &Account) {
        // Try to use signer's meeting manager (which may not be the organizer's)
        self.meetingManager = signer.storage.borrow<auth(MeetingStaking.Owner) &MeetingStaking.MeetingManager>(
            from: MeetingStaking.MeetingManagerStoragePath
        ) ?? panic("Could not borrow MeetingManager")
    }

    execute {
        let meeting = self.meetingManager.getMeeting(meetingId: meetingId)
            ?? panic("Meeting not found")

        meeting.markAttendance(participant: participant, attended: attended)
    }
}