import MeetingStaking from "../contracts/MeetingStaking.cdc"

access(all) fun main(userAddress: Address): [String] {
    // Get the MeetingManager public capability
    let meetingManagerCap = getAccount(userAddress)
        .capabilities.get<&{MeetingStaking.MeetingManagerPublic}>(
            MeetingStaking.MeetingManagerPublicPath
        )

    if let meetingManager = meetingManagerCap.borrow() {
        return meetingManager.getMeetingIds()
    }

    return []
}