import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_CONNECT_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    // Handle subscription events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { playerId, clubId } = session.metadata || {};

        if (playerId && clubId) {
          const playerRef = db.collection('clubs').doc(clubId).collection('players').doc(playerId);
          await playerRef.update({
            stripeSubscriptionId: session.subscription,
            subscriptionStatus: 'active',
            paymentStatus: 'paid',
            lastPaymentDate: new Date().toISOString(),
          });
        }
        break;
      }

      case 'invoice.upcoming': {
        // Check if current month is in allowed charge months
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string,
          {
            stripeAccount: invoice.on_behalf_of as string,
          }
        );

        const chargeMonths = JSON.parse(
          subscription.metadata.chargeMonths || '[]'
        );
        const currentMonth = new Date().getMonth() + 1; // 1-12

        // If current month is not in charge months, skip the invoice
        if (!chargeMonths.includes(currentMonth)) {
          // Cancel this specific invoice
          await stripe.invoices.voidInvoice(invoice.id, {
            stripeAccount: invoice.on_behalf_of as string,
          });
          
          console.log(`Skipped invoice for month ${currentMonth} (not in charge months)`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const { playerId, clubId } = invoice.subscription_details?.metadata || {};

        if (playerId && clubId) {
          const playerRef = db.collection('clubs').doc(clubId).collection('players').doc(playerId);
          await playerRef.update({
            paymentStatus: 'paid',
            lastPaymentDate: new Date().toISOString(),
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const { playerId, clubId } = invoice.subscription_details?.metadata || {};

        if (playerId && clubId) {
          const playerRef = db.collection('clubs').doc(clubId).collection('players').doc(playerId);
          await playerRef.update({
            paymentStatus: 'overdue',
          });
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.paused': {
        const subscription = event.data.object as Stripe.Subscription;
        const { playerId, clubId } = subscription.metadata || {};

        if (playerId && clubId) {
          const playerRef = db.collection('clubs').doc(clubId).collection('players').doc(playerId);
          await playerRef.update({
            subscriptionStatus: 'canceled',
            paymentStatus: 'pending',
          });
        }
        break;
      }

      case 'customer.subscription.resumed': {
        const subscription = event.data.object as Stripe.Subscription;
        const { playerId, clubId } = subscription.metadata || {};

        if (playerId && clubId) {
          const playerRef = db.collection('clubs').doc(clubId).collection('players').doc(playerId);
          await playerRef.update({
            subscriptionStatus: 'active',
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
