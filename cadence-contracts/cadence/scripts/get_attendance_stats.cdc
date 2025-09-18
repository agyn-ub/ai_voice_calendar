import MeetingStaking from "../contracts/MeetingStaking.cdc"

access(all) fun main(organizerAddress: Address, meetingId: String): {String: Int} {
    // Get the MeetingManager public capability
    let meetingManagerCap = getAccount(organizerAddress)
        .capabilities.get<&{MeetingStaking.MeetingManagerPublic}>(
            MeetingStaking.MeetingManagerPublicPath
        )

    if let meetingManager = meetingManagerCap.borrow() {
        if let meeting = meetingManager.getMeeting(meetingId: meetingId) {
            return meeting.getAttendanceStats()
        }
    }

    return {
        "total": 0,
        "attended": 0,
        "staked": 0,
        "attendedAndStaked": 0,
        "noShows": 0
    }
}