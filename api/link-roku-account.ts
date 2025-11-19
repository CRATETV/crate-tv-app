import { getAdminDb } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
  const { uid, code } = await request.json();
  const db = getAdminDb();

  const codeQuery = await db.collection('roku_codes').where('code', '==', code).limit(1).get();
  if (codeQuery.empty) return new Response(JSON.stringify({ error: 'Invalid code' }), { status: 400 });

  const { deviceId } = codeQuery.docs[0].data();
  
  const batch = db.batch();
  batch.set(db.collection('roku_links').doc(deviceId), { userId: uid });
  batch.delete(codeQuery.docs[0].ref);
  await batch.commit();

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}