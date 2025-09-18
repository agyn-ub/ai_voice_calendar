import FungibleToken from "../imports/FungibleToken.cdc"
import FlowToken from "../imports/FlowToken.cdc"

access(all) contract MeetingStaking {

    // Storage paths
    access(all) let MeetingManagerStoragePath: StoragePath
    access(all) let MeetingManagerPublicPath: PublicPath
    access(all) let MeetingManagerPrivatePath: PrivatePath

    // Contract initialization
    init() {
        // Set storage paths
        self.MeetingManagerStoragePath = /storage/MeetingManager
        self.MeetingManagerPublicPath = /public/MeetingManager
        self.MeetingManagerPrivatePath = /private/MeetingManager
    }
}