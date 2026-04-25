import { describe, expect, it } from "vitest";
import {
  parseExpenseInput,
  parseParcelInput,
  parseParcelStatusInput,
  parseWaterDrinkInput
} from "../src/life.js";

describe("life contracts", () => {
  it("normalizes expense input", () => {
    expect(
      parseExpenseInput({
        occurredOn: "2026-04-25",
        category: "takeout",
        payer: "self",
        amountCents: 4580,
        note: "  晚饭外卖  "
      })
    ).toEqual({
      occurredOn: "2026-04-25",
      category: "takeout",
      payer: "self",
      amountCents: 4580,
      note: "晚饭外卖"
    });
  });

  it("rejects invalid expense amount", () => {
    expect(() =>
      parseExpenseInput({
        occurredOn: "2026-04-25",
        category: "takeout",
        payer: "self",
        amountCents: -1,
        note: null
      })
    ).toThrow("amountCents must be a non-negative integer");
  });

  it("normalizes parcel input", () => {
    expect(
      parseParcelInput({
        title: "  京东快递  ",
        pickupCode: "A-1024",
        location: "楼下驿站",
        owner: "partner",
        note: "帮忙拿"
      })
    ).toEqual({
      title: "京东快递",
      pickupCode: "A-1024",
      location: "楼下驿站",
      owner: "partner",
      note: "帮忙拿"
    });
  });

  it("normalizes parcel status input", () => {
    expect(parseParcelStatusInput({ status: "picked" })).toEqual({
      status: "picked"
    });
  });

  it("normalizes water drink input", () => {
    expect(
      parseWaterDrinkInput({
        person: "self",
        occurredOn: "2026-04-25",
        amountMl: 300
      })
    ).toEqual({
      person: "self",
      occurredOn: "2026-04-25",
      amountMl: 300
    });
  });
});
