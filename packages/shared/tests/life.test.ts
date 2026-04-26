import { describe, expect, it } from "vitest";
import {
  parseAnniversaryInput,
  parseExpenseInput,
  parseParcelInput,
  parseParcelStatusInput,
  parseTodoInput,
  parseTodoStatusInput,
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
        note: "帮忙拿",
        imagePath: "  wxfile://parcel-shot.png  "
      })
    ).toEqual({
      title: "京东快递",
      pickupCode: "A-1024",
      location: "楼下驿站",
      owner: "partner",
      note: "帮忙拿",
      imagePath: "wxfile://parcel-shot.png"
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

  it("normalizes todo input", () => {
    expect(
      parseTodoInput({
        title: "  记得拿快递  ",
        assignee: "both",
        dueOn: "2026-04-25"
      })
    ).toEqual({
      title: "记得拿快递",
      assignee: "both",
      dueOn: "2026-04-25"
    });
  });

  it("normalizes todo status input", () => {
    expect(parseTodoStatusInput({ status: "done" })).toEqual({
      status: "done"
    });
  });

  it("normalizes anniversary input", () => {
    expect(
      parseAnniversaryInput({
        title: "  在一起纪念日  ",
        date: "2026-05-20",
        repeat: "yearly",
        remindDaysBefore: 3
      })
    ).toEqual({
      title: "在一起纪念日",
      date: "2026-05-20",
      repeat: "yearly",
      remindDaysBefore: 3
    });
  });
});
