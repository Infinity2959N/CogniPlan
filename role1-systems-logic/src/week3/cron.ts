import { Week3DataStore } from "./types";

export async function runDailyScanner(dataStore: Week3DataStore) {
  console.log("⏰ [Daily Scanner] Initiating overdue scan...");
  
  try {
    if (dataStore.kind === "prisma") {
      const { prisma } = require("./prismaClient");
      const now = new Date();
      
      const overdueLogs = await prisma.studyLog.findMany({
        where: {
          nextReview: { lte: now },
        },
        include: {
          topic: true,
        },
      });

      console.log(`⏰ [Daily Scanner] Found ${overdueLogs.length} overdue logs.`);
      let highUrgencyUpdates = 0;
      
      for (const log of overdueLogs) {
        if (log.topic.urgency !== "high") {
          await prisma.topic.update({
            where: { id: log.topicId },
            data: { urgency: "high" },
          });
          highUrgencyUpdates++;
        }
      }
      
      console.log(`⏰ [Daily Scanner] Automatically escalated ${highUrgencyUpdates} overdue topics to high urgency!`);
    } else {
      console.log("⏰ [Daily Scanner] In-memory datastore detected. Scanning memory state...");
      const result = await dataStore.getTopicsDueToday("dummy-user-id");
      console.log(`⏰ [Daily Scanner] In-memory scan complete. Due queue count: ${result.queue.length}`);
    }
  } catch (error) {
    console.error("❌ [Daily Scanner] Error during daily scan:", error);
  }
}

export function initDailyScanner(dataStore: Week3DataStore) {
  // Run scanner on bootstrap after 1.5 seconds
  setTimeout(() => {
    runDailyScanner(dataStore);
  }, 1500);

  // Run daily: calculate milliseconds until 4:00 AM next day
  const scheduleNext4AmCheck = () => {
    const now = new Date();
    const nextCheck = new Date();
    nextCheck.setHours(4, 0, 0, 0);
    if (nextCheck <= now) {
      nextCheck.setDate(nextCheck.getDate() + 1);
    }
    const msUntil4Am = nextCheck.getTime() - now.getTime();
    console.log(`⏰ [Daily Scanner] Next automated 4:00 AM scan scheduled in ${Math.round(msUntil4Am / 1000 / 60)} minutes.`);
    
    setTimeout(() => {
      runDailyScanner(dataStore);
      scheduleNext4AmCheck();
    }, msUntil4Am);
  };

  scheduleNext4AmCheck();
}
