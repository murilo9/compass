import { AnyBulkWriteOperation } from "mongodb";
import dayjs from "dayjs";
import { gSchema$Event } from "@core/types/gcal";
import { MapEvent } from "@core/mappers/map.event";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { minutesFromNow } from "@core/util/date.utils";
import { Schema_Event } from "@core/types/event.types";
import { Logger } from "@core/logger/winston.logger";
import { Schema_Sync } from "@core/types/sync.types";
import { cancelledEventsIds } from "@backend/common/services/gcal/gcal.utils";
import { ENV } from "@backend/common/constants/env.constants";

const logger = Logger("app:sync.helpers");

/**
 * Helper funcs that don't depend on
 * other services
 *
 */

export const assembleEventOperations = (
  userId: string,
  eventsToDelete: string[],
  eventsToUpdate: gSchema$Event[]
) => {
  const bulkOperations: AnyBulkWriteOperation[] = [];

  if (eventsToDelete.length > 0) {
    bulkOperations.push({
      deleteMany: {
        filter: {
          user: userId,
          gEventId: { $in: eventsToDelete },
        },
      },
    });
  }

  if (eventsToUpdate.length > 0) {
    const cEvents = MapEvent.toCompass(userId, eventsToUpdate);

    cEvents.forEach((e: Schema_Event) => {
      bulkOperations.push({
        replaceOne: {
          filter: { gEventId: e.gEventId, user: userId },
          replacement: e,
          upsert: true,
        },
      });
    });
  }

  return bulkOperations;
};

export const categorizeGcalEvents = (events: gSchema$Event[]) => {
  const toDelete = cancelledEventsIds(events);

  // if its going to be deleted anyway, then dont bother updating
  const _isntBeingDeleted = (e: gSchema$Event) =>
    !toDelete.includes(e.id as string);

  const toUpdate = events.filter((e) => _isntBeingDeleted(e));

  const categorized = {
    toDelete,
    toUpdate,
  };
  return categorized;
};

export const getActiveDeadline = () => {
  const deadlineDays = 14;
  const deadline = dayjs()
    .hour(0)
    .minute(0)
    .subtract(deadlineDays, "days")
    .format();

  return deadline;
};

export const syncExpired = (expiry?: string) => {
  if (!expiry) return true;

  const expiration = new Date(parseInt(expiry)).getTime();
  const now = new Date().getTime();

  const expired = now > expiration;
  return expired;
};

export const syncExpiresSoon = (expiry: string) => {
  const bufferDays = 3;
  const MIN_IN_DAY = 1440;

  const expiration = new Date(parseInt(expiry)).getTime();
  const deadline = minutesFromNow(MIN_IN_DAY * bufferDays, "ms");

  const expiresSoon = expiration < deadline;
  return expiresSoon;
};

export const findCalendarId = (resourceId: string, sync: Schema_Sync) => {
  const matches = sync.google.events.filter((g) => {
    return g.resourceId === resourceId;
  });

  if (matches.length !== 1) {
    logger.error(`No calendar has resourceId: ${resourceId}`);
  }

  if (matches.length > 1) {
    throw new BaseError(
      "Duplicate resourceIds",
      `Multiple calendars share resourceId: ${resourceId}`,
      Status.BAD_REQUEST,
      false
    );
  }

  return matches[0]?.gCalendarId;
};

export const getChannelExpiration = () => {
  const numMin = parseInt(ENV.CHANNEL_EXPIRATION_MIN);
  logExpirationReminder(numMin);
  const expiration = minutesFromNow(numMin, "ms").toString();
  return expiration;
};

export const getSummary = (
  eventsToUpdate: gSchema$Event[],
  eventsToDelete: string[]
) => {
  let updateSummary = "";
  let deleteSummary = "";
  const min = 0;
  const max = 3;

  if (eventsToUpdate.length > min) {
    if (eventsToUpdate.length < max) {
      updateSummary = `updating: "${eventsToUpdate
        .map((e) => e.summary)
        .toString()}" `;
    } else {
      updateSummary = `updating ${eventsToUpdate.length}`;
    }
  }

  if (eventsToDelete.length > min) {
    if (eventsToDelete.length < max) {
      deleteSummary = `deleting: ${eventsToDelete.toString()}`; // will just be the googleId
    } else {
      deleteSummary = ` deleting ${eventsToDelete.length}`;
    }
  }

  let summary = "";
  if (updateSummary !== "") summary += updateSummary;
  if (deleteSummary !== "") summary += deleteSummary;

  return summary;
};

export const hasGoogleHeaders = (headers: object) => {
  const expected = [
    "x-goog-channel-id",
    "x-goog-resource-id",
    "x-goog-resource-state",
    "x-goog-channel-expiration",
  ];

  const hasHeaders = expected.every((i) => i in headers);

  return hasHeaders;
};

export const logExpirationReminder = (min: number) => {
  const hours = Math.round((min / 60) * 100) / 100;
  const days = Math.round((hours / 24) * 100) / 100;

  const label = hours > 24 ? `${days} days` : `${hours} hours`;
  logger.debug(`REMINDER: Channel will expire in ${min} minutes (${label})`);
};

/* 
this can happen if sync fails unexpetedly,
(eg server was down for awhile and it expired)
export const channelNotFound = (
  calendar: Schema_CalendarList,
  channelId: string
  ) => {
    const matchingChannelIds = calendar.google.items.filter(
      (c) => c.sync.channelId === channelId
      );
      if (matchingChannelIds.length != 1) {
        return true;
      } else {
        // if exactly 1 entry, then the correct channel was found
        return false;
      }
    };
*/

/*
export const channelRefreshNeeded = (channelId: string, expiration: string) => {
  // --
  // const _channelNotFound = channelNotFound(calendar, channelId);
  // const refreshNeeded = _channelNotFound || _channelExpiresSoon;
  const _channelExpiresSoon = channelExpiresSoon(expiration);
  const refreshNeeded = _channelExpiresSoon;

  if (refreshNeeded) {
    logger.debug(
      `Refresh needed because:
      Channel expired? : maybe
      Channel expiring soon? : ${_channelExpiresSoon.toString()}`
    );
  }

  return refreshNeeded;
};
*/

/*
export const channelExpiresSoon = (expiry: string) => {
  const numMin = Math.round(parseInt(ENV.CHANNEL_EXPIRATION_MIN) / 2);
  const xMinFromNow = minutesFromNow(numMin, "ms");
  const expiration = new Date(expiry).getTime();
  const expiresSoon = expiration < xMinFromNow;

  return expiresSoon;
};
*/