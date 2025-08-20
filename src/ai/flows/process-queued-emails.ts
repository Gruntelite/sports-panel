
'use server';
/**
 * @fileOverview A scheduled flow to process queued emails.
 */

import { ai } from '@/ai/genkit';
import { db } from '@/lib/firebase-admin';
import { sendEmailUpdateFlow } from './send-email-update';

// Scheduled flow to run periodically (e.g., daily via cron)
export const processQueuedEmailsFlow = ai.defineFlow(
  {
    name: 'processQueuedEmailsFlow',
    // No input needed, it will check the queue.
  },
  async () => {
    console.log('Running scheduled job: processQueuedEmailsFlow');
    
    const clubsSnapshot = await db.collection('clubs').get();
    
    if (clubsSnapshot.empty) {
      console.log('No clubs found to process queues for.');
      return;
    }

    for (const clubDoc of clubsSnapshot.docs) {
      const clubId = clubDoc.id;
      console.log(`Checking email queue for club: ${clubId}`);

      const queueRef = db.collection('clubs').doc(clubId).collection('emailQueue');
      const queueSnapshot = await queueRef.orderBy('createdAt', 'asc').get();

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
        });

        if (result.success) {
          // If the batch was fully sent, remove it from the queue
          if (result.queuedCount === 0) {
            console.log(`Batch for club ${clubId} processed successfully. Deleting from queue.`);
            await queuedBatch.ref.delete();
          } else {
            // If only part of the batch was sent, update the remaining recipients in the queue
            const remainingRecipients = recipients.slice(result.sentCount);
             console.log(`${result.sentCount} emails sent. ${remainingRecipients.length} emails remain in the queue for club ${clubId}.`);
            await queuedBatch.ref.update({ recipients: remainingRecipients });
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

