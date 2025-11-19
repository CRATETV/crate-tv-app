import { getAdminDb } from './_lib/firebaseAdmin.js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId');
  const db = getAdminDb();
  
  const linkDoc = await db.collection('roku_links').doc(deviceId!).get();
  if (linkDoc.exists) {
      return new Response(JSON.stringify({ linked: true, userId: linkDoc.data()?.userId }), { status: 200 });
  }
  return new Response(JSON.stringify({ linked: false }), { status: 200 });
}