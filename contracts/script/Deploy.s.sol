// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {BlitRenderer} from "../src/BlitRenderer.sol";
import {DataStore} from "../src/DataStore.sol";
import {OneNFT} from "../src/OneNFT.sol";

/// forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify
/// env: START_EPOCH (unix days), AUTHOR (owner and every-tenth-day recipient)
/// Data blobs come from test/fixtures/blit_data.json (bun run contracts/fixtures.ts).
contract Deploy is Script {
    function run() external {
        uint256 startEpoch = vm.envUint("START_EPOCH");
        address author = vm.envAddress("AUTHOR");
        string memory d = vm.readFile("test/fixtures/blit_data.json");
        vm.startBroadcast();
        address a = DataStore.write(vm.parseJsonBytes(d, "$.originalsA"));
        address b = DataStore.write(vm.parseJsonBytes(d, "$.originalsB"));
        address m = DataStore.write(vm.parseJsonBytes(d, "$.meta"));
        address s = DataStore.write(vm.parseJsonBytes(d, "$.siblings"));
        BlitRenderer renderer = new BlitRenderer(startEpoch, a, b, m, s);
        OneNFT nft = new OneNFT("blit.onenft.click", "BLITDAY", startEpoch, author, address(renderer));
        vm.stopBroadcast();
        console.log("originalsA", a);
        console.log("originalsB", b);
        console.log("meta", m);
        console.log("siblings", s);
        console.log("BlitRenderer", address(renderer));
        console.log("OneNFT", address(nft));
        console.log("startEpoch", startEpoch);
    }
}
