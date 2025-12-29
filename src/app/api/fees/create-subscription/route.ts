import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase-admin';

// Log para debugging
const stripeKey = process.env.STRIPE_SECRET_KEY;
console.log('Stripe API Key available:', !!stripeKey);

if (!stripeKey) {
  console.error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(stripeKey || '', {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(req: NextRequest) {
  try {
    // Check if Stripe is properly configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Missing API key.' },
        { status: 500 }
      );
    }

    const { playerId, clubId } = await req.json();

    if (!playerId || !clubId) {
      return NextResponse.json(
        { error: 'playerId and clubId are required' },
        { status: 400 }
      );
    }

    // Get club settings
    const settingsRef = db.collection('clubs').doc(clubId).collection('settings').doc('config');
    const settingsDoc = await settingsRef.get();
    
    if (!settingsDoc.exists) {
      return NextResponse.json(
        { error: 'Club settings not found' },
        { status: 404 }
      );
    }

    const settings = settingsDoc.data();
    const stripeConnectAccountId = settings?.stripeConnectAccountId;
    
    if (!stripeConnectAccountId) {
      return NextResponse.json(
        { error: 'Stripe Connect account not configured' },
        { status: 400 }
      );
    }

    const feeChargeDay = settings?.feeChargeDay || 1;
    const feeChargeMonths = settings?.feeChargeMonths || [];

    if (feeChargeMonths.length === 0) {
      return NextResponse.json(
        { error: 'No charge months configured' },
        { status: 400 }
      );
    }

    // Get player data
    const playerRef = db.collection('clubs').doc(clubId).collection('players').doc(playerId);
    const playerDoc = await playerRef.get();
    
    if (!playerDoc.exists) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    const player = playerDoc.data();
    const annualFee = player?.annualFee;
    
    if (!annualFee || annualFee <= 0) {
      return NextResponse.json(
        { error: 'Player does not have a valid annual fee' },
        { status: 400 }
      );
    }

    // Calculate monthly fee
    const monthlyFee = Math.round((annualFee / feeChargeMonths.length) * 100); // in cents

    // Get or create Stripe customer
    let stripeCustomerId = player?.stripeCustomerId;
    
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create(
        {
          email: player.email,
          name: `${player.name} ${player.lastName}`,
          metadata: {
            playerId,
            clubId,
          },
        },
        {
          stripeAccount: stripeConnectAccountId,
        }
      );
      
      stripeCustomerId = customer.id;
      
      // Save customer ID to player document
      await playerRef.update({
        stripeCustomerId,
      });
    }

    // Create price for the monthly fee
    const price = await stripe.prices.create(
      {
        currency: 'eur',
        unit_amount: monthlyFee,
        recurring: {
          interval: 'month',
        },
        product_data: {
          name: `Cuota Mensual - ${player.name} ${player.lastName}`,
          metadata: {
            playerId,
            clubId,
          },
        },
        metadata: {
          playerId,
          clubId,
          chargeDay: feeChargeDay.toString(),
          chargeMonths: JSON.stringify(feeChargeMonths),
        },
      },
      {
        stripeAccount: stripeConnectAccountId,
      }
    );

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create(
      {
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        subscription_data: {
          metadata: {
            playerId,
            clubId,
            chargeDay: feeChargeDay.toString(),
            chargeMonths: JSON.stringify(feeChargeMonths),
            annualFee: annualFee.toString(),
          },
          // Set billing cycle anchor to specific day of month
          billing_cycle_anchor_config: {
            day_of_month: feeChargeDay,
          },
        },
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://sportspanel.net'}/fees?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://sportspanel.net'}/fees?canceled=true`,
        metadata: {
          playerId,
          clubId,
        },
      },
      {
        stripeAccount: stripeConnectAccountId,
      }
    );

    // Save checkout session to player
    await playerRef.update({
      lastCheckoutSessionId: session.id,
      lastCheckoutSessionUrl: session.url,
      subscriptionConfigSnapshot: {
        chargeDay: feeChargeDay,
        chargeMonths: feeChargeMonths,
        annualFee,
        monthlyFee: monthlyFee / 100,
        createdAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });

  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
