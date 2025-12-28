// This Cloud Function should be deployed to handle monthly subscription checks
// It runs on the 1st of every month to pause/resume subscriptions based on configured months

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';

initializeApp();
const db = getFirestore();
const stripe = new Stripe(process.env.STRIPE_CONNECT_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function checkAndUpdateSubscriptions() {
  const currentMonth = new Date().getMonth() + 1; // 1-12
  
  try {
    // Get all clubs
    const clubsSnapshot = await db.collection('clubs').get();
    
    for (const clubDoc of clubsSnapshot.docs) {
      const clubId = clubDoc.id;
      
      // Get club settings for stripeConnectAccountId
      const settingsDoc = await db
        .collection('clubs')
        .doc(clubId)
        .collection('settings')
        .doc('config')
        .get();
      
      if (!settingsDoc.exists) continue;
      
      const settings = settingsDoc.data();
      const stripeConnectAccountId = settings?.stripeConnectAccountId;
      
      if (!stripeConnectAccountId) continue;
      
      // Get all players with active subscriptions
      const playersSnapshot = await db
        .collection('clubs')
        .doc(clubId)
        .collection('players')
        .where('stripeSubscriptionId', '!=', null)
        .get();
      
      for (const playerDoc of playersSnapshot.docs) {
        const player = playerDoc.data();
        const subscriptionId = player.stripeSubscriptionId;
        const subscriptionConfig = player.subscriptionConfigSnapshot;
        
        if (!subscriptionId || !subscriptionConfig) continue;
        
        // Use player's individual subscription configuration
        const chargeMonths = subscriptionConfig.chargeMonths || [];
        
        if (chargeMonths.length === 0) continue;
        
        const shouldChargeThisMonth = chargeMonths.includes(currentMonth);
        
        try {
          // Get current subscription status
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId,
            {
              stripeAccount: stripeConnectAccountId,
            }
          );
          
          const isPaused = subscription.pause_collection !== null;
          
          // Update subscription based on current month and player's config
          if (shouldChargeThisMonth && isPaused) {
            // Resume subscription for this month
            await stripe.subscriptions.update(
              subscriptionId,
              {
                pause_collection: null,
              },
              {
                stripeAccount: stripeConnectAccountId,
              }
            );
            
            console.log(`Resumed subscription ${subscriptionId} for player ${playerDoc.id} in month ${currentMonth}`);
            
          } else if (!shouldChargeThisMonth && !isPaused) {
            // Pause subscription for this month
            await stripe.subscriptions.update(
              subscriptionId,
              {
                pause_collection: {
                  behavior: 'void',
                },
              },
              {
                stripeAccount: stripeConnectAccountId,
              }
            );
            
            console.log(`Paused subscription ${subscriptionId} for player ${playerDoc.id} in month ${currentMonth}`);
          }
          
        } catch (error) {
          console.error(`Error updating subscription ${subscriptionId} for player ${playerDoc.id}:`, error);
        }
      }
    }
    
    console.log('Subscription check completed successfully');
  } catch (error) {
    console.error('Error in checkAndUpdateSubscriptions:', error);
    throw error;
  }
}

// Export for Firebase Cloud Functions
export const scheduledSubscriptionCheck = async () => {
  return checkAndUpdateSubscriptions();
};
