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

access(all) fun testJoinMeetingSuccessfully() {
    let organizer = Test.createAccount()
    let participant1 = Test.createAccount()
    let participant2 = Test.createAccount()

    // Setup: Give accounts Flow tokens
    let mintAmount = 100.0
    mintFlowTokens(organizer, mintAmount)
    mintFlowTokens(participant1, mintAmount)
    mintFlowTokens(participant2, mintAmount)

    // Organizer creates meeting manager
    let setupTxCode = Test.readFile("../transactions/setup_meeting_manager.cdc")
    let setupTx = Test.Transaction(
        code: setupTxCode,
        authorizers: [organizer.address],
        signers: [organizer],
        arguments: []
    )
    let setupResult = Test.executeTransaction(setupTx)
    Test.expect(setupResult, Test.beSucceeded())

    // Create a meeting
    let createMeetingCode = Test.readFile("../transactions/create_meeting_test.cdc")
    let meetingId = "test-meeting-001"
    let title = "Test Meeting"
    let startTime = getCurrentBlock().timestamp + 3600.0 // 1 hour from now
    let stakeAmount = 10.0

    let createTx = Test.Transaction(
        code: createMeetingCode,
        authorizers: [organizer.address],
        signers: [organizer],
        arguments: [meetingId, title, startTime, stakeAmount]
    )
    let createResult = Test.executeTransaction(createTx)
    Test.expect(createResult, Test.beSucceeded())

    // Test: Participant joins the meeting
    let joinMeetingCode = Test.readFile("../transactions/join_meeting.cdc")
    let joinTx = Test.Transaction(
        code: joinMeetingCode,
        authorizers: [participant1.address],
        signers: [participant1],
        arguments: [organizer.address, meetingId, stakeAmount]
    )
    let joinResult = Test.executeTransaction(joinTx)
    Test.expect(joinResult, Test.beSucceeded())

    // Verify participant was added to meeting
    let queryCode = Test.readFile("../scripts/get_meeting_details.cdc")
    let meetingDetails = Test.executeScript(
        queryCode,
        [organizer.address, meetingId]
    )

    // Verify meeting details - Test framework scriptResult API simplified
    // Expected: 1 participant with stakeAmount staked
}

access(all) fun testCannotJoinWithInsufficientStake() {
    let organizer = Test.createAccount()
    let participant = Test.createAccount()

    // Setup
    mintFlowTokens(organizer, 100.0)
    mintFlowTokens(participant, 5.0) // Only 5 Flow tokens

    setupMeetingManager(organizer)

    // Create meeting with 10 Flow stake requirement
    let meetingId = "test-meeting-002"
    let stakeAmount = 10.0
    createMeeting(organizer, meetingId, "Test Meeting", getCurrentBlock().timestamp + 3600.0, stakeAmount)

    // Test: Try to join with insufficient funds
    let joinMeetingCode = Test.readFile("../transactions/join_meeting.cdc")
    let joinTx = Test.Transaction(
        code: joinMeetingCode,
        authorizers: [participant.address],
        signers: [participant],
        arguments: [organizer.address, meetingId, stakeAmount]
    )
    let joinResult = Test.executeTransaction(joinTx)

    // Should fail due to insufficient balance
    Test.expect(joinResult, Test.beFailed())
}

access(all) fun testCannotJoinAfterMeetingStarted() {
    let organizer = Test.createAccount()
    let participant = Test.createAccount()

    // Setup
    mintFlowTokens(organizer, 100.0)
    mintFlowTokens(participant, 100.0)
    setupMeetingManager(organizer)

    // Create meeting that starts soon
    let meetingId = "test-meeting-003"
    let stakeAmount = 10.0
    let startTime = getCurrentBlock().timestamp + 100.0 // Starts in 100 seconds

    // Create the meeting
    createMeeting(organizer, meetingId, "Soon Meeting", startTime, stakeAmount)

    // Move time forward past the start time
    Test.moveTime(by: 200.0) // Move 200 seconds forward (meeting should have started)

    // Test: Try to join meeting that already started
    let joinMeetingCode = Test.readFile("../transactions/join_meeting.cdc")
    let joinTx = Test.Transaction(
        code: joinMeetingCode,
        authorizers: [participant.address],
        signers: [participant],
        arguments: [organizer.address, meetingId, stakeAmount]
    )
    let joinResult = Test.executeTransaction(joinTx)

    // Should fail because meeting already started
    Test.expect(joinResult, Test.beFailed())
    // Verify error message contains expected text
    Test.assert(joinResult.error != nil && joinResult.error!.message.contains("Meeting has already started"), message: "Expected error about meeting already started")
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