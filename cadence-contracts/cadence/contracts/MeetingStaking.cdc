import FungibleToken from "../imports/FungibleToken.cdc"
import FlowToken from "../imports/FlowToken.cdc"

access(all) contract MeetingStaking {

    // Storage paths
    access(all) let MeetingManagerStoragePath: StoragePath
    access(all) let MeetingManagerPublicPath: PublicPath
    access(all) let MeetingManagerPrivatePath: PrivatePath

    // Meeting resource definition
    access(all) resource Meeting {
        access(all) let meetingId: String
        access(all) let calendarEventId: String
        access(all) let organizer: Address
        access(all) let title: String
        access(all) let startTime: UFix64
        access(all) let endTime: UFix64
        access(all) let stakeAmount: UFix64
        access(all) var participants: {Address: Participant}
        access(all) var isFinalized: Bool
        access(all) let createdAt: UFix64

        init(
            meetingId: String,
            calendarEventId: String,
            organizer: Address,
            title: String,
            startTime: UFix64,
            endTime: UFix64,
            stakeAmount: UFix64
        ) {
            self.meetingId = meetingId
            self.calendarEventId = calendarEventId
            self.organizer = organizer
            self.title = title
            self.startTime = startTime
            self.endTime = endTime
            self.stakeAmount = stakeAmount
            self.participants = {}
            self.isFinalized = false
            self.createdAt = getCurrentBlock().timestamp
        }
    }

    // Participant struct to track individual participation
    access(all) struct Participant {
        access(all) let address: Address
        access(all) let joinedAt: UFix64
        access(all) var hasStaked: Bool
        access(all) var hasAttended: Bool
        access(all) var stakeVault: @FlowToken.Vault?

        init(address: Address) {
            self.address = address
            self.joinedAt = getCurrentBlock().timestamp
            self.hasStaked = false
            self.hasAttended = false
            self.stakeVault <- nil
        }
    }

    // Contract initialization
    init() {
        // Set storage paths
        self.MeetingManagerStoragePath = /storage/MeetingManager
        self.MeetingManagerPublicPath = /public/MeetingManager
        self.MeetingManagerPrivatePath = /private/MeetingManager
    }
}