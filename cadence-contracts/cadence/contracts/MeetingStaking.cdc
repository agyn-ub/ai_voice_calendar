import FungibleToken from "../../imports/f233dcee88fe0abe/FungibleToken.cdc"
import FlowToken from "../../imports/1654653399040a61/FlowToken.cdc"

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

            var participantData = self.participants[participant]!
            participantData.setHasStaked(true)
            self.participants[participant] = participantData

            // Deposit stake to vault
            self.stakeVault.deposit(from: <-from)
            self.totalStaked = self.totalStaked + self.stakeAmount
        }

        // Add participant to meeting (without stake initially)
        access(all) fun addParticipant(address: Address) {
            pre {
                !self.isFinalized: "Meeting already finalized"
                self.participants[address] == nil: "Participant already added"
            }

            self.participants[address] = Participant(address: address)
        }

        // Get participant info
        access(all) fun getParticipant(address: Address): Participant? {
            return self.participants[address]
        }

        // Get all participants
        access(all) fun getParticipants(): [Address] {
            return self.participants.keys
        }

        // Check if participant has joined
        access(all) fun hasParticipant(address: Address): Bool {
            return self.participants[address] != nil
        }

        // Remove participant (only if not staked)
        access(all) fun removeParticipant(address: Address) {
            pre {
                self.participants[address] != nil: "Participant not found"
                !self.participants[address]!.getHasStaked(): "Cannot remove staked participant"
                !self.isFinalized: "Meeting already finalized"
            }

            self.participants.remove(key: address)
        }

        // Mark participant as attended (organizer only)
        access(all) fun markAttendance(participant: Address, attended: Bool) {
            pre {
                self.participants[participant] != nil: "Participant not found"
                getCurrentBlock().timestamp >= self.startTime: "Meeting has not started yet"
                !self.isFinalized: "Meeting already finalized"
            }

            var participantData = self.participants[participant]!
            participantData.setHasAttended(attended)
            self.participants[participant] = participantData
        }

        // Batch mark attendance for multiple participants
        access(all) fun markBatchAttendance(attendees: [Address]) {
            pre {
                getCurrentBlock().timestamp >= self.startTime: "Meeting has not started yet"
                !self.isFinalized: "Meeting already finalized"
            }

            // Mark all participants as not attended first
            for address in self.participants.keys {
                var participantData = self.participants[address]!
                participantData.setHasAttended(false)
                self.participants[address] = participantData
            }

            // Mark attendees as attended
            for attendee in attendees {
                if self.participants[attendee] != nil {
                    var participantData = self.participants[attendee]!
                    participantData.setHasAttended(true)
                    self.participants[attendee] = participantData
                }
            }
        }

        // Verify meeting can be finalized
        access(all) fun canFinalize(): Bool {
            return getCurrentBlock().timestamp >= self.endTime && !self.isFinalized
        }

        // Get attendance statistics
        access(all) fun getAttendanceStats(): {String: Int} {
            var totalParticipants = 0
            var attendedCount = 0
            var stakedCount = 0
            var attendedAndStaked = 0

            for participant in self.participants.values {
                totalParticipants = totalParticipants + 1
                if participant.getHasAttended() {
                    attendedCount = attendedCount + 1
                }
                if participant.getHasStaked() {
                    stakedCount = stakedCount + 1
                    if participant.getHasAttended() {
                        attendedAndStaked = attendedAndStaked + 1
                    }
                }
            }

            return {
                "total": totalParticipants,
                "attended": attendedCount,
                "staked": stakedCount,
                "attendedAndStaked": attendedAndStaked,
                "noShows": stakedCount - attendedAndStaked
            }
        }

        // Calculate reward distribution
        access(all) fun calculateRewards(): {Address: UFix64} {
            pre {
                self.canFinalize(): "Meeting not ready to finalize"
            }

            var rewards: {Address: UFix64} = {}
            let stats = self.getAttendanceStats()
            let noShows = stats["noShows"]!
            let attendedAndStaked = stats["attendedAndStaked"]!

            if noShows > 0 && attendedAndStaked > 0 {
                // Calculate penalty pool from no-shows
                let penaltyPool = UFix64(noShows) * self.stakeAmount
                let bonusPerAttendee = penaltyPool / UFix64(attendedAndStaked)

                // Distribute rewards to attendees who staked
                for participant in self.participants.values {
                    if participant.getHasStaked() {
                        if participant.getHasAttended() {
                            // Attendee gets their stake back plus bonus
                            rewards[participant.address] = self.stakeAmount + bonusPerAttendee
                        } else {
                            // No-show forfeits their stake
                            rewards[participant.address] = 0.0
                        }
                    }
                }
            } else {
                // No penalties to distribute, everyone who staked gets their money back
                for participant in self.participants.values {
                    if participant.getHasStaked() {
                        rewards[participant.address] = self.stakeAmount
                    }
                }
            }

            return rewards
        }

        // Finalize meeting and prepare for distribution
        access(all) fun finalizeMeeting() {
            pre {
                self.canFinalize(): "Meeting not ready to finalize"
                !self.isFinalized: "Meeting already finalized"
            }

            self.isFinalized = true
        }

        // Withdraw stake (only for organizer to distribute after meeting)
        access(self) fun withdrawStake(amount: UFix64): @FungibleToken.Vault {
            return <-self.stakeVault.withdraw(amount: amount)
        }

    }

    // Participant struct to track individual participation
    access(all) struct Participant {
        access(all) let address: Address
        access(all) let joinedAt: UFix64
        access(self) var hasStaked: Bool
        access(self) var hasAttended: Bool

        init(address: Address) {
            self.address = address
            self.joinedAt = getCurrentBlock().timestamp
            self.hasStaked = false
            self.hasAttended = false
        }

        access(all) fun getHasStaked(): Bool {
            return self.hasStaked
        }

        access(all) fun getHasAttended(): Bool {
            return self.hasAttended
        }

        access(all) fun setHasStaked(_ value: Bool) {
            self.hasStaked = value
        }

        access(all) fun setHasAttended(_ value: Bool) {
            self.hasAttended = value
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
            return &self.meetings[meetingId]
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