import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db as adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "edge"; // or remove if not using edge

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-06-20",
  });

  const sig = req.headers.get("stripe-signature") || "";
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { received: false, error: "Webhook signature error" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      /**
       * ✅ Handle when checkout session completes
       */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const sessionId = session.id;

        const txSnap = await adminDb
          .collectionGroup("feesTransactions")
          .where("stripeSessionId", "==", sessionId)
          .get();

        if (!txSnap.empty) {
          for (const doc of txSnap.docs) {
            await doc.ref.update({
              status: "completed",
              updatedAt: Timestamp.now(),
              stripePaymentIntentId: session.payment_intent || null,
              totalAmount: session.amount_total || 0,
              platformCommissionCents: metadata.platformCommissionCents
                ? Number(metadata.platformCommissionCents)
                : 0,
            });
          }
        } else {
          console.warn("⚠️ No transaction found for session:", sessionId);
        }
        break;
      }

      /**
       * ✅ When payment intent is successful
       */
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;

        const txSnap = await adminDb
          .collectionGroup("feesTransactions")
          .where("stripePaymentIntentId", "==", pi.id)
          .get();

        if (!txSnap.empty) {
          for (const doc of txSnap.docs) {
            await doc.ref.update({
              status: "paid",
              updatedAt: Timestamp.now(),
              totalAmount: pi.amount_received || pi.amount || 0,
            });
          }
        } else {
          console.warn("⚠️ No transaction found for paymentIntent:", pi.id);
        }
        break;
      }

      /**
       * ✅ Handle recurring/subscription invoices
       */
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const metadata = invoice.metadata || {};
        const paymentIntentId = invoice.payment_intent as string | undefined;

        if (paymentIntentId) {
          const txSnap = await adminDb
            .collectionGroup("feesTransactions")
            .where("stripePaymentIntentId", "==", paymentIntentId)
            .get();

          if (!txSnap.empty) {
            for (const doc of txSnap.docs) {
              await doc.ref.update({
                status: "paid",
                invoiceId: invoice.id,
                updatedAt: Timestamp.now(),
                totalAmount: invoice.amount_paid || 0,
                platformCommissionCents: metadata.platformCommissionCents
                  ? Number(metadata.platformCommissionCents)
                  : 0,
              });
            }
          }
        }
        break;
      }

      /**
       * ❌ Handle failed payments
       */
      case "payment_intent.payment_failed":
      case "invoice.payment_failed": {
        const obj: any = event.data.object;
        const paymentIntentId = obj.id || obj.payment_intent;

        if (paymentIntentId) {
          const txSnap = await adminDb
            .collectionGroup("feesTransactions")
            .where("stripePaymentIntentId", "==", paymentIntentId)
            .get();

          if (!txSnap.empty) {
            for (const doc of txSnap.docs) {
              await doc.ref.update({
                status: "failed",
                failureReason:
                  obj.last_payment_error?.message || "payment_failed",
                updatedAt: Timestamp.now(),
              });
            }
          }
        }
        break;
      }

      default:
        console.log(`⚪ Ignoring unhandled event type: ${event.type}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("🔥 Error processing webhook event:", err);
    return NextResponse.json(
      { received: false, error: err.message },
      { status: 500 }
    );
  }
}
