interface FactResponse {
  fact: string;
}

interface ErrorResponse {
  error: string;
}

interface ImdbResponse {
  imdbUrl: string | null;
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

export const findImdbUrl = async (name: string): Promise<string | null> => {
  try {
    const response = await fetch('/api/find-imdb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      console.error('Failed to fetch IMDb URL from server status:', response.status);
      return null;
    }

    const data: ImdbResponse = await response.json();
    return data.imdbUrl;
  } catch (error) {
    console.error('Error in findImdbUrl service:', error);
    // Don't re-throw, just return null so the UI doesn't show an error, just no link.
    return null; 
  }
};
