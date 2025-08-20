
'use server';
/**
 * @fileOverview A scheduled flow to process queued emails.
 */

import { ai } from '@/ai/genkit';
import { db } from '@/lib/firebase';
import { sendEmailUpdateFlow } from './send-email-update';
import { doc, getDocs, collection, updateDoc, writeBatch } from 'firebase/firestore';


const DAILY_LIMIT = 100;

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
      
      const settingsRef = doc(db, "clubs", clubId, "settings", "config");
      const settingsSnap = await getDoc(settingsRef);

      const apiKey = settingsSnap.exists() ? settingsSnap.data()?.platformSendgridApiKey : null;
      let fromEmail = `notifications@${process.env.GCLOUD_PROJECT || 'sportspanel'}.web.app`;
      if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          if (data?.fromEmail && data?.senderVerificationStatus === 'verified') {
              fromEmail = data.fromEmail;
          }
      }

      if (!apiKey) {
        console.error(`No API Key for club ${clubId}, skipping.`);
        continue;
      }

      const clubData = clubDoc.data();
      const clubName = clubData.name || "Tu Club";

      const queueRef = collection(db, "clubs", clubId, "emailQueue");
      const queueSnapshot = await getDocs(queueRef);

      if (queueSnapshot.empty) {
        console.log(`Email queue for club ${clubId} is empty.`);
        continue;
      }

      for (const queuedBatch of queueSnapshot.docs) {
        const { recipients, fieldConfig } = queuedBatch.data();

        console.log(`Processing batch of ${recipients.length} queued emails for club ${clubId}.`);

        // Use the existing flow to send emails, respecting daily limits.
        const result = await sendEmailUpdateFlow({
          clubId,
          recipients,
          fieldConfig,
          apiKey,
          clubName,
          fromEmail
        });

        if (result.success) {
          // If the batch was fully sent, remove it from the queue
          if (result.queuedCount === 0) {
            console.log(`Batch for club ${clubId} processed successfully. Deleting from queue.`);
            await doc(queueRef, queuedBatch.id).delete();
          } else {
            // If only part of the batch was sent, update the remaining recipients in the queue
            const remainingRecipients = recipients.slice(result.sentCount);
             console.log(`${result.sentCount} emails sent. ${remainingRecipients.length} emails remain in the queue for club ${clubId}.`);
            await updateDoc(doc(queueRef, queuedBatch.id), { recipients: remainingRecipients });
          }
        } else {
          console.error(`Failed to process queued batch for club ${clubId}:`, result.error);
          // If we fail, we stop processing this club's queue for this run to avoid hammering a failing service.
          // The error could be transient (e.g., API key revoked), so we'll try again on the next scheduled run.
          break; 
        }

        // If the last run used up all available daily sends, stop processing for this club.
        if (result.sentCount < recipients.length) {
            console.log(`Daily limit likely reached for club ${clubId}. Pausing queue processing for this run.`);
            break;
        }
      }
    }
  }
);
