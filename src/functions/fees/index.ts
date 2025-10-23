import * as functions from "firebase-functions";
import admin from "firebase-admin";
import Stripe from "stripe";

admin.initializeApp();
const db = admin.firestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

export const scheduleMonthlyCharges = functions.pubsub.schedule("every 24 hours").onRun(async (context) => {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1; // 1..12

  // get all clubs with feesConfig/settings.billingDay == day
  const clubsSnap = await db.collection("clubs").get();
  const results: any[] = [];

  for (const clubDoc of clubsSnap.docs) {
    const clubId = clubDoc.id;
    const cfgRef = db.collection("clubs").doc(clubId).collection("feesConfig").doc("settings");
    const cfgSnap = await cfgRef.get();
    if (!cfgSnap.exists) continue;
    const cfg = cfgSnap.data();
    const billingDay = cfg?.billingDay || 1;
    const activeMonths: number[] = cfg?.activeMonths || [1,2,3,4,5,6,7,8,9,10,11,12];
    const commissionPerMonth = Number(cfg?.commissionPerMonth ?? 0.24);

    if (billingDay !== day) continue;
    if (!activeMonths.includes(month)) continue;

    // for each player in this club
    const playersSnap = await db.collection("clubs").doc(clubId).collection("players").get();
    for (const pDoc of playersSnap.docs) {
      const player = pDoc.data();
      const playerId = pDoc.id;
      if (!player || !player.annualFee) continue;

      // compute monthly fee
      const activeCount = activeMonths.length || 12;
      const monthlyFee = Math.round((Number(player.annualFee) / activeCount) * 100) / 100; // euros
      const amountCents = Math.round(monthlyFee * 100);
      const commissionCents = Math.round(commissionPerMonth * 100);

      // Ensure player has payment method or stripe customer id if you rely on off-session charging.
      // Here we'll attempt an on-the-fly PaymentIntent via Checkout if no customer—a simpler approach: create PaymentIntent with capture via Checkout Session isn't trivial.
      // For simplicity: create a PaymentIntent on PLATFORM and set transfer_data and application_fee_amount.
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountCents,
          currency: "eur",
          description: `Cuota mensual ${month}/${today.getFullYear()} - ${clubId} / ${playerId}`,
          // If you have stored customer id (player.stripeCustomerId), include it:
          customer: player.stripeCustomerId || undefined,
          // Off-session confirm will fail if no saved payment method; you must implement setup flow first.
          off_session: !!player.stripeCustomerId,
          confirm: !!player.stripeCustomerId,
          payment_method: player.defaultPaymentMethod || undefined,
          transfer_data: { destination: cfg?.stripeConnectAccountId || cfg?.stripeAccountId },
          application_fee_amount: commissionCents,
          metadata: { clubId, playerId, month, year: today.getFullYear().toString() },
        });

        // Save transaction
        const txRef = db.collection("clubs").doc(clubId).collection("feesTransactions").doc();
        await txRef.set({
          clubId,
          playerId,
          amount: monthlyFee,
          amountCents,
          commissionCents,
          stripePaymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          month,
          year: today.getFullYear(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        results.push({ clubId, playerId, ok: true });
      } catch (err: any) {
        console.error("Error charging player", clubId, pDoc.id, err);
        results.push({ clubId, playerId, ok: false, err: err.message });
        // Optionally record failed tx:
        const txRef = db.collection("clubs").doc(clubId).collection("feesTransactions").doc();
        await txRef.set({
          clubId,
          playerId,
          amount: monthlyFee,
          amountCents,
          commissionCents,
          status: "failed",
          failureReason: err.message,
          month,
          year: today.getFullYear(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }

  return { success: true, results };
});
