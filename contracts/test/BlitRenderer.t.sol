// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {BlitRenderer} from "../src/BlitRenderer.sol";
import {DataStore} from "../src/DataStore.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract BlitRendererTest is Test {
    using Strings for uint256;

    uint256 constant START = 20701;
    BlitRenderer r;

    function setUp() public {
        string memory d = vm.readFile("test/fixtures/blit_data.json");
        address a = DataStore.write(vm.parseJsonBytes(d, "$.originalsA"));
        address b = DataStore.write(vm.parseJsonBytes(d, "$.originalsB"));
        address m = DataStore.write(vm.parseJsonBytes(d, "$.meta"));
        address s = DataStore.write(vm.parseJsonBytes(d, "$.siblings"));
        r = new BlitRenderer(START, a, b, m, s);
    }

    function parseUint(string memory s) internal pure returns (uint256 n) {
        bytes memory b = bytes(s);
        for (uint256 i = 0; i < b.length; i++) n = n * 10 + (uint8(b[i]) - 48);
    }

    /// Fixtures from `bun run contracts/fixtures.ts`. TypeScript is the source of truth.
    function test_SvgAndTraitsMatchTypeScriptByteForByte() public view {
        string memory json = vm.readFile("test/fixtures/blit_days.json");
        uint256 count = 0;
        while (vm.keyExistsJson(json, string.concat("$[", count.toString(), "].day"))) count++;
        assertGt(count, 20);
        for (uint256 i = 0; i < count; i++) {
            string memory k = string.concat("$[", i.toString(), "]");
            uint256 epoch = parseUint(vm.parseJsonString(json, string.concat(k, ".epoch")));
            uint256 day = vm.parseJsonUint(json, string.concat(k, ".day"));
            assertEq(r.dayOf(epoch), day, "day");
            (uint256 a, uint256 b) = r.pairForDay(day);
            assertEq(a, vm.parseJsonUint(json, string.concat(k, ".a")), "a");
            assertEq(b, vm.parseJsonUint(json, string.concat(k, ".b")), "b");
            assertEq(keccak256(bytes(r.svg(epoch))), keccak256(bytes(vm.parseJsonString(json, string.concat(k, ".svg")))), k);
            assertEq(r.paletteName(epoch), vm.parseJsonString(json, string.concat(k, ".palette")), "palette");
            BlitRenderer.Traits memory t = r.traitsOf(epoch);
            assertEq(t.composition, vm.parseJsonString(json, string.concat(k, ".traits.composition")), "composition");
            assertEq(t.compositionArtist, vm.parseJsonString(json, string.concat(k, ".traits.compositionArtist")), "compositionArtist");
            assertEq(t.palette, vm.parseJsonString(json, string.concat(k, ".traits.palette")), "palette");
            assertEq(t.paletteArtist, vm.parseJsonString(json, string.concat(k, ".traits.paletteArtist")), "paletteArtist");
            assertEq(t.affinity, vm.parseJsonString(json, string.concat(k, ".traits.affinity")), "affinity");
            assertEq(t.sibling, vm.parseJsonString(json, string.concat(k, ".traits.sibling")), "sibling");
        }
    }

    function test_PermIsABijection() public view {
        bool[9900] memory seen;
        for (uint256 i = 0; i < 9900; i++) {
            uint256 x = r.perm(i, 0);
            assertLt(x, 9900);
            assertFalse(seen[x], "hit twice");
            seen[x] = true;
        }
    }

    function testFuzz_PairNeverPairsAnOriginalWithItself(uint32 day) public view {
        vm.assume(day > 0);
        (uint256 a, uint256 b) = r.pairForDay(day);
        assertLt(a, 100);
        assertLt(b, 100);
        assertTrue(a != b);
        assertGt(bytes(r.svg(START + day - 1)).length, 200);
    }

    function test_TokenUriIsBase64Json() public view {
        string memory uri = r.tokenURI(1, START);
        assertGt(bytes(uri).length, 1000);
        bytes memory prefix = bytes("data:application/json;base64,");
        for (uint256 i = 0; i < prefix.length; i++) assertEq(bytes(uri)[i], prefix[i]);
    }

    function test_RejectsWrongDataSizes() public {
        address ok = DataStore.write(new bytes(50 * 268));
        address bad = DataStore.write(new bytes(100));
        vm.expectRevert();
        new BlitRenderer(START, bad, ok, ok, ok);
    }
}
