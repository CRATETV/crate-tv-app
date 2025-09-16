// This endpoint is currently disabled as Square payment functionality has been removed.
export async function GET(request: Request) {
  return new Response(JSON.stringify({ message: "Sales data is temporarily unavailable." }), {
    status: 503, // Service Unavailable
    headers: { 'Content-Type': 'application/json' },
  });
}
// Cache invalidation comment