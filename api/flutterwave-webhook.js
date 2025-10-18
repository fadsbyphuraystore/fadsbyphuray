// api/flutterwave-webhook.js
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const admin = require('firebase-admin');

let firebaseInitialized = false;
const REFERRAL_BONUS = 500;

function initFirebaseFromEnv() {
  if(firebaseInitialized) return;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if(!serviceAccountJson) {
    console.error('FIREBASE_SERVICE_ACCOUNT not set');
    throw new Error('Server misconfiguration: FIREBASE_SERVICE_ACCOUNT missing');
  }
  const serviceAccount = JSON.parse(serviceAccountJson);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
  });
  firebaseInitialized = true;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try { initFirebaseFromEnv(); } catch(err){ console.error(err); return res.status(500).json({ error: 'Server configuration error' }); }
  const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
  if(!FLW_SECRET_KEY) return res.status(500).json({ error: 'FLW secret key not configured' });

  const payload = req.body || {};
  try {
    const txId = payload.data && (payload.data.id || payload.data.transaction_id);
    const txRefIn = payload.data && payload.data.tx_ref;
    if(!txId && !txRefIn) return res.status(400).json({error:'Missing transaction identifier'});

    // verify by transaction id
    const verifyUrl = `https://api.flutterwave.com/v3/transactions/${txId}/verify`;
    const verifyResp = await fetch(verifyUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${FLW_SECRET_KEY}`, 'Content-Type': 'application/json' }});
    const verifyJson = await verifyResp.json();
    if(!verifyJson || verifyJson.status !== 'success' || !verifyJson.data) {
      console.error('Verify failed', verifyJson);
      return res.status(400).json({ error: 'Verification failed', details: verifyJson });
    }
    const data = verifyJson.data;
    if((data.status && data.status.toLowerCase()) !== 'successful') {
      if(data.tx_ref){
        const db = admin.firestore();
        const q = await db.collection('orders').where('paymentRef','==', data.tx_ref).limit(1).get();
        if(!q.empty) await db.collection('orders').doc(q.docs[0].id).update({ status:'failed', verifiedAt: admin.firestore.FieldValue.serverTimestamp(), verifyResponse: data });
      }
      return res.status(200).json({ message: 'Transaction not successful' });
    }

    const txRef = data.tx_ref;
    const transactionId = data.id || data.transaction_id;
    const amount = Number(data.amount || 0);

    const db = admin.firestore();
    const q = await db.collection('orders').where('paymentRef','==', txRef).limit(1).get();
    if(q.empty){
      await db.collection('payment_logs').add({ tx_ref: txRef, transactionId, amount, verified: true, raw: data, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return res.status(200).json({ message: 'No local order found, payment logged' });
    }

    const orderDoc = q.docs[0];
    const orderId = orderDoc.id;
    const orderData = orderDoc.data();

    if(Number(orderData.total || 0) !== amount){
      await db.collection('orders').doc(orderId).update({ status:'amount_mismatch', transactionId, paidAt: admin.firestore.FieldValue.serverTimestamp(), verifyResponse: data });
      return res.status(200).json({ message: 'Amount mismatch recorded' });
    }

    await db.collection('orders').doc(orderId).update({ status:'paid', transactionId, paidAt: admin.firestore.FieldValue.serverTimestamp(), verifyResponse: data });

    if(orderData.refUsed){
      const rifRef = await db.collection('users').where('ref','==', orderData.refUsed).limit(1).get();
      if(!rifRef.empty){
        const refUserDoc = rifRef.docs[0];
        await db.collection('users').doc(refUserDoc.id).update({ wallet: admin.firestore.FieldValue.increment(REFERRAL_BONUS) });
        await db.collection('referral_logs').add({ ref: orderData.refUsed, orderId, amountCredited: REFERRAL_BONUS, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      }
    }

    await db.collection('payment_logs').add({ tx_ref: txRef, transactionId, amount, verified: true, raw: data, orderId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return res.status(200).json({ message: 'Payment verified and order updated' });

  } catch(err){
    console.error('Webhook error', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
};
