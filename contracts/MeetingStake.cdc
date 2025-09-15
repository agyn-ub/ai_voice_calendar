// Testnet addresses
import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868

access(all) contract MeetingStake {

    access(all) let StakeVaultStoragePath: StoragePath
    access(all) let StakeVaultPublicPath: PublicPath
    access(all) let AdminStoragePath: StoragePath

    access(all) event MeetingCreated(meetingId: String, requiredStake: UFix64, startTime: UFix64, endTime: UFix64, organizer: Address)
    access(all) event StakeDeposited(meetingId: String, staker: Address, amount: UFix64)
    access(all) event AttendanceCodeGenerated(meetingId: String, code: String, validUntil: UFix64)
    access(all) event AttendanceConfirmed(meetingId: String, attendee: Address, code: String)
    access(all) event StakeRefunded(meetingId: String, attendee: Address, amount: UFix64)
    access(all) event StakeForfeited(meetingId: String, absentee: Address, amount: UFix64)
    access(all) event MeetingSettled(meetingId: String, totalRefunded: UFix64, totalForfeited: UFix64)

    access(all) struct MeetingInfo {
        access(all) let meetingId: String
        access(all) let organizer: Address
        access(all) let requiredStake: UFix64
        access(all) let startTime: UFix64
        access(all) let endTime: UFix64
        access(all) let checkInDeadline: UFix64
        access(all) var attendanceCode: String?
        access(all) var codeValidUntil: UFix64?
        access(all) var isSettled: Bool
        access(all) var totalStaked: UFix64
        access(all) var totalRefunded: UFix64
        access(all) var totalForfeited: UFix64

        init(
            meetingId: String,
            organizer: Address,
            requiredStake: UFix64,
            startTime: UFix64,
            endTime: UFix64
        ) {
            self.meetingId = meetingId
            self.organizer = organizer
            self.requiredStake = requiredStake
            self.startTime = startTime
            self.endTime = endTime
            self.checkInDeadline = endTime + 900.0 // 15 minutes after meeting ends
            self.attendanceCode = nil
            self.codeValidUntil = nil
            self.isSettled = false
            self.totalStaked = 0.0
            self.totalRefunded = 0.0
            self.totalForfeited = 0.0
        }

        access(all) fun setAttendanceCode(code: String, validUntil: UFix64) {
            self.attendanceCode = code
            self.codeValidUntil = validUntil
        }

        access(all) fun settle(totalRefunded: UFix64, totalForfeited: UFix64) {
            self.isSettled = true
            self.totalRefunded = totalRefunded
            self.totalForfeited = totalForfeited
        }
    }

    access(all) struct StakeInfo {
        access(all) let staker: Address
        access(all) let amount: UFix64
        access(all) let stakedAt: UFix64
        access(all) var hasCheckedIn: Bool
        access(all) var checkInTime: UFix64?
        access(all) var isRefunded: Bool

        init(staker: Address, amount: UFix64) {
            self.staker = staker
            self.amount = amount
            self.stakedAt = getCurrentBlock().timestamp
            self.hasCheckedIn = false
            self.checkInTime = nil
            self.isRefunded = false
        }

        access(all) fun confirmAttendance() {
            self.hasCheckedIn = true
            self.checkInTime = getCurrentBlock().timestamp
        }

        access(all) fun markRefunded() {
            self.isRefunded = true
        }
    }

    access(all) resource interface StakeVaultPublic {
        access(all) fun getMeetingInfo(meetingId: String): MeetingInfo?
        access(all) fun getStakeInfo(meetingId: String, staker: Address): StakeInfo?
        access(all) fun submitAttendanceCode(meetingId: String, code: String)
        access(all) fun getMeetingIds(): [String]
        access(all) fun getStakerAddresses(meetingId: String): [Address]
    }

    access(all) resource StakeVault: StakeVaultPublic {
        access(self) var meetings: {String: MeetingInfo}
        access(self) var stakes: {String: {Address: StakeInfo}}
        access(self) var escrowVaults: @{String: {FungibleToken.Vault}}

        init() {
            self.meetings = {}
            self.stakes = {}
            self.escrowVaults <- {}
        }

        access(all) fun createMeeting(
            meetingId: String,
            organizer: Address,
            requiredStake: UFix64,
            startTime: UFix64,
            endTime: UFix64
        ) {
            pre {
                self.meetings[meetingId] == nil: "Meeting already exists"
                requiredStake > 0.0: "Stake must be greater than 0"
                startTime > getCurrentBlock().timestamp: "Start time must be in the future"
                endTime > startTime: "End time must be after start time"
            }

            let meetingInfo = MeetingInfo(
                meetingId: meetingId,
                organizer: organizer,
                requiredStake: requiredStake,
                startTime: startTime,
                endTime: endTime
            )
            
            self.meetings[meetingId] = meetingInfo
            self.stakes[meetingId] = {}
            self.escrowVaults[meetingId] <-! FlowToken.createEmptyVault() as! @{FungibleToken.Vault}

            emit MeetingCreated(
                meetingId: meetingId,
                requiredStake: requiredStake,
                startTime: startTime,
                endTime: endTime,
                organizer: organizer
            )
        }

        access(all) fun depositStake(meetingId: String, vault: @{FungibleToken.Vault}, staker: Address) {
            pre {
                self.meetings[meetingId] != nil: "Meeting does not exist"
                vault.balance == self.meetings[meetingId]!.requiredStake: "Incorrect stake amount"
                self.stakes[meetingId]![staker] == nil: "Already staked for this meeting"
                getCurrentBlock().timestamp < self.meetings[meetingId]!.startTime - 3600.0: "Staking deadline passed (1 hour before meeting)"
            }

            let stakeInfo = StakeInfo(staker: staker, amount: vault.balance)
            self.stakes[meetingId]![staker] = stakeInfo
            
            let meetingVaultRef = &self.escrowVaults[meetingId] as? &{FungibleToken.Vault}
            if let meetingVault = meetingVaultRef {
                meetingVault.deposit(from: <-vault)
            } else {
                panic("Could not get meeting vault reference")
            }
            
            let currentStake = self.meetings[meetingId]!.totalStaked
            self.meetings[meetingId]!.totalStaked = currentStake + stakeInfo.amount

            emit StakeDeposited(meetingId: meetingId, staker: staker, amount: stakeInfo.amount)
        }

        access(all) fun generateAttendanceCode(meetingId: String, organizer: Address): String {
            pre {
                self.meetings[meetingId] != nil: "Meeting does not exist"
                self.meetings[meetingId]!.organizer == organizer: "Only organizer can generate code"
                getCurrentBlock().timestamp >= self.meetings[meetingId]!.startTime: "Meeting has not started"
                getCurrentBlock().timestamp <= self.meetings[meetingId]!.endTime: "Meeting has ended"
            }

            let code = self.generateRandomCode()
            let validUntil = self.meetings[meetingId]!.checkInDeadline
            
            self.meetings[meetingId]!.setAttendanceCode(code: code, validUntil: validUntil)

            emit AttendanceCodeGenerated(meetingId: meetingId, code: code, validUntil: validUntil)
            
            return code
        }

        access(all) fun submitAttendanceCode(meetingId: String, code: String) {
            pre {
                self.meetings[meetingId] != nil: "Meeting does not exist"
                self.meetings[meetingId]!.attendanceCode != nil: "No attendance code generated"
                self.meetings[meetingId]!.attendanceCode == code: "Invalid attendance code"
                getCurrentBlock().timestamp <= self.meetings[meetingId]!.codeValidUntil!: "Code has expired"
            }

            let staker = self.owner?.address ?? panic("No owner found")
            
            if let stakeInfo = self.stakes[meetingId]![staker] {
                assert(!stakeInfo.hasCheckedIn, message: "Already checked in")
                self.stakes[meetingId]![staker]!.confirmAttendance()
                emit AttendanceConfirmed(meetingId: meetingId, attendee: staker, code: code)
            } else {
                panic("No stake found for this address")
            }
        }

        access(all) fun settleMeeting(meetingId: String): {Address: UFix64} {
            pre {
                self.meetings[meetingId] != nil: "Meeting does not exist"
                !self.meetings[meetingId]!.isSettled: "Meeting already settled"
                getCurrentBlock().timestamp > self.meetings[meetingId]!.checkInDeadline: "Check-in period not ended"
            }

            let refunds: {Address: UFix64} = {}
            var totalRefunded = 0.0
            var totalForfeited = 0.0
            
            let meetingVault <- self.escrowVaults.remove(key: meetingId)!
            let organizerAddress = self.meetings[meetingId]!.organizer
            
            for address in self.stakes[meetingId]!.keys {
                let stakeInfo = self.stakes[meetingId]![address]!
                
                if stakeInfo.hasCheckedIn && !stakeInfo.isRefunded {
                    let refundAmount = stakeInfo.amount
                    let refundVault <- meetingVault.withdraw(amount: refundAmount)
                    
                    let receiverRef = getAccount(address)
                        .capabilities.get<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
                        .borrow()
                        ?? panic("Could not borrow receiver reference")
                    
                    receiverRef.deposit(from: <-refundVault)
                    self.stakes[meetingId]![address]!.markRefunded()
                    refunds[address] = refundAmount
                    totalRefunded = totalRefunded + refundAmount
                    
                    emit StakeRefunded(meetingId: meetingId, attendee: address, amount: refundAmount)
                } else if !stakeInfo.hasCheckedIn {
                    totalForfeited = totalForfeited + stakeInfo.amount
                    emit StakeForfeited(meetingId: meetingId, absentee: address, amount: stakeInfo.amount)
                }
            }
            
            if meetingVault.balance > 0.0 {
                let organizerReceiver = getAccount(organizerAddress)
                    .capabilities.get<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
                    .borrow()
                    ?? panic("Could not borrow organizer receiver reference")
                
                organizerReceiver.deposit(from: <-meetingVault)
            } else {
                destroy meetingVault
            }
            
            self.meetings[meetingId]!.settle(totalRefunded: totalRefunded, totalForfeited: totalForfeited)
            emit MeetingSettled(meetingId: meetingId, totalRefunded: totalRefunded, totalForfeited: totalForfeited)
            
            return refunds
        }

        access(all) fun getMeetingInfo(meetingId: String): MeetingInfo? {
            return self.meetings[meetingId]
        }

        access(all) fun getStakeInfo(meetingId: String, staker: Address): StakeInfo? {
            if let stakes = self.stakes[meetingId] {
                return stakes[staker]
            }
            return nil
        }

        access(all) fun getMeetingIds(): [String] {
            return self.meetings.keys
        }

        access(all) fun getStakerAddresses(meetingId: String): [Address] {
            if let stakes = self.stakes[meetingId] {
                return stakes.keys
            }
            return []
        }

        access(self) fun generateRandomCode(): String {
            let timestamp = getCurrentBlock().timestamp
            let blockId = getCurrentBlock().id
            let combined: [UInt8] = []
            for byte in blockId {
                combined.append(byte)
            }
            let timestampBytes = timestamp.toBigEndianBytes()
            for byte in timestampBytes {
                combined.append(byte)
            }
            let hash = String.encodeHex(combined)
            return hash.slice(from: 0, upTo: 6)
        }

    }

    access(all) fun createEmptyStakeVault(): @StakeVault {
        return <- create StakeVault()
    }

    init() {
        self.StakeVaultStoragePath = /storage/MeetingStakeVault
        self.StakeVaultPublicPath = /public/MeetingStakeVault
        self.AdminStoragePath = /storage/MeetingStakeAdmin

        self.account.storage.save(<- create StakeVault(), to: self.StakeVaultStoragePath)
        let cap = self.account.capabilities.storage.issue<&{StakeVaultPublic}>(self.StakeVaultStoragePath)
        self.account.capabilities.publish(cap, at: self.StakeVaultPublicPath)
    }
}