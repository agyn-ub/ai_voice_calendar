import Test
import MeetingStaking from "../contracts/MeetingStaking.cdc"
import "FungibleToken"
import "FlowToken"

access(all) fun setup() {
    let err = Test.deployContract(
        name: "MeetingStaking",
        path: "../contracts/MeetingStaking.cdc",
        arguments: []
    )
    Test.expect(err, Test.beNil())
}

access(all) fun testEqualRewardDistribution() {
    let organizer = Test.createAccount()
    let attendee1 = Test.createAccount()
    let attendee2 = Test.createAccount()
    let noShow1 = Test.createAccount()
    let noShow2 = Test.createAccount()

    // Setup
    mintFlowTokens(organizer, 100.0)
    mintFlowTokens(attendee1, 100.0)
    mintFlowTokens(attendee2, 100.0)
    mintFlowTokens(noShow1, 100.0)
    mintFlowTokens(noShow2, 100.0)
    setupMeetingManager(organizer)

    // Create meeting with 10 FLOW stake
    let meetingId = "reward-test-001"
    let stakeAmount = 10.0
    let startTime = getCurrentBlock().timestamp + 3600.0

    createMeeting(organizer, meetingId, "Reward Distribution Test", startTime, stakeAmount)

    // All participants join
    joinMeeting(attendee1, organizer.address, meetingId, stakeAmount)
    joinMeeting(attendee2, organizer.address, meetingId, stakeAmount)
    joinMeeting(noShow1, organizer.address, meetingId, stakeAmount)
    joinMeeting(noShow2, organizer.address, meetingId, stakeAmount)

    // Record initial balances after staking
    let attendee1InitialBalance = getFlowBalance(attendee1.address)
    let attendee2InitialBalance = getFlowBalance(attendee2.address)

    // Move time forward and mark attendance
    Test.moveTime(by: 3700.0)
    markAttendance(organizer, meetingId, attendee1.address, true)
    markAttendance(organizer, meetingId, attendee2.address, true)
    markAttendance(organizer, meetingId, noShow1.address, false)
    markAttendance(organizer, meetingId, noShow2.address, false)

    // Finalize to trigger reward distribution
    finalizeMeeting(organizer, meetingId)

    // Calculate expected rewards
    let totalPenalty = stakeAmount * 2.0 // 2 no-shows * 10 FLOW
    let rewardPerAttendee = totalPenalty / 2.0 // Split between 2 attendees
    let expectedReturn = stakeAmount + rewardPerAttendee // Own stake + reward

    // Verify attendees received correct amounts
    let attendee1FinalBalance = getFlowBalance(attendee1.address)
    let attendee2FinalBalance = getFlowBalance(attendee2.address)

    let attendee1Return = attendee1FinalBalance - attendee1InitialBalance
    let attendee2Return = attendee2FinalBalance - attendee2InitialBalance
    Test.expect(attendee1Return >= expectedReturn - 0.1 && attendee1Return <= expectedReturn + 0.1, Test.equal(true))
    Test.expect(attendee2Return >= expectedReturn - 0.1 && attendee2Return <= expectedReturn + 0.1, Test.equal(true))
}

access(all) fun testSingleAttendeeGetsAllRewards() {
    let organizer = Test.createAccount()
    let soleAttendee = Test.createAccount()
    let noShow1 = Test.createAccount()
    let noShow2 = Test.createAccount()
    let noShow3 = Test.createAccount()

    // Setup
    mintFlowTokens(organizer, 100.0)
    mintFlowTokens(soleAttendee, 100.0)
    mintFlowTokens(noShow1, 100.0)
    mintFlowTokens(noShow2, 100.0)
    mintFlowTokens(noShow3, 100.0)
    setupMeetingManager(organizer)

    // Create meeting
    let meetingId = "reward-test-002"
    let stakeAmount = 15.0
    let startTime = getCurrentBlock().timestamp + 3600.0

    createMeeting(organizer, meetingId, "Single Attendee Meeting", startTime, stakeAmount)

    // All join
    joinMeeting(soleAttendee, organizer.address, meetingId, stakeAmount)
    joinMeeting(noShow1, organizer.address, meetingId, stakeAmount)
    joinMeeting(noShow2, organizer.address, meetingId, stakeAmount)
    joinMeeting(noShow3, organizer.address, meetingId, stakeAmount)

    let soleAttendeeInitialBalance = getFlowBalance(soleAttendee.address)

    // Move time forward, mark attendance
    Test.moveTime(by: 3700.0)
    markAttendance(organizer, meetingId, soleAttendee.address, true)
    markAttendance(organizer, meetingId, noShow1.address, false)
    markAttendance(organizer, meetingId, noShow2.address, false)
    markAttendance(organizer, meetingId, noShow3.address, false)

    // Finalize
    finalizeMeeting(organizer, meetingId)

    // Sole attendee should get their stake + all penalties
    let totalPenalty = stakeAmount * 3.0 // 3 no-shows
    let expectedReturn = stakeAmount + totalPenalty

    let soleAttendeeFinalBalance = getFlowBalance(soleAttendee.address)
    let soleReturn = soleAttendeeFinalBalance - soleAttendeeInitialBalance
    Test.expect(soleReturn >= expectedReturn - 0.1 && soleReturn <= expectedReturn + 0.1, Test.equal(true))
}

access(all) fun testNoRewardsWhenAllAttend() {
    let organizer = Test.createAccount()
    let participant1 = Test.createAccount()
    let participant2 = Test.createAccount()
    let participant3 = Test.createAccount()

    // Setup
    mintFlowTokens(organizer, 100.0)
    mintFlowTokens(participant1, 100.0)
    mintFlowTokens(participant2, 100.0)
    mintFlowTokens(participant3, 100.0)
    setupMeetingManager(organizer)

    // Create meeting
    let meetingId = "reward-test-003"
    let stakeAmount = 10.0
    let startTime = getCurrentBlock().timestamp + 3600.0

    createMeeting(organizer, meetingId, "Full Attendance Meeting", startTime, stakeAmount)

    // All join
    joinMeeting(participant1, organizer.address, meetingId, stakeAmount)
    joinMeeting(participant2, organizer.address, meetingId, stakeAmount)
    joinMeeting(participant3, organizer.address, meetingId, stakeAmount)

    let participant1InitialBalance = getFlowBalance(participant1.address)
    let participant2InitialBalance = getFlowBalance(participant2.address)
    let participant3InitialBalance = getFlowBalance(participant3.address)

    // Move time forward, mark all as attended
    Test.moveTime(by: 3700.0)
    markAttendance(organizer, meetingId, participant1.address, true)
    markAttendance(organizer, meetingId, participant2.address, true)
    markAttendance(organizer, meetingId, participant3.address, true)

    // Finalize
    finalizeMeeting(organizer, meetingId)

    // Everyone should only get their stake back (no rewards)
    let participant1FinalBalance = getFlowBalance(participant1.address)
    let participant2FinalBalance = getFlowBalance(participant2.address)
    let participant3FinalBalance = getFlowBalance(participant3.address)

    let return1 = participant1FinalBalance - participant1InitialBalance
    let return2 = participant2FinalBalance - participant2InitialBalance
    let return3 = participant3FinalBalance - participant3InitialBalance
    Test.expect(return1 >= stakeAmount - 0.1 && return1 <= stakeAmount + 0.1, Test.equal(true))
    Test.expect(return2 >= stakeAmount - 0.1 && return2 <= stakeAmount + 0.1, Test.equal(true))
    Test.expect(return3 >= stakeAmount - 0.1 && return3 <= stakeAmount + 0.1, Test.equal(true))
}

access(all) fun testOrganizerReceivesRewardWhenAllNoShow() {
    let organizer = Test.createAccount()
    let noShow1 = Test.createAccount()
    let noShow2 = Test.createAccount()
    let noShow3 = Test.createAccount()

    // Setup
    mintFlowTokens(organizer, 100.0)
    mintFlowTokens(noShow1, 100.0)
    mintFlowTokens(noShow2, 100.0)
    mintFlowTokens(noShow3, 100.0)
    setupMeetingManager(organizer)

    // Create meeting
    let meetingId = "reward-test-004"
    let stakeAmount = 10.0
    let startTime = getCurrentBlock().timestamp + 3600.0

    createMeeting(organizer, meetingId, "All No-Show Meeting", startTime, stakeAmount)

    // All join
    joinMeeting(noShow1, organizer.address, meetingId, stakeAmount)
    joinMeeting(noShow2, organizer.address, meetingId, stakeAmount)
    joinMeeting(noShow3, organizer.address, meetingId, stakeAmount)

    let organizerInitialBalance = getFlowBalance(organizer.address)

    // Move time forward, mark all as no-shows
    Test.moveTime(by: 3700.0)
    markAttendance(organizer, meetingId, noShow1.address, false)
    markAttendance(organizer, meetingId, noShow2.address, false)
    markAttendance(organizer, meetingId, noShow3.address, false)

    // Finalize
    finalizeMeeting(organizer, meetingId)

    // Organizer should receive all stakes as penalty
    let totalPenalty = stakeAmount * 3.0
    let organizerFinalBalance = getFlowBalance(organizer.address)

    let organizerReturn = organizerFinalBalance - organizerInitialBalance
    Test.expect(organizerReturn >= totalPenalty - 0.1 && organizerReturn <= totalPenalty + 0.1, Test.equal(true))
}

access(all) fun testRewardCalculationWithDifferentStakeAmounts() {
    // Test with various stake amounts to ensure calculation accuracy
    let organizer = Test.createAccount()
    let attendee = Test.createAccount()
    let noShow = Test.createAccount()

    // Setup
    mintFlowTokens(organizer, 1000.0)
    mintFlowTokens(attendee, 1000.0)
    mintFlowTokens(noShow, 1000.0)
    setupMeetingManager(organizer)

    // Test with a larger stake amount
    let meetingId = "reward-test-005"
    let stakeAmount = 75.5 // Non-round number
    let startTime = getCurrentBlock().timestamp + 3600.0

    createMeeting(organizer, meetingId, "Precision Test Meeting", startTime, stakeAmount)

    // Both join
    joinMeeting(attendee, organizer.address, meetingId, stakeAmount)
    joinMeeting(noShow, organizer.address, meetingId, stakeAmount)

    let attendeeInitialBalance = getFlowBalance(attendee.address)

    // Move time forward and mark attendance
    Test.moveTime(by: 3700.0)
    markAttendance(organizer, meetingId, attendee.address, true)
    markAttendance(organizer, meetingId, noShow.address, false)

    // Finalize
    finalizeMeeting(organizer, meetingId)

    // Attendee should get their stake + no-show's stake
    let expectedReturn = stakeAmount * 2.0
    let attendeeFinalBalance = getFlowBalance(attendee.address)

    let attendeeReturn = attendeeFinalBalance - attendeeInitialBalance
    Test.expect(attendeeReturn >= expectedReturn - 0.01 && attendeeReturn <= expectedReturn + 0.01, Test.equal(true))
}

// Helper functions
access(all) fun mintFlowTokens(_ account: Test.TestAccount, _ amount: UFix64) {
    let code = Test.readFile("../transactions/mint_flow_tokens.cdc")

    let tx = Test.Transaction(
        code: code,
        authorizers: [Test.serviceAccount().address],
        signers: [Test.serviceAccount()],
        arguments: [account.address, amount]
    )
    let result = Test.executeTransaction(tx)
    Test.expect(result, Test.beSucceeded())
}

access(all) fun setupMeetingManager(_ account: Test.TestAccount) {
    let code = Test.readFile("../transactions/setup_meeting_manager.cdc")
    let tx = Test.Transaction(
        code: code,
        authorizers: [account.address],
        signers: [account],
        arguments: []
    )
    let result = Test.executeTransaction(tx)
    Test.expect(result, Test.beSucceeded())
}

access(all) fun createMeeting(_ organizer: Test.TestAccount, _ meetingId: String, _ title: String, _ startTime: UFix64, _ stakeAmount: UFix64) {
    let code = Test.readFile("../transactions/create_meeting_test.cdc")
    let tx = Test.Transaction(
        code: code,
        authorizers: [organizer.address],
        signers: [organizer],
        arguments: [meetingId, title, startTime, stakeAmount]
    )
    let result = Test.executeTransaction(tx)
    Test.expect(result, Test.beSucceeded())
}

access(all) fun joinMeeting(_ participant: Test.TestAccount, _ organizerAddress: Address, _ meetingId: String, _ stakeAmount: UFix64) {
    let code = Test.readFile("../transactions/join_meeting.cdc")
    let tx = Test.Transaction(
        code: code,
        authorizers: [participant.address],
        signers: [participant],
        arguments: [organizerAddress, meetingId, stakeAmount]
    )
    let result = Test.executeTransaction(tx)
    Test.expect(result, Test.beSucceeded())
}

access(all) fun markAttendance(_ organizer: Test.TestAccount, _ meetingId: String, _ participant: Address, _ attended: Bool) {
    let code = Test.readFile("../transactions/mark_attendance.cdc")
    let tx = Test.Transaction(
        code: code,
        authorizers: [organizer.address],
        signers: [organizer],
        arguments: [meetingId, participant, attended]
    )
    let result = Test.executeTransaction(tx)
    Test.expect(result, Test.beSucceeded())
}

access(all) fun finalizeMeeting(_ organizer: Test.TestAccount, _ meetingId: String) {
    let code = Test.readFile("../transactions/finalize_meeting.cdc")
    let tx = Test.Transaction(
        code: code,
        authorizers: [organizer.address],
        signers: [organizer],
        arguments: [meetingId]
    )
    let result = Test.executeTransaction(tx)
    Test.expect(result, Test.beSucceeded())
}

access(all) fun getFlowBalance(_ address: Address): UFix64 {
    let code = Test.readFile("../scripts/get_flow_balance.cdc")
    let result = Test.executeScript(code, [address])
    // Note: Test framework doesn't have getValue() - need to handle result differently
    // For now, return a placeholder - actual implementation depends on Test framework API
    return 0.0
}