import { NextResponse } from "next/server";
import { createStripePaymentLinkAction } from "@/lib/actions"; // Make sure path is correct

export async function POST(req: Request) {
  try {
    console.log("✅ /api/fees/sendlink called");

    const body = await req.json();
    const { clubId, memberId, amount } = body;

    // 🔹 Validate input
    if (!clubId || !memberId || !amount) {
      return NextResponse.json(
        { success: false, error: "clubId, memberId, and amount are required." },
        { status: 400 }
      );
    }

    // 🔹 Call Stripe helper
    const result = await createStripePaymentLinkAction({
      clubId,
      memberId,
      amount,
    });

    if (!result.success) {
      console.error("❌ Stripe link creation failed:", result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // 🔹 Return link
    return NextResponse.json({ success: true, url: result.url });
  } catch (err: any) {
    console.error("🔥 send-link route error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
