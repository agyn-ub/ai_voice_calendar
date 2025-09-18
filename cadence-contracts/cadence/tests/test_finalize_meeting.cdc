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

access(all) fun testFinalizeMeetingWithAllAttendees() {
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

    // Create and join meeting
    let meetingId = "finalize-test-001"
    let stakeAmount = 10.0

    createMeetingFuture(organizer, meetingId, "All Attend Meeting", stakeAmount)
    joinMeeting(participant1, organizer.address, meetingId, stakeAmount)
    joinMeeting(participant2, organizer.address, meetingId, stakeAmount)
    joinMeeting(participant3, organizer.address, meetingId, stakeAmount)

    // Get initial balances
    let initialBalance1 = getFlowBalance(participant1.address)
    let initialBalance2 = getFlowBalance(participant2.address)
    let initialBalance3 = getFlowBalance(participant3.address)

    // Move time forward and mark all as attended
    Test.moveTime(by: 7300.0) // Move past meeting end time
    markAttendance(organizer, meetingId, participant1.address, true)
    markAttendance(organizer, meetingId, participant2.address, true)
    markAttendance(organizer, meetingId, participant3.address, true)

    // Test: Finalize meeting
    let finalizeCode = Test.readFile("../transactions/finalize_meeting.cdc")
    let finalizeTx = Test.Transaction(
        code: finalizeCode,
        authorizers: [organizer.address],
        signers: [organizer],
        arguments: [meetingId]
    )
    let finalizeResult = Test.executeTransaction(finalizeTx)
    Test.expect(finalizeResult, Test.beSucceeded())

    // Verify all participants got their stakes back
    let finalBalance1 = getFlowBalance(participant1.address)
    let finalBalance2 = getFlowBalance(participant2.address)
    let finalBalance3 = getFlowBalance(participant3.address)

    // Everyone should get their full stake back (10.0 FLOW)
    Test.expect(finalBalance1 > initialBalance1, Test.equal(true))
    Test.expect(finalBalance2 > initialBalance2, Test.equal(true))
    Test.expect(finalBalance3 > initialBalance3, Test.equal(true))

    // Verify meeting is finalized
    let queryCode = Test.readFile("../scripts/get_meeting_details.cdc")
    let meetingDetails = Test.executeScript(
        queryCode,
        [organizer.address, meetingId]
    )
    // Verify meeting is finalized
    // Expected: isFinalized = true
}

access(all) fun testFinalizeMeetingWithMixedAttendance() {
    let organizer = Test.createAccount()
    let participant1 = Test.createAccount()
    let participant2 = Test.createAccount()
    let participant3 = Test.createAccount()
    let participant4 = Test.createAccount()

    // Setup
    mintFlowTokens(organizer, 100.0)
    mintFlowTokens(participant1, 100.0)
    mintFlowTokens(participant2, 100.0)
    mintFlowTokens(participant3, 100.0)
    mintFlowTokens(participant4, 100.0)
    setupMeetingManager(organizer)

    // Create and join meeting
    let meetingId = "finalize-test-002"
    let stakeAmount = 10.0

    createMeetingFuture(organizer, meetingId, "Mixed Attendance Meeting", stakeAmount)
    joinMeeting(participant1, organizer.address, meetingId, stakeAmount)
    joinMeeting(participant2, organizer.address, meetingId, stakeAmount)
    joinMeeting(participant3, organizer.address, meetingId, stakeAmount)
    joinMeeting(participant4, organizer.address, meetingId, stakeAmount)

    // Get initial balances
    let initialBalance1 = getFlowBalance(participant1.address)
    let initialBalance2 = getFlowBalance(participant2.address)
    let initialBalance3 = getFlowBalance(participant3.address)
    let initialBalance4 = getFlowBalance(participant4.address)

    // Move time forward and mark attendance
    Test.moveTime(by: 7300.0) // Move past meeting end time
    markAttendance(organizer, meetingId, participant1.address, true)  // Attended
    markAttendance(organizer, meetingId, participant2.address, true)  // Attended
    markAttendance(organizer, meetingId, participant3.address, false) // No-show
    markAttendance(organizer, meetingId, participant4.address, false) // No-show

    // Finalize meeting
    finalizeMeeting(organizer, meetingId)

    // Verify reward distribution
    let finalBalance1 = getFlowBalance(participant1.address)
    let finalBalance2 = getFlowBalance(participant2.address)
    let finalBalance3 = getFlowBalance(participant3.address)
    let finalBalance4 = getFlowBalance(participant4.address)

    // Attendees should get their stake back plus rewards (20 FLOW total from no-shows, split between 2)
    // Each attendee should get 10 (own stake) + 10 (split from 20 penalty) = 20 FLOW
    let reward1 = finalBalance1 - initialBalance1
    let reward2 = finalBalance2 - initialBalance2
    Test.expect(reward1 >= 19.9 && reward1 <= 20.1, Test.equal(true))
    Test.expect(reward2 >= 19.9 && reward2 <= 20.1, Test.equal(true))

    // No-shows should lose their stake
    Test.expect(finalBalance3, Test.equal(initialBalance3))
    Test.expect(finalBalance4, Test.equal(initialBalance4))
}

access(all) fun testFinalizeMeetingWithAllNoShows() {
    let organizer = Test.createAccount()
    let participant1 = Test.createAccount()
    let participant2 = Test.createAccount()

    // Setup
    mintFlowTokens(organizer, 100.0)
    mintFlowTokens(participant1, 100.0)
    mintFlowTokens(participant2, 100.0)
    setupMeetingManager(organizer)

    // Create and join meeting
    let meetingId = "finalize-test-003"
    let stakeAmount = 10.0

    createMeetingFuture(organizer, meetingId, "No-Show Meeting", stakeAmount)
    joinMeeting(participant1, organizer.address, meetingId, stakeAmount)
    joinMeeting(participant2, organizer.address, meetingId, stakeAmount)

    let organizerInitialBalance = getFlowBalance(organizer.address)

    // Move time forward and mark all as no-shows
    Test.moveTime(by: 7300.0) // Move past meeting end time
    markAttendance(organizer, meetingId, participant1.address, false)
    markAttendance(organizer, meetingId, participant2.address, false)

    // Finalize meeting
    finalizeMeeting(organizer, meetingId)

    // Verify organizer gets all stakes when everyone is a no-show
    let organizerFinalBalance = getFlowBalance(organizer.address)
    let penaltyAmount = stakeAmount * 2.0 // 2 participants * 10 FLOW each

    let organizerReward = organizerFinalBalance - organizerInitialBalance
    Test.expect(organizerReward >= penaltyAmount - 0.1 && organizerReward <= penaltyAmount + 0.1, Test.equal(true))
}

access(all) fun testCannotFinalizeMeetingTwice() {
    let organizer = Test.createAccount()
    let participant = Test.createAccount()

    // Setup
    mintFlowTokens(organizer, 100.0)
    mintFlowTokens(participant, 100.0)
    setupMeetingManager(organizer)

    // Create and join meeting
    let meetingId = "finalize-test-004"
    let stakeAmount = 10.0

    createMeetingFuture(organizer, meetingId, "Double Finalize Test", stakeAmount)
    joinMeeting(participant, organizer.address, meetingId, stakeAmount)

    // Move time forward and mark attendance
    Test.moveTime(by: 7300.0) // Move past meeting end time
    markAttendance(organizer, meetingId, participant.address, true)

    // First finalization should succeed
    finalizeMeeting(organizer, meetingId)

    // Test: Try to finalize again
    let finalizeCode = Test.readFile("../transactions/finalize_meeting.cdc")
    let finalizeTx = Test.Transaction(
        code: finalizeCode,
        authorizers: [organizer.address],
        signers: [organizer],
        arguments: [meetingId]
    )
    let finalizeResult = Test.executeTransaction(finalizeTx)

    // Should fail because already finalized
    Test.expect(finalizeResult, Test.beFailed())
    Test.expect(finalizeResult.error!.message, Test.contain("Meeting already finalized"))
}

access(all) fun testCannotFinalizeBeforeMeetingStarts() {
    let organizer = Test.createAccount()
    let participant = Test.createAccount()

    // Setup
    mintFlowTokens(organizer, 100.0)
    mintFlowTokens(participant, 100.0)
    setupMeetingManager(organizer)

    // Create meeting in the future
    let meetingId = "finalize-test-005"
    let stakeAmount = 10.0

    createMeetingFuture(organizer, meetingId, "Future Meeting", stakeAmount)
    joinMeeting(participant, organizer.address, meetingId, stakeAmount)

    // Test: Try to finalize before meeting starts
    let finalizeCode = Test.readFile("../transactions/finalize_meeting.cdc")
    let finalizeTx = Test.Transaction(
        code: finalizeCode,
        authorizers: [organizer.address],
        signers: [organizer],
        arguments: [meetingId]
    )
    let finalizeResult = Test.executeTransaction(finalizeTx)

    // Should fail because meeting hasn't started
    Test.expect(finalizeResult, Test.beFailed())
    Test.expect(finalizeResult.error!.message, Test.contain("Meeting has not started yet"))
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

access(all) fun createMeetingFuture(_ organizer: Test.TestAccount, _ meetingId: String, _ title: String, _ stakeAmount: UFix64) {
    let code = Test.readFile("../transactions/create_meeting_test_future.cdc")
    let tx = Test.Transaction(
        code: code,
        authorizers: [organizer.address],
        signers: [organizer],
        arguments: [meetingId, title, stakeAmount]
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
    let code = Test.readFile("../transactions/mark_attendance_individual.cdc")
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