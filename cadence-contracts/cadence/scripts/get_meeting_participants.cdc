import MeetingStaking from "../contracts/MeetingStaking.cdc"

access(all) fun main(organizerAddress: Address, meetingId: String): [Address] {
    // Get the MeetingManager public capability
    let meetingManagerCap = getAccount(organizerAddress)
        .capabilities.get<&{MeetingStaking.MeetingManagerPublic}>(
            MeetingStaking.MeetingManagerPublicPath
        )

    if let meetingManager = meetingManagerCap.borrow() {
        if let meeting = meetingManager.getMeeting(meetingId: meetingId) {
            return meeting.getParticipants()
        }
    }

    return []
}