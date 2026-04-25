import { afterEach, describe, expect, it, vi } from "vitest";
import { parseMealMemoryText } from "../src/features/meals/meal-memory-parser.js";

const originalTimeZone = process.env.TZ;

afterEach(() => {
  vi.useRealTimers();
  process.env.TZ = originalTimeZone;
});

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

  it("defaults missing occurredOn using Asia Shanghai date", () => {
    process.env.TZ = "UTC";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T16:30:00.000Z"));

    const result = parseMealMemoryText({
      text: "今天吃了粥，花了18。"
    });

    expect(result.mealRecord.occurredOn).toBe("2026-04-25");
  });

  it("keeps parsed notes confirmable by shared validators", () => {
    const result = parseMealMemoryText({
      text: "今天吃了麻辣烫，花了45，她觉得不错但不要太辣，备注非常长因为想记录口味细节配送速度包装汤底咸淡蔬菜分量下次是否还点以及其它补充说明，还想记录她对辣度油度盐度温度和第二天是否还愿意复购的详细反馈。",
      occurredOn: "2026-04-25",
      person: "partner"
    });

    expect(result.mealRecord.note?.length).toBeLessThanOrEqual(80);
    expect(result.preferenceUpdates.every((item) => item.note === null || item.note.length <= 80)).toBe(true);
  });

  it("keeps parsed dish names and preference values confirmable", () => {
    const result = parseMealMemoryText({
      text: "今天吃了超长菜名套餐包含麻辣烫炸鸡汉堡寿司拼盘黄焖鸡米饭粥和小菜日式便当热汤冷食蔬菜甜品饮料水果拼盘双人套餐加备注超长菜名套餐包含麻辣烫炸鸡汉堡寿司拼盘黄焖鸡米饭粥和小菜，花了88，挺好吃。",
      occurredOn: "2026-04-25",
      person: "both"
    });

    expect(result.mealRecord.vendorName.length).toBeLessThanOrEqual(80);
    expect(result.mealRecord.items.every((item) => item.length <= 80)).toBe(true);
    expect(result.preferenceUpdates.every((item) => item.value.length <= 80)).toBe(true);
  });
});
