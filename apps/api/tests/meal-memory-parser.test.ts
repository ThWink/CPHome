import { describe, expect, it } from "vitest";
import { parseMealMemoryText } from "../src/features/meals/meal-memory-parser.js";

describe("parseMealMemoryText", () => {
  it("parses takeout memory with amount and spicy preference", () => {
    const result = parseMealMemoryText({
      text: "今天吃了麻辣烫，花了45，她觉得不错但不要太辣。",
      occurredOn: "2026-04-25",
      person: "partner"
    });

    expect(result).toEqual({
      confirmationRequired: true,
      mealRecord: {
        occurredOn: "2026-04-25",
        mealKind: "takeout",
        person: "partner",
        vendorName: "麻辣烫",
        items: ["麻辣烫"],
        amountCents: 4500,
        rating: 4,
        note: "她觉得不错但不要太辣"
      },
      preferenceUpdates: [
        {
          person: "partner",
          category: "taste",
          value: "不要太辣",
          sentiment: "avoid",
          weight: -30,
          note: "微辣可以，避免太辣"
        },
        {
          person: "partner",
          category: "dish",
          value: "麻辣烫",
          sentiment: "like",
          weight: 30,
          note: "来自饮食记录：她觉得不错但不要太辣"
        }
      ],
      memoryText: "2026-04-25 吃了麻辣烫，花费45元，评价：她觉得不错但不要太辣。"
    });
  });

  it("parses tired-of-food memory as lower recommendation weight", () => {
    const result = parseMealMemoryText({
      text: "晚上吃了黄焖鸡，花了42，有点腻，下次少推荐。",
      occurredOn: "2026-04-25",
      person: "both"
    });

    expect(result.mealRecord).toMatchObject({
      vendorName: "黄焖鸡",
      items: ["黄焖鸡"],
      amountCents: 4200,
      rating: 2,
      note: "有点腻，下次少推荐"
    });

    expect(result.preferenceUpdates).toContainEqual({
      person: "both",
      category: "dish",
      value: "黄焖鸡",
      sentiment: "dislike",
      weight: -25,
      note: "有点腻，下次少推荐"
    });
  });
});
