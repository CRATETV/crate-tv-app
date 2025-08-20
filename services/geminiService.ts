interface FactResponse {
  fact: string;
}

interface ErrorResponse {
  error: string;
}

export const generateActorFact = async (name: string, bio: string): Promise<string> => {
  try {
    const response = await fetch('/api/generate-fact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, bio }),
    });

    if (!response.ok) {
      const errorData: ErrorResponse = await response.json();
      throw new Error(errorData.error || 'Failed to fetch fun fact from the server.');
    }

    const data: FactResponse = await response.json();
    return data.fact;
  } catch (error) {
    console.error('Error in generateActorFact service:', error);
    throw error; // Re-throw the error to be caught by the component
  }
};
