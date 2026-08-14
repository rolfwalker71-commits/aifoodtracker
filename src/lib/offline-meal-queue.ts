/** @deprecated – use `@/lib/offline-db` */
export {
  enqueueOfflineDraft as enqueueOfflineMeal,
  getOfflineDraftCount as getOfflineMealQueueCount,
  listOfflineDrafts as getOfflineMealQueue,
  removeOfflineDraft as removeOfflineMeal,
} from "@/lib/offline-db";
