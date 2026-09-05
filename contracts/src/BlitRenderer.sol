// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IDayRenderer} from "./IDayRenderer.sol";
import {DataStore} from "./DataStore.sol";

/// @title BlitRenderer
/// @notice A one-to-one port of `src/blit.ts`: the same permutation, the same
/// remix, the same SVG string. The equality test compares keccak hashes against
/// fixtures generated from TypeScript. Changing anything here without the same
/// change in TS is a bug.
///
/// The 100 Blitmap originals (268 bytes each, art CC0) sit in two data
/// contracts, 50 in each. Names and artists sit in a third, the 1600 Ethereum
/// sibling pairs in a fourth. All four addresses are immutable.
///
/// Day n takes pair perm(n - 1) of the 9900 possible pairs (composition of one
/// original, palette of another), so each pair appears once per 9900 days.
contract BlitRenderer is IDayRenderer {
    using Strings for uint256;

    uint256 public constant N = 100;
    uint256 public constant PAIRS = N * (N - 1);
    uint256 public constant RECORD = 268;

    uint256 public immutable startEpoch;
    address public immutable originalsA;
    address public immutable originalsB;
    address public immutable meta;
    address public immutable siblings;

    error BadData(string which, uint256 length);

    /// @param originalsA_ originals 0..49, 50 * 268 bytes
    /// @param originalsB_ originals 50..99, 50 * 268 bytes
    /// @param meta_ per original: nameLength, name, creatorLength, creator
    /// @param siblings_ 1600 records of 4 bytes: composition, palette, ethereum token id (big endian)
    constructor(uint256 startEpoch_, address originalsA_, address originalsB_, address meta_, address siblings_) {
        if (originalsA_.code.length != 50 * RECORD + 1) revert BadData("originalsA", originalsA_.code.length);
        if (originalsB_.code.length != 50 * RECORD + 1) revert BadData("originalsB", originalsB_.code.length);
        if (meta_.code.length < 2 * N + 1) revert BadData("meta", meta_.code.length);
        if (siblings_.code.length != 1600 * 4 + 1) revert BadData("siblings", siblings_.code.length);
        startEpoch = startEpoch_;
        originalsA = originalsA_;
        originalsB = originalsB_;
        meta = meta_;
        siblings = siblings_;
    }

    // ---- the permutation ----

    /// @dev splitmix64 finalizer, wrapping at 64 bits.
    function mix64(uint64 x) public pure returns (uint64 z) {
        unchecked {
            z = x + 0x9e3779b97f4a7c15;
            z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9;
            z = (z ^ (z >> 27)) * 0x94d049bb133111eb;
            z = z ^ (z >> 31);
        }
    }

    /// @notice Four Feistel rounds over 14 bits: a permutation of 0..16383.
    function feistel(uint256 x, uint256 cycle) public pure returns (uint256) {
        uint256 l = x >> 7;
        uint256 r = x & 127;
        for (uint256 round = 0; round < 4; round++) {
            uint256 f = uint256(mix64(uint64(r | (round << 8) | (cycle << 16)))) & 127;
            (l, r) = (r, l ^ f);
        }
        return (l << 7) | r;
    }

    /// @notice A permutation of 0..PAIRS-1 by cycle walking.
    function perm(uint256 i, uint256 cycle) public pure returns (uint256 x) {
        x = feistel(i, cycle);
        while (x >= PAIRS) x = feistel(x, cycle);
    }

    function pairOf(uint256 index) public pure returns (uint256 a, uint256 b) {
        a = index / (N - 1);
        b = index % (N - 1);
        if (b >= a) b += 1;
    }

    /// @return a composition original, b palette original
    function pairForDay(uint256 day) public pure returns (uint256 a, uint256 b) {
        uint256 n = day - 1;
        return pairOf(perm(n % PAIRS, n / PAIRS));
    }

    /// @dev Days before the start read as day 1, as in TypeScript.
    function dayOf(uint256 epoch) public view returns (uint256) {
        return epoch < startEpoch ? 1 : epoch - startEpoch + 1;
    }

    // ---- data ----

    function original(uint256 i) public view returns (bytes memory) {
        return i < 50 ? DataStore.read(originalsA, i * RECORD, RECORD) : DataStore.read(originalsB, (i - 50) * RECORD, RECORD);
    }

    /// @notice Composition of a with the palette of b.
    function remixData(uint256 a, uint256 b) public view returns (bytes memory data) {
        data = original(a);
        bytes memory pal = DataStore.read(b < 50 ? originalsA : originalsB, (b % 50) * RECORD, 12);
        for (uint256 i = 0; i < 12; i++) data[i] = pal[i];
    }

    function nameAndCreator(uint256 i) public view returns (string memory name, string memory creator) {
        bytes memory m = DataStore.read(meta);
        uint256 p = 0;
        for (uint256 k = 0; k < i; k++) {
            p += 1 + uint256(uint8(m[p]));
            p += 1 + uint256(uint8(m[p]));
        }
        uint256 nl = uint8(m[p]);
        bytes memory nb = new bytes(nl);
        for (uint256 k = 0; k < nl; k++) nb[k] = m[p + 1 + k];
        p += 1 + nl;
        uint256 cl = uint8(m[p]);
        bytes memory cb = new bytes(cl);
        for (uint256 k = 0; k < cl; k++) cb[k] = m[p + 1 + k];
        return (string(nb), string(cb));
    }

    /// @return id the Ethereum Blitmap token holding this pair, or 0 when none (token 0 is an original, never a sibling)
    function siblingOf(uint256 a, uint256 b) public view returns (uint256 id) {
        bytes memory s = DataStore.read(siblings);
        for (uint256 p = 0; p < s.length; p += 4) {
            if (uint8(s[p]) == a && uint8(s[p + 1]) == b) return (uint256(uint8(s[p + 2])) << 8) | uint8(s[p + 3]);
        }
    }

    // ---- pixels ----

    function pixel(bytes memory data, uint256 i) internal pure returns (uint256) {
        return (uint8(data[12 + (i >> 2)]) >> (6 - 2 * (i & 3))) & 3;
    }

    function groundOf(bytes memory data) public pure returns (uint256 best) {
        uint256[4] memory count;
        for (uint256 i = 0; i < 1024; i++) count[pixel(data, i)]++;
        for (uint256 c = 1; c < 4; c++) if (count[c] > count[best]) best = c;
    }

    bytes16 private constant HEX = "0123456789abcdef";

    function color(bytes memory data, uint256 c) internal pure returns (string memory) {
        bytes memory s = new bytes(7);
        s[0] = "#";
        for (uint256 k = 0; k < 3; k++) {
            uint8 v = uint8(data[c * 3 + k]);
            s[1 + 2 * k] = HEX[v >> 4];
            s[2 + 2 * k] = HEX[v & 15];
        }
        return string(s);
    }

    function colorsOf(bytes memory data) public pure returns (string[4] memory colors) {
        for (uint256 c = 0; c < 4; c++) colors[c] = color(data, c);
    }

    /// @notice Blitmap's affinity, ported from BlitmapAnalysis.sol.
    function affinityOf(bytes memory data) public pure returns (string memory) {
        uint256 r = uint256(uint8(data[0])) + uint8(data[3]) + uint8(data[6]);
        uint256 g = uint256(uint8(data[1])) + uint8(data[4]) + uint8(data[7]);
        uint256 b = uint256(uint8(data[2])) + uint8(data[5]) + uint8(data[8]);
        string[3] memory out;
        uint256 n = 0;
        if (r >= g && r >= b) {
            out[n++] = "Fire";
            if (g > 256) out[n++] = "Earth";
            if (b > 256) out[n++] = "Water";
        } else if (g >= r && g >= b) {
            out[n++] = "Earth";
            if (r > 256) out[n++] = "Fire";
            if (b > 256) out[n++] = "Water";
        } else {
            out[n++] = "Water";
            if (r > 256) out[n++] = "Fire";
            if (g > 256) out[n++] = "Earth";
        }
        if (n == 1) return string.concat(out[0], " III");
        if (n == 2) return string.concat(out[0], " II, ", out[1], " I");
        return string.concat(out[0], " I, ", out[1], " I, ", out[2], " I");
    }

    /// @notice One rect for the ground, one per horizontal run of any other color.
    /// Rows are built apart and joined once each, so the growing string is copied
    /// 32 times, not once per rect.
    function svgOf(bytes memory data) public pure returns (string memory) {
        string[4] memory colors = colorsOf(data);
        uint256 ground = groundOf(data);
        bytes memory out = abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="512" height="512" shape-rendering="crispEdges"><rect width="32" height="32" fill="',
            colors[ground],
            '"/>'
        );
        for (uint256 y = 0; y < 32; y++) {
            bytes memory row;
            uint256 x = 0;
            while (x < 32) {
                uint256 c = pixel(data, y * 32 + x);
                uint256 w = 1;
                while (x + w < 32 && pixel(data, y * 32 + x + w) == c) w++;
                if (c != ground) {
                    row = abi.encodePacked(row, '<rect x="', x.toString(), '" y="', y.toString(), '" width="', w.toString(), '" height="1" fill="', colors[c], '"/>');
                }
                x += w;
            }
            out = abi.encodePacked(out, row);
        }
        return string(abi.encodePacked(out, "</svg>"));
    }

    // ---- IDayRenderer ----

    function svg(uint256 epoch) public view returns (string memory) {
        (uint256 a, uint256 b) = pairForDay(dayOf(epoch));
        return svgOf(remixData(a, b));
    }

    function paletteName(uint256 epoch) external view returns (string memory name) {
        (, uint256 b) = pairForDay(dayOf(epoch));
        (name,) = nameAndCreator(b);
    }

    struct Traits {
        string composition;
        string compositionArtist;
        string palette;
        string paletteArtist;
        string affinity;
        string sibling;
    }

    function traitsOf(uint256 epoch) public view returns (Traits memory t) {
        (uint256 a, uint256 b) = pairForDay(dayOf(epoch));
        (t.composition, t.compositionArtist) = nameAndCreator(a);
        (t.palette, t.paletteArtist) = nameAndCreator(b);
        t.affinity = affinityOf(remixData(a, b));
        uint256 sib = siblingOf(a, b);
        t.sibling = sib == 0 ? "none" : string.concat("Blitmap #", sib.toString());
    }

    function attribute(string memory key, string memory value) internal pure returns (string memory) {
        return string.concat('{"trait_type":"', key, '","value":"', value, '"}');
    }

    function tokenURI(uint256 day, uint256 epoch) external view returns (string memory) {
        Traits memory t = traitsOf(epoch);
        string memory image = string.concat("data:image/svg+xml;base64,", Base64.encode(bytes(svg(epoch))));
        string memory json = string.concat(
            '{"name":"Day ', day.toString(),
            '","description":"The composition of \\"', t.composition, '\\" by ', t.compositionArtist,
            ' in the palette of \\"', t.palette, '\\" by ', t.paletteArtist,
            '. One remix a day of the 100 CC0 Blitmap originals, drawn on chain from the day number. blit.onenft.click","image":"', image,
            '","attributes":[',
            attribute("Composition", t.composition), ",", attribute("Composition artist", t.compositionArtist), ",",
            attribute("Palette", t.palette), ",", attribute("Palette artist", t.paletteArtist), ",",
            attribute("Affinity", t.affinity), ",", attribute("Ethereum sibling", t.sibling),
            "]}"
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }
}
