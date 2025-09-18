import MeetingStaking from "../contracts/MeetingStaking.cdc"

access(all) fun main(organizerAddress: Address, meetingId: String): {String: AnyStruct}? {
    // Get the MeetingManager public capability
    let meetingManagerCap = getAccount(organizerAddress)
        .capabilities.get<&{MeetingStaking.MeetingManagerPublic}>(
            MeetingStaking.MeetingManagerPublicPath
        )

    if let meetingManager = meetingManagerCap.borrow() {
        if let meeting = meetingManager.getMeeting(meetingId: meetingId) {
            return {
                "meetingId": meeting.meetingId,
                "calendarEventId": meeting.calendarEventId,
                "organizer": meeting.organizer,
                "title": meeting.title,
                "startTime": meeting.startTime,
                "endTime": meeting.endTime,
                "stakeAmount": meeting.stakeAmount,
                "totalStaked": meeting.totalStaked,
                "isFinalized": meeting.isFinalized,
                "createdAt": meeting.createdAt,
                "participantCount": meeting.getParticipants().length
            }
        }
    }

    return nil
}