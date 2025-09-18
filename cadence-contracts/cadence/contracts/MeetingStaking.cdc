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
        access(all) var totalStaked: UFix64
        access(all) var isFinalized: Bool
        access(all) let createdAt: UFix64
        access(self) var stakeVault: @FlowToken.Vault

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
            self.totalStaked = 0.0
            self.isFinalized = false
            self.createdAt = getCurrentBlock().timestamp
            self.stakeVault <- FlowToken.createEmptyVault() as! @FlowToken.Vault
        }

        // Deposit stake from participant
        access(all) fun depositStake(from: @FungibleToken.Vault, participant: Address) {
            pre {
                from.balance == self.stakeAmount: "Stake amount must match required amount"
                !self.isFinalized: "Meeting already finalized"
                getCurrentBlock().timestamp < self.startTime: "Meeting has already started"
            }

            // Add or update participant
            if self.participants[participant] == nil {
                self.participants[participant] = Participant(address: participant)
            }

            let participantData = self.participants[participant]!
            participantData.hasStaked = true
            self.participants[participant] = participantData

            // Deposit stake to vault
            self.stakeVault.deposit(from: <-from)
            self.totalStaked = self.totalStaked + self.stakeAmount
        }

        // Withdraw stake (only for organizer to distribute after meeting)
        access(self) fun withdrawStake(amount: UFix64): @FungibleToken.Vault {
            return <-self.stakeVault.withdraw(amount: amount)
        }

        destroy() {
            destroy self.stakeVault
        }
    }

    // Participant struct to track individual participation
    access(all) struct Participant {
        access(all) let address: Address
        access(all) let joinedAt: UFix64
        access(all) var hasStaked: Bool
        access(all) var hasAttended: Bool

        init(address: Address) {
            self.address = address
            self.joinedAt = getCurrentBlock().timestamp
            self.hasStaked = false
            self.hasAttended = false
        }
    }

    // Public interface for MeetingManager
    access(all) resource interface MeetingManagerPublic {
        access(all) fun getMeetingIds(): [String]
        access(all) fun getMeeting(meetingId: String): &Meeting?
    }

    // MeetingManager resource to manage all meetings for a user
    access(all) resource MeetingManager: MeetingManagerPublic {
        access(all) var meetings: @{String: Meeting}

        init() {
            self.meetings <- {}
        }

        // Create a new meeting
        access(all) fun createMeeting(
            meetingId: String,
            calendarEventId: String,
            title: String,
            startTime: UFix64,
            endTime: UFix64,
            stakeAmount: UFix64
        ): String {
            pre {
                self.meetings[meetingId] == nil: "Meeting with this ID already exists"
                stakeAmount > 0.0: "Stake amount must be positive"
                startTime > getCurrentBlock().timestamp: "Start time must be in the future"
                endTime > startTime: "End time must be after start time"
            }

            let meeting <- create Meeting(
                meetingId: meetingId,
                calendarEventId: calendarEventId,
                organizer: self.owner!.address,
                title: title,
                startTime: startTime,
                endTime: endTime,
                stakeAmount: stakeAmount
            )

            self.meetings[meetingId] <-! meeting
            return meetingId
        }

        // Get list of meeting IDs
        access(all) fun getMeetingIds(): [String] {
            return self.meetings.keys
        }

        // Get reference to a specific meeting
        access(all) fun getMeeting(meetingId: String): &Meeting? {
            return &self.meetings[meetingId] as &Meeting?
        }

        // Remove a meeting (only if not started and no stakes)
        access(all) fun removeMeeting(meetingId: String) {
            pre {
                self.meetings[meetingId] != nil: "Meeting does not exist"
            }

            let meeting <- self.meetings.remove(key: meetingId)!
            assert(meeting.totalStaked == 0.0, message: "Cannot remove meeting with stakes")
            assert(getCurrentBlock().timestamp < meeting.startTime, message: "Cannot remove started meeting")
            destroy meeting
        }

        destroy() {
            destroy self.meetings
        }
    }

    // Create new MeetingManager resource
    access(all) fun createMeetingManager(): @MeetingManager {
        return <-create MeetingManager()
    }

    // Contract initialization
    init() {
        // Set storage paths
        self.MeetingManagerStoragePath = /storage/MeetingManager
        self.MeetingManagerPublicPath = /public/MeetingManager
        self.MeetingManagerPrivatePath = /private/MeetingManager
    }
}