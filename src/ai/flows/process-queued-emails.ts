
'use server';
/**
 * @fileOverview A scheduled flow to process queued emails.
 */

import { ai } from '@/ai/genkit';
import { db } from '@/lib/firebase';
import { sendEmailUpdateFlow } from './send-email-update';
import { doc, getDocs, collection, updateDoc, writeBatch, getDoc, deleteDoc, Timestamp, increment } from 'firebase/firestore';


const DAILY_LIMIT = 100;

// Helper to get club configuration and daily send limit
async function getClubConfig(clubId: string) {
    const settingsRef = doc(db, 'clubs', clubId, 'settings', 'config');
    const clubRef = doc(db, 'clubs', clubId);

    const [settingsDoc, clubDoc] = await Promise.all([getDoc(settingsRef), getDoc(clubRef)]);

    let config = {
      clubName: "Tu Club",
      fromEmail: `notifications@${process.env.GCLOUD_PROJECT || 'sportspanel'}.web.app`,
      apiKey: null as string | null,
      availableToSendToday: DAILY_LIMIT,
    };

    if (clubDoc.exists()) {
        config.clubName = clubDoc.data()?.name || "Tu Club";
    }

    if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data?.fromEmail && data?.senderVerificationStatus === 'verified') {
            config.fromEmail = data.fromEmail;
        }
        config.apiKey = data?.platformSendgridApiKey || null;

        const now = Timestamp.now();
        const oneDayAgo = now.toMillis() - (24 * 60 * 60 * 1000);
        const lastReset = data?.dailyEmailCountResetTimestamp?.toMillis() || 0;
        
        let currentCount = data?.dailyEmailCount || 0;
        if (lastReset < oneDayAgo) {
            currentCount = 0;
        }

        config.availableToSendToday = DAILY_LIMIT - currentCount;
    }
    return config;
}

// Scheduled flow to run periodically (e.g., daily via cron)
export const processQueuedEmailsFlow = ai.defineFlow(
  {
    name: 'processQueuedEmailsFlow',
    // No input needed, it will check the queue.
  },
  async () => {
    console.log('Running scheduled job: processQueuedEmailsFlow');
    
    const clubsSnapshot = await getDocs(collection(db, 'clubs'));
    
    if (clubsSnapshot.empty) {
      console.log('No clubs found to process queues for.');
      return;
    }

    for (const clubDoc of clubsSnapshot.docs) {
      const clubId = clubDoc.id;
      console.log(`Checking email queue for club: ${clubId}`);
      
      const { availableToSendToday, apiKey, clubName, fromEmail } = await getClubConfig(clubId);

      if (!apiKey) {
        console.error(`No API Key for club ${clubId}, skipping.`);
        continue;
      }
      
      if (availableToSendToday <= 0) {
        console.log(`Daily limit reached for club ${clubId}. Skipping queue processing.`);
        continue;
      }

      const queueRef = collection(db, "clubs", clubId, "emailQueue");
      const queueSnapshot = await getDocs(queueRef);

      if (queueSnapshot.empty) {
        console.log(`Email queue for club ${clubId} is empty.`);
        continue;
      }

      let emailsSentThisRun = 0;

      for (const queuedBatchDoc of queueSnapshot.docs) {
        if(emailsSentThisRun >= availableToSendToday) break;

        const { recipients, fieldConfig } = queuedBatchDoc.data();
        const remainingDailyQuota = availableToSendToday - emailsSentThisRun;
        
        const recipientsToSend = recipients.slice(0, remainingDailyQuota);
        const recipientsToKeepInQueue = recipients.slice(remainingDailyQuota);

        console.log(`Processing batch for club ${clubId}. To send: ${recipientsToSend.length}, Remaining in batch: ${recipientsToKeepInQueue.length}`);

        const result = await sendEmailUpdateFlow({
          clubId,
          recipients: recipientsToSend,
          fieldConfig,
          apiKey,
          clubName,
          fromEmail
        });

        emailsSentThisRun += result.sentCount;

        if (result.success) {
          if (recipientsToKeepInQueue.length > 0) {
            await updateDoc(doc(queueRef, queuedBatchDoc.id), { recipients: recipientsToKeepInQueue });
            console.log(`${result.sentCount} emails sent. ${recipientsToKeepInQueue.length} emails remain in the batch.`);
          } else {
            await deleteDoc(doc(queueRef, queuedBatchDoc.id));
            console.log(`Batch for club ${clubId} processed successfully. Deleting from queue.`);
          }

          if (result.sentCount > 0) {
            const settingsRef = doc(db, 'clubs', clubId, 'settings', 'config');
            await updateDoc(settingsRef, {
                dailyEmailCount: increment(result.sentCount),
            });
          }

        } else {
          console.error(`Failed to process queued batch for club ${clubId}:`, result.error);
          break; 
        }
      }
    }
  }
);
