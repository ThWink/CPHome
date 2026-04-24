import { describe, expect, it } from "vitest";
import {
  parseMealRecordInput,
  parsePreferenceInput,
  parseRecommendationRequest
} from "../src/meal.js";

describe("meal shared contracts", () => {
  it("normalizes a manual takeout record", () => {
    const record = parseMealRecordInput({
      occurredOn: "2026-04-25",
      mealKind: "takeout",
      person: "both",
      vendorName: "  麻辣烫店  ",
      items: [" 麻辣烫 ", " 可乐 "],
      amountCents: 4500,
      rating: 4,
      note: "  不要太辣  "
    });

    expect(record).toEqual({
      occurredOn: "2026-04-25",
      mealKind: "takeout",
      person: "both",
      vendorName: "麻辣烫店",
      items: ["麻辣烫", "可乐"],
      amountCents: 4500,
      rating: 4,
      note: "不要太辣"
    });
  });

  it("rejects invalid amounts and ratings", () => {
    expect(() =>
      parseMealRecordInput({
        occurredOn: "2026-04-25",
        mealKind: "takeout",
        person: "both",
        vendorName: "麻辣烫店",
        items: ["麻辣烫"],
        amountCents: -1,
        rating: 6,
        note: null
      })
    ).toThrow("amountCents must be a non-negative integer");
  });

  it("normalizes taste preference input", () => {
    const preference = parsePreferenceInput({
      person: "partner",
      category: "taste",
      value: "  不要太辣  ",
      sentiment: "avoid",
      weight: -30,
      note: "  微辣可以  "
    });

    expect(preference).toEqual({
      person: "partner",
      category: "taste",
      value: "不要太辣",
      sentiment: "avoid",
      weight: -30,
      note: "微辣可以"
    });
  });

  it("defaults recommendation request options", () => {
    const request = parseRecommendationRequest({});

    expect(request).toEqual({
      weather: "normal",
      budget: "normal",
      maxRecentDays: 3
    });
  });
});
