import MeetingStaking from "../contracts/MeetingStaking.cdc"

access(all) fun main(organizerAddress: Address, meetingId: String): {Address: UFix64} {
    // Get the MeetingManager public capability
    let meetingManagerCap = getAccount(organizerAddress)
        .capabilities.get<&{MeetingStaking.MeetingManagerPublic}>(
            MeetingStaking.MeetingManagerPublicPath
        )

    if let meetingManager = meetingManagerCap.borrow() {
        if let meeting = meetingManager.getMeeting(meetingId: meetingId) {
            if meeting.canFinalize() {
                return meeting.calculateRewards()
            }
        }
    }

    return {}
}