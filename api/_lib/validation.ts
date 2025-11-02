import { Movie } from '../../types';

// A simple validation error class for more detailed error messages.
class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Validates a single movie object to ensure it has the minimum required fields
 * and that they are of the correct type.
 * @param movie The movie object to validate.
 * @param key The unique key of the movie, used for error reporting.
 * @throws {ValidationError} if the movie data is invalid.
 */
export const validateMovieData = (movie: Movie, key: string): void => {
    if (!movie) {
        throw new ValidationError(`Movie object with key "${key}" is null or undefined.`);
    }
    if (typeof movie.title !== 'string' || movie.title.trim() === '') {
        throw new ValidationError(`Movie "${key}" is missing a valid title.`);
    }
    if (typeof movie.poster !== 'string' || movie.poster.trim() === '') {
        throw new ValidationError(`Movie "${movie.title}" is missing a poster URL.`);
    }
    if (typeof movie.fullMovie !== 'string' || movie.fullMovie.trim() === '') {
        throw new ValidationError(`Movie "${movie.title}" is missing a fullMovie URL.`);
    }
    if (movie.likes !== undefined && typeof movie.likes !== 'number') {
        throw new ValidationError(`Movie "${movie.title}" has an invalid 'likes' count (must be a number).`);
    }
    if (movie.cast && !Array.isArray(movie.cast)) {
        throw new ValidationError(`Movie "${movie.title}" has invalid 'cast' data (must be an array).`);
    }
};
