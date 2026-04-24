import {
  parseInitializeCoupleInput,
  type InitializeCoupleResult,
  type SetupStatus
} from "@couple-life/shared";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../../db/client.js";

export class SetupAlreadyCompletedError extends Error {
  constructor() {
    super("This deployment is already bound to one couple");
    this.name = "SetupAlreadyCompletedError";
  }
}

export function createInviteCode(): string {
  return nanoid(8).toUpperCase().replace(/_/g, "0").replace(/-/g, "1");
}

export function getSetupStatus(database: AppDatabase): SetupStatus {
  const couple = database.sqlite
    .prepare("select id, name from couples order by created_at asc limit 1")
    .get() as { id: string; name: string } | undefined;

  if (!couple) {
    return {
      configured: false,
      coupleName: null,
      memberCount: 0
    };
  }

  const memberCount = database.sqlite
    .prepare("select count(*) as count from couple_members where couple_id = ?")
    .get(couple.id) as { count: number };

  return {
    configured: true,
    coupleName: couple.name,
    memberCount: memberCount.count
  };
}

export function initializeCouple(database: AppDatabase, input: unknown): InitializeCoupleResult {
  const status = getSetupStatus(database);
  if (status.configured) {
    throw new SetupAlreadyCompletedError();
  }

  const parsed = parseInitializeCoupleInput(input);
  const coupleId = nanoid();
  const selfUserId = nanoid();
  const partnerUserId = nanoid();
  const inviteCode = createInviteCode();

  database.sqlite.exec("begin");

  try {
    database.sqlite
      .prepare("insert into couples (id, name, invite_code) values (?, ?, ?)")
      .run(coupleId, parsed.coupleName, inviteCode);

    database.sqlite
      .prepare("insert into users (id, display_name) values (?, ?)")
      .run(selfUserId, parsed.selfName);

    database.sqlite
      .prepare("insert into users (id, display_name) values (?, ?)")
      .run(partnerUserId, parsed.partnerName);

    database.sqlite
      .prepare("insert into couple_members (id, couple_id, user_id, role) values (?, ?, ?, ?)")
      .run(nanoid(), coupleId, selfUserId, "self");

    database.sqlite
      .prepare("insert into couple_members (id, couple_id, user_id, role) values (?, ?, ?, ?)")
      .run(nanoid(), coupleId, partnerUserId, "partner");

    database.sqlite.exec("commit");
  } catch (error) {
    database.sqlite.exec("rollback");
    throw error;
  }

  return {
    coupleId,
    selfUserId,
    partnerUserId,
    inviteCode
  };
}
