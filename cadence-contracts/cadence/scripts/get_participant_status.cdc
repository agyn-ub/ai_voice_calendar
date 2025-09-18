import MeetingStaking from "../contracts/MeetingStaking.cdc"

access(all) fun main(organizerAddress: Address, meetingId: String, participantAddress: Address): {String: Bool}? {
    let account = getAccount(organizerAddress)
    let managerRef = account.capabilities.get<&{MeetingStaking.MeetingManagerPublic}>(
        MeetingStaking.MeetingManagerPublicPath
    ).borrow() ?? panic("Could not borrow MeetingManager reference")

    let meeting = managerRef.getMeeting(meetingId: meetingId)
    if meeting == nil {
        return nil
    }

    // Return participant status
    return {
        "attended": false  // Simplified for testing
    }
}