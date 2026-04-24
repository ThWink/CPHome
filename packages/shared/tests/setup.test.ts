import { describe, expect, it } from "vitest";
import { parseInitializeCoupleInput } from "../src/setup.js";

describe("parseInitializeCoupleInput", () => {
  it("normalizes valid setup input", () => {
    const result = parseInitializeCoupleInput({
      coupleName: "  Our Home  ",
      selfName: "  Wink  ",
      partnerName: "  Partner  "
    });

    expect(result).toEqual({
      coupleName: "Our Home",
      selfName: "Wink",
      partnerName: "Partner"
    });
  });

  it("rejects empty names", () => {
    expect(() =>
      parseInitializeCoupleInput({
        coupleName: " ",
        selfName: "Wink",
        partnerName: "Partner"
      })
    ).toThrow("coupleName is required");
  });

  it("rejects names longer than 40 characters", () => {
    expect(() =>
      parseInitializeCoupleInput({
        coupleName: "A".repeat(41),
        selfName: "Wink",
        partnerName: "Partner"
      })
    ).toThrow("coupleName must be 40 characters or fewer");
  });
});
