import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin'; // Keep the .js removed
import { FieldValue } from 'firebase-admin/firestore'; // FIX: Import FieldValue directly

const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; 
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code.slice(0, 3) + '-' + code.slice(3);
};

export async function GET(request: Request) {
  try {
      const { searchParams } = new URL(request.url);
      const deviceId = searchParams.get('deviceId');
      
      if (!deviceId) {
          return new Response(JSON.stringify({ error: 'Device ID required' }), { 
              status: 400, 
              headers: { 'Content-Type': 'application/json' } 
          });
      }

      // 1. Check for DB initialization errors
      const initError = getInitializationError();
      if (initError) {
          return new Response(JSON.stringify({ error: 'Database configuration error' }), { 
              status: 500, 
              headers: { 'Content-Type': 'application/json' } 
          });
      }

      // 2. Safe DB Access
      const db = getAdminDb();
      if (!db) {
          return new Response(JSON.stringify({ error: 'Database connection unavailable' }), { 
              status: 500, 
              headers: { 'Content-Type': 'application/json' } 
          });
      }

      // 3. Check for existing valid code
      const existing = await db.collection('roku_codes').where('deviceId', '==', deviceId).limit(1).get();
      
      if (!existing.empty) {
          const doc = existing.docs[0];
          const data = doc.data();
          
          // If code is still valid (expires in future), return it
          if (data.expiresAt && data.expiresAt.toDate() > new Date()) {
              return new Response(JSON.stringify({ code: data.code }), { 
                  status: 200, 
                  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
              });
          }
          
          // Otherwise delete expired code
          await doc.ref.delete(); 
      }

      // 4. Generate and store new code
      const code = generateCode();
      await db.collection('roku_codes').add({
          code, 
          deviceId,
          createdAt: FieldValue.serverTimestamp(), // FIX: Used FieldValue directly
          expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 min expiry
      });

      return new Response(JSON.stringify({ code }), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } 
      });

  } catch (e) {
      console.error("Error generating link code:", e);
      return new Response(JSON.stringify({ error: 'Server Error' }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
      });
  }
}