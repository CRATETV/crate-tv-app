// This file is a placeholder to prevent build errors since Square payments are disabled.
// FIX: Added a default GET handler to ensure the API route is valid.
export async function GET(request: Request) {
  return new Response(JSON.stringify({ message: "Square payments are temporarily unavailable." }), {
    status: 503, // Service Unavailable
    headers: { 'Content-Type': 'application/json' },
  });
}
