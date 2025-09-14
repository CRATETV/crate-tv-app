// This is a Vercel Serverless Function
// It will be accessible at the path /api/get-sales-data
import { Client, Environment } from 'square';

// Initialize the Square client
const { paymentsApi } = new Client({
  environment: Environment.Production, // Use Environment.Sandbox for testing
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    // Authentication
    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Fetch payments from the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { result: { payments } } = await paymentsApi.listPayments({
        beginTime: ninetyDaysAgo.toISOString(),
        limit: 100
    });

    let totalRevenue = 0;
    let fullPassesSold = 0;
    let filmBlocksSold = 0;
    let individualFilmsSold = 0;
    const transactions = [];

    if (payments) {
        for (const payment of payments) {
            // Only process completed payments
            if (payment.status === 'COMPLETED' && payment.amountMoney) {
                const amount = Number(payment.amountMoney.amount) / 100;
                totalRevenue += amount;
                const note = payment.note || '';

                if (note.includes('Full Festival Pass')) {
                    fullPassesSold++;
                } else if (note.includes('Block:')) {
                    filmBlocksSold++;
                } else if (note.includes('Film:')) {
                    individualFilmsSold++;
                }
                
                transactions.push({
                    id: payment.id,
                    date: payment.createdAt,
                    item: note.replace('Crate TV Purchase: ', ''),
                    amount: amount
                });
            }
        }
    }

    const salesData = {
        totalRevenue,
        fullPassesSold,
        filmBlocksSold,
        individualFilmsSold,
        transactions,
    };

    return new Response(JSON.stringify(salesData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Square sales data error:', error);
    let errorMessage = 'Failed to fetch sales data.';
    if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        errorMessage = error.errors.map((e: any) => e.detail).join('; ');
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}