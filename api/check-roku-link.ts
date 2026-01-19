
import { GET as pollAuth } from './roku/poll-auth.js';

export async function GET(request: Request) {
    return pollAuth(request);
}
