import * as fcl from "@onflow/fcl";

const flowNetwork = process.env.NEXT_PUBLIC_FLOW_NETWORK || "testnet";

const config = {
  testnet: {
    accessNode: "https://rest-testnet.onflow.org",
    discoveryWallet: "https://fcl-discovery.onflow.org/testnet/authn",
    "0xProfile": "0xba1132bc08f82fe2",
    "0xFungibleToken": "0x9a0766d93b6608b7",
    "0xFlowToken": "0x7e60df042a9c0868",
  },
  mainnet: {
    accessNode: "https://rest-mainnet.onflow.org",
    discoveryWallet: "https://fcl-discovery.onflow.org/authn",
    "0xProfile": "0xd796ff17107bbff6",
    "0xFungibleToken": "0xf233dcee88fe0abe",
    "0xFlowToken": "0x1654653399040a61",
  },
  emulator: {
    accessNode: "http://localhost:8888",
    discoveryWallet: "http://localhost:8701/fcl/authn",
    "0xProfile": "0xf8d6e0586b0a20c7",
    "0xFungibleToken": "0xee82856bf20e2aa6",
    "0xFlowToken": "0x0ae53cb6e3f42a79",
  },
};

const selectedConfig = config[flowNetwork as keyof typeof config];

fcl
  .config()
  .put("app.detail.title", "AI Voice Calendar")
  .put("app.detail.icon", "https://placekitten.com/200/200")
  .put("accessNode.api", selectedConfig.accessNode)
  .put("discovery.wallet", selectedConfig.discoveryWallet)
  .put("flow.network", flowNetwork)
  .put("0xProfile", selectedConfig["0xProfile"])
  .put("0xFungibleToken", selectedConfig["0xFungibleToken"])
  .put("0xFlowToken", selectedConfig["0xFlowToken"]);

export { fcl, flowNetwork };