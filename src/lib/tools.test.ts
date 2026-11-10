import { describe, expect, it } from "vitest";
import {
  InputError,
  allUnits,
  blockToTime,
  decodeCall,
  encodeArgs,
  encodeCall,
  gasCost,
  inspectAddress,
  keccakHex,
  keccakText,
  normaliseSignature,
  relativeTime,
  selectorOf,
  timeToBlock,
  toBase,
  topicOf,
  unixToMs,
} from "./tools";

describe("units", () => {
  it("converts 1 BOT to gwei and wei", () => {
    const base = toBase("bot", "1", 6)!;
    expect(base).toBe(10n ** 18n);
    const u = allUnits(base, 6);
    expect(u.gwei).toBe("1000000000.0");
    expect(u.wei).toBe("1000000000000000000");
  });
  it("uses custom token decimals", () => {
    expect(toBase("token", "1.5", 6)).toBe(1_500_000n);
    expect(allUnits(1_500_000n, 6).token).toBe("1.5");
  });
  it("rejects fractional wei, bad text and overflow with inline messages", () => {
    expect(() => toBase("wei", "1.5", 18)).toThrow(InputError);
    expect(() => toBase("bot", "abc", 18)).toThrow(InputError);
    expect(() => toBase("wei", "9".repeat(80), 18)).toThrow(/uint256/);
  });
  it("treats empty as null", () => expect(toBase("bot", "  ", 18)).toBeNull());
});

describe("hash", () => {
  it("selector of transfer(address,uint256)", () => expect(selectorOf("transfer(address,uint256)")).toBe("0xa9059cbb"));
  it("normalises names and spaces", () =>
    expect(normaliseSignature("transfer(address to, uint256 amount)")).toBe("transfer(address,uint256)"));
  it("event topic of Transfer", () =>
    expect(topicOf("Transfer(address,address,uint256)")).toBe(
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
    ));
  it("keccak of text and hex agree for the same bytes", () => {
    expect(keccakText("hello")).toBe(keccakHex("0x68656c6c6f"));
  });
  it("rejects bad hex", () => {
    expect(() => keccakHex("0xzz")).toThrow(InputError);
    expect(() => keccakHex("0xabc")).toThrow(/odd/);
  });
});

describe("abi", () => {
  const addr = "0x000000000000000000000000000000000000dEaD";
  it("encodes and decodes transfer calldata", () => {
    const data = encodeCall("transfer(address,uint256)", `["${addr}", "1000"]`);
    expect(data.startsWith("0xa9059cbb")).toBe(true);
    const d = decodeCall("transfer(address,uint256)", data);
    expect(d.args).toEqual([addr, "1000"]);
  });
  it("reports a value count mismatch", () => {
    expect(() => encodeCall("transfer(address,uint256)", '["0x1"]')).toThrow(/Expected 2 values/);
  });
  it("encodes constructor args without a selector", () => {
    const out = encodeArgs("uint256,string", '["5", "hi"]');
    expect(out.startsWith("0x")).toBe(true);
    expect(out.slice(2, 66)).toBe("0".repeat(63) + "5");
  });
});

describe("address", () => {
  it("fixes the checksum of a lowercase address", () => {
    const i = inspectAddress("0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed");
    expect(i.valid).toBe(true);
    expect(i.checksum).toBe("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed");
  });
  it("flags a wrong checksum", () => {
    const i = inspectAddress("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAeD");
    expect(i.valid).toBe(true);
    expect(i.badChecksum).toBe(true);
  });
  it("rejects short input", () => expect(inspectAddress("0x1234").valid).toBe(false));
});

describe("time and gas", () => {
  it("converts unix seconds and milliseconds", () => {
    expect(unixToMs("1700000000", "s")).toBe(1700000000000);
    expect(unixToMs("1700000000000", "ms")).toBe(1700000000000);
    expect(() => unixToMs("12.5", "s")).toThrow(InputError);
  });
  it("describes relative time", () => {
    expect(relativeTime(0, 3 * 86400000)).toBe("3 days ago");
    expect(relativeTime(3 * 86400000, 0)).toBe("in 3 days");
  });
  it("maps block to time and back", () => {
    const head = { number: 1000, timestamp: 5000 };
    expect(blockToTime(1100, head, 0.75)).toBe(5075);
    expect(timeToBlock(5075, head, 0.75)).toBe(1100);
  });
  it("multiplies gas by price", () => expect(gasCost(21000n, 20_000_000_000n)).toBe(420_000_000_000_000n));
});
