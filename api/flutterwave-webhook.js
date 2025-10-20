// API/flutterwave-webhook.js
import crypto from "crypto";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    // Flutterwave Secret Hash from environment or fallback
    const secretHash = process.env.FLW_SECRET_HASH || "Fadsbyphuray2001hash";
    const signature = req.headers["verif-hash"];

    // Validate signature
    if (!signature || signature !== secretHash) {
      console.error("Invalid or missing signature");
      return res.status(401).send("Invalid signature");
    }

    const payload = req.body;

    // Log payment event
    console.log("✅ Payment event received:", payload);

    // Example: Check if payment was successful
    if (payload?.data?.status === "successful") {
      console.log("💰 Payment successful for:", payload.data.tx_ref);
      // TODO: update your order or mark it as paid in your database
    } else {
      console.log("⚠️ Payment not successful:", payload.data?.status);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.status(500).send("Server Error");
  }
}
