// api/flutterwave-webhook.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const secretHash = process.env.FLW_SECRET_HASH || "your-secret-hash-here";
    const signature = req.headers["verif-hash"];

    if (!signature || signature !== secretHash) {
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;

    // Verify payment success
    if (event.event === "charge.completed" && event.data.status === "successful") {
      console.log("✅ Payment verified for:", event.data.customer.email);
    }

    res.status(200).send("Webhook received successfully");
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    res.status(500).send("Server Error");
  }
}
