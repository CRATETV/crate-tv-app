// This endpoint is currently disabled as Square payment functionality has been removed.
// FIX: Changed to a POST handler to match the client's fetch request.
export async function POST(request: Request) {
  return new Response(JSON.stringify({ message: "Sales data is temporarily unavailable." }), {
    status: 503, // Service Unavailable
    headers: { 'Content-Type': 'application/json' },
  });
}
