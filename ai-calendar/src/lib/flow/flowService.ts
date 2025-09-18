import * as fcl from "@onflow/fcl";
import * as t from "@onflow/types";

// Contract addresses for testnet
const MEETING_STAKING_ADDRESS = process.env.NEXT_PUBLIC_MEETING_STAKING_ADDRESS || "0x2c3e84f9de31e3c7"; // Deployed contract address
const FLOW_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_FLOW_TOKEN_ADDRESS || "0x7e60df042a9c0868"; // Testnet FlowToken
const FUNGIBLE_TOKEN_ADDRESS = "0x9a0766d93b6608b7"; // Testnet FungibleToken

export interface Meeting {
  meetingId: string;
  calendarEventId: string;
  organizer: string;
  title: string;
  startTime: number;
  endTime: number;
  stakeAmount: number;
  totalStaked: number;
  isFinalized: boolean;
  participants: string[];
}

export interface Participant {
  address: string;
  hasStaked: boolean;
  hasAttended: boolean;
  joinedAt: number;
}

export interface AttendanceStats {
  total: number;
  attended: number;
  staked: number;
  attendedAndStaked: number;
  noShows: number;
}

export class FlowService {
  // Check if user has Meeting Manager set up
  static async hasMeetingManager(address: string): Promise<boolean> {
    try {
      const script = `
        import MeetingStaking from ${MEETING_STAKING_ADDRESS}

        access(all) fun main(address: Address): Bool {
          let account = getAccount(address)
          let managerRef = account.capabilities.borrow<&{MeetingStaking.MeetingManagerPublic}>(
            MeetingStaking.MeetingManagerPublicPath
          )
          return managerRef != nil
        }
      `;

      const result = await fcl.query({
        cadence: script,
        args: (arg: any, t: any) => [arg(address, t.Address)],
      });

      return result;
    } catch (error) {
      console.error("Error checking Meeting Manager:", error);
      return false;
    }
  }

  // Setup Meeting Manager for first-time users
  static async setupMeetingManager(): Promise<string> {
    try {
      const transaction = `
        import MeetingStaking from ${MEETING_STAKING_ADDRESS}

        transaction {
          prepare(signer: auth(Storage, Capabilities) &Account) {
            if signer.storage.borrow<&MeetingStaking.MeetingManager>(from: MeetingStaking.MeetingManagerStoragePath) == nil {
              let meetingManager <- MeetingStaking.createMeetingManager()
              signer.storage.save(<-meetingManager, to: MeetingStaking.MeetingManagerStoragePath)

              let publicCap = signer.capabilities.storage.issue<&{MeetingStaking.MeetingManagerPublic}>(
                MeetingStaking.MeetingManagerStoragePath
              )
              signer.capabilities.publish(publicCap, at: MeetingStaking.MeetingManagerPublicPath)
            }
          }

          execute {
            log("MeetingManager setup completed")
          }
        }
      `;

      const transactionId = await fcl.mutate({
        cadence: transaction,
        limit: 100,
      });

      await fcl.tx(transactionId).onceSealed();
      return transactionId;
    } catch (error) {
      console.error("Error setting up Meeting Manager:", error);
      throw error;
    }
  }

  // Create a new meeting with staking
  static async createMeeting(
    meetingId: string,
    calendarEventId: string,
    title: string,
    startTime: number,
    endTime: number,
    stakeAmount: string
  ): Promise<string> {
    try {
      const transaction = `
        import MeetingStaking from ${MEETING_STAKING_ADDRESS}

        transaction(
          meetingId: String,
          calendarEventId: String,
          title: String,
          startTime: UFix64,
          endTime: UFix64,
          stakeAmount: UFix64
        ) {
          prepare(signer: auth(Storage) &Account) {
            let meetingManager = signer.storage.borrow<&MeetingStaking.MeetingManager>(
              from: MeetingStaking.MeetingManagerStoragePath
            ) ?? panic("MeetingManager not found")

            meetingManager.createMeeting(
              meetingId: meetingId,
              calendarEventId: calendarEventId,
              title: title,
              startTime: startTime,
              endTime: endTime,
              stakeAmount: stakeAmount
            )
          }

          execute {
            log("Meeting created successfully")
          }
        }
      `;

      const transactionId = await fcl.mutate({
        cadence: transaction,
        args: (arg: any, t: any) => [
          arg(meetingId, t.String),
          arg(calendarEventId, t.String),
          arg(title, t.String),
          arg(startTime.toFixed(1), t.UFix64),
          arg(endTime.toFixed(1), t.UFix64),
          arg(stakeAmount, t.UFix64),
        ],
        limit: 200,
      });

      await fcl.tx(transactionId).onceSealed();
      return transactionId;
    } catch (error) {
      console.error("Error creating meeting:", error);
      throw error;
    }
  }

  // Join a meeting and stake tokens
  static async joinMeeting(
    organizerAddress: string,
    meetingId: string,
    stakeAmount: string
  ): Promise<string> {
    try {
      const transaction = `
        import MeetingStaking from ${MEETING_STAKING_ADDRESS}
        import FungibleToken from ${FUNGIBLE_TOKEN_ADDRESS}
        import FlowToken from ${FLOW_TOKEN_ADDRESS}

        transaction(organizerAddress: Address, meetingId: String, amount: UFix64) {
          let payment: @{FungibleToken.Vault}
          let meetingRef: &MeetingStaking.Meeting

          prepare(signer: auth(Storage) &Account) {
            // Get the participant's FlowToken vault
            let vaultRef = signer.storage.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
              ?? panic("Could not borrow reference to the owner's Vault!")

            // Withdraw the stake amount
            self.payment <- vaultRef.withdraw(amount: amount)

            // Get reference to organizer's Meeting Manager
            let organizerAccount = getAccount(organizerAddress)
            let managerRef = organizerAccount.capabilities.borrow<&{MeetingStaking.MeetingManagerPublic}>(
              MeetingStaking.MeetingManagerPublicPath
            ) ?? panic("Could not borrow MeetingManager reference")

            // Get reference to the specific meeting
            self.meetingRef = managerRef.getMeeting(meetingId: meetingId)
              ?? panic("Meeting not found")
          }

          execute {
            // Add participant if not already added
            if !self.meetingRef.hasParticipant(address: self.payment.owner?.address ?? panic("No owner")) {
              self.meetingRef.addParticipant(address: self.payment.owner?.address ?? panic("No owner"))
            }

            // Deposit stake
            self.meetingRef.depositStake(
              from: <-self.payment,
              participant: self.payment.owner?.address ?? panic("No owner")
            )
          }
        }
      `;

      const transactionId = await fcl.mutate({
        cadence: transaction,
        args: (arg: any, t: any) => [
          arg(organizerAddress, t.Address),
          arg(meetingId, t.String),
          arg(stakeAmount, t.UFix64),
        ],
        limit: 300,
      });

      await fcl.tx(transactionId).onceSealed();
      return transactionId;
    } catch (error) {
      console.error("Error joining meeting:", error);
      throw error;
    }
  }

  // Mark attendance for participants
  static async markAttendance(
    meetingId: string,
    attendees: string[]
  ): Promise<string> {
    try {
      const transaction = `
        import MeetingStaking from ${MEETING_STAKING_ADDRESS}

        transaction(meetingId: String, attendees: [Address]) {
          prepare(signer: auth(Storage) &Account) {
            let meetingManager = signer.storage.borrow<&MeetingStaking.MeetingManager>(
              from: MeetingStaking.MeetingManagerStoragePath
            ) ?? panic("MeetingManager not found")

            let meeting = meetingManager.getMeeting(meetingId: meetingId)
              ?? panic("Meeting not found")

            meeting.markBatchAttendance(attendees: attendees)
          }

          execute {
            log("Attendance marked successfully")
          }
        }
      `;

      const transactionId = await fcl.mutate({
        cadence: transaction,
        args: (arg: any, t: any) => [
          arg(meetingId, t.String),
          arg(attendees, t.Array(t.Address)),
        ],
        limit: 200,
      });

      await fcl.tx(transactionId).onceSealed();
      return transactionId;
    } catch (error) {
      console.error("Error marking attendance:", error);
      throw error;
    }
  }

  // Finalize meeting and calculate rewards
  static async finalizeMeeting(meetingId: string): Promise<string> {
    try {
      const transaction = `
        import MeetingStaking from ${MEETING_STAKING_ADDRESS}

        transaction(meetingId: String) {
          prepare(signer: auth(Storage) &Account) {
            let meetingManager = signer.storage.borrow<&MeetingStaking.MeetingManager>(
              from: MeetingStaking.MeetingManagerStoragePath
            ) ?? panic("MeetingManager not found")

            let meeting = meetingManager.getMeeting(meetingId: meetingId)
              ?? panic("Meeting not found")

            meeting.finalizeMeeting()
          }

          execute {
            log("Meeting finalized successfully")
          }
        }
      `;

      const transactionId = await fcl.mutate({
        cadence: transaction,
        args: (arg: any, t: any) => [arg(meetingId, t.String)],
        limit: 150,
      });

      await fcl.tx(transactionId).onceSealed();
      return transactionId;
    } catch (error) {
      console.error("Error finalizing meeting:", error);
      throw error;
    }
  }

  // Claim rewards from a finalized meeting
  static async claimReward(
    organizerAddress: string,
    meetingId: string
  ): Promise<string> {
    try {
      const transaction = `
        import MeetingStaking from ${MEETING_STAKING_ADDRESS}
        import FlowToken from ${FLOW_TOKEN_ADDRESS}

        transaction(organizerAddress: Address, meetingId: String) {
          prepare(signer: auth(Storage) &Account) {
            // Get participant's FlowToken vault
            let vaultRef = signer.storage.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
              ?? panic("Could not borrow reference to the owner's Vault!")

            // Get organizer's Meeting Manager
            let organizerAccount = getAccount(organizerAddress)
            let managerRef = organizerAccount.capabilities.borrow<&{MeetingStaking.MeetingManagerPublic}>(
              MeetingStaking.MeetingManagerPublicPath
            ) ?? panic("Could not borrow MeetingManager reference")

            // Claim reward
            managerRef.claimReward(
              meetingId: meetingId,
              participant: signer.address,
              recipientVault: vaultRef
            )
          }

          execute {
            log("Reward claimed successfully")
          }
        }
      `;

      const transactionId = await fcl.mutate({
        cadence: transaction,
        args: (arg: any, t: any) => [
          arg(organizerAddress, t.Address),
          arg(meetingId, t.String),
        ],
        limit: 200,
      });

      await fcl.tx(transactionId).onceSealed();
      return transactionId;
    } catch (error) {
      console.error("Error claiming reward:", error);
      throw error;
    }
  }

  // Get meeting information
  static async getMeetingInfo(
    organizerAddress: string,
    meetingId: string
  ): Promise<Meeting | null> {
    try {
      const script = `
        import MeetingStaking from ${MEETING_STAKING_ADDRESS}

        access(all) fun main(organizerAddress: Address, meetingId: String): {String: AnyStruct}? {
          let account = getAccount(organizerAddress)
          let managerRef = account.capabilities.borrow<&{MeetingStaking.MeetingManagerPublic}>(
            MeetingStaking.MeetingManagerPublicPath
          ) ?? panic("Could not borrow MeetingManager reference")

          let meeting = managerRef.getMeeting(meetingId: meetingId)
          if meeting == nil {
            return nil
          }

          return {
            "meetingId": meeting!.meetingId,
            "calendarEventId": meeting!.calendarEventId,
            "organizer": meeting!.organizer,
            "title": meeting!.title,
            "startTime": meeting!.startTime,
            "endTime": meeting!.endTime,
            "stakeAmount": meeting!.stakeAmount,
            "totalStaked": meeting!.totalStaked,
            "isFinalized": meeting!.isFinalized,
            "participants": meeting!.getParticipants()
          }
        }
      `;

      const result = await fcl.query({
        cadence: script,
        args: (arg: any, t: any) => [
          arg(organizerAddress, t.Address),
          arg(meetingId, t.String),
        ],
      });

      if (!result) return null;

      return {
        meetingId: result.meetingId,
        calendarEventId: result.calendarEventId,
        organizer: result.organizer,
        title: result.title,
        startTime: parseFloat(result.startTime),
        endTime: parseFloat(result.endTime),
        stakeAmount: parseFloat(result.stakeAmount),
        totalStaked: parseFloat(result.totalStaked),
        isFinalized: result.isFinalized,
        participants: result.participants,
      };
    } catch (error) {
      console.error("Error getting meeting info:", error);
      return null;
    }
  }

  // Get user's meetings
  static async getUserMeetings(address: string): Promise<string[]> {
    try {
      const script = `
        import MeetingStaking from ${MEETING_STAKING_ADDRESS}

        access(all) fun main(address: Address): [String] {
          let account = getAccount(address)
          let managerRef = account.capabilities.borrow<&{MeetingStaking.MeetingManagerPublic}>(
            MeetingStaking.MeetingManagerPublicPath
          )

          if managerRef == nil {
            return []
          }

          return managerRef!.getMeetingIds()
        }
      `;

      const result = await fcl.query({
        cadence: script,
        args: (arg: any, t: any) => [arg(address, t.Address)],
      });

      return result || [];
    } catch (error) {
      console.error("Error getting user meetings:", error);
      return [];
    }
  }

  // Get attendance statistics for a meeting
  static async getAttendanceStats(
    organizerAddress: string,
    meetingId: string
  ): Promise<AttendanceStats | null> {
    try {
      const script = `
        import MeetingStaking from ${MEETING_STAKING_ADDRESS}

        access(all) fun main(organizerAddress: Address, meetingId: String): {String: Int}? {
          let account = getAccount(organizerAddress)
          let managerRef = account.capabilities.borrow<&{MeetingStaking.MeetingManagerPublic}>(
            MeetingStaking.MeetingManagerPublicPath
          ) ?? panic("Could not borrow MeetingManager reference")

          let meeting = managerRef.getMeeting(meetingId: meetingId)
          if meeting == nil {
            return nil
          }

          return meeting!.getAttendanceStats()
        }
      `;

      const result = await fcl.query({
        cadence: script,
        args: (arg: any, t: any) => [
          arg(organizerAddress, t.Address),
          arg(meetingId, t.String),
        ],
      });

      if (!result) return null;

      return {
        total: result.total,
        attended: result.attended,
        staked: result.staked,
        attendedAndStaked: result.attendedAndStaked,
        noShows: result.noShows,
      };
    } catch (error) {
      console.error("Error getting attendance stats:", error);
      return null;
    }
  }

  // Get FLOW token balance
  static async getFlowBalance(address: string): Promise<string> {
    try {
      const script = `
        import FungibleToken from ${FUNGIBLE_TOKEN_ADDRESS}
        import FlowToken from ${FLOW_TOKEN_ADDRESS}

        access(all) fun main(address: Address): UFix64 {
          let account = getAccount(address)
          let vaultRef = account.capabilities.borrow<&{FungibleToken.Balance}>(
            /public/flowTokenBalance
          ) ?? panic("Could not borrow Balance reference")

          return vaultRef.balance
        }
      `;

      const result = await fcl.query({
        cadence: script,
        args: (arg: any, t: any) => [arg(address, t.Address)],
      });

      return result || "0.0";
    } catch (error) {
      console.error("Error getting FLOW balance:", error);
      return "0.0";
    }
  }
}

export default FlowService;