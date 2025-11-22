import { NextResponse } from 'next/server';
import { categoriesData, moviesData, isMovieReleased } from '../constants';
import { Movie } from '../types';

export const dynamic = 'force-dynamic'; // Important for Next.js to not cache empty data

export async function GET(request: Request) {
    try {
        // 1. Build the Hero Section (Featured Movies)
        const featuredCat = categoriesData['featured'];
        let heroItems: Movie[] = [];
        
        if (featuredCat && featuredCat.movieKeys) {
            heroItems = featuredCat.movieKeys
                .map(key => moviesData[key])
                .filter(movie => movie !== undefined); // Removed isMovieReleased check for testing
        }

        // 2. Build the Rows (Categories)
        const categories = Object.entries(categoriesData).map(([key, category]) => {
            // Map the list of "keys" (strings) to actual "Movie Objects"
            const items = category.movieKeys
                .map(movieKey => moviesData[movieKey])
                .filter(movie => movie !== undefined); // Ensure movie exists

            return {
                id: key,
                name: category.title,
                items: items
            };
        }).filter(cat => cat.items.length > 0); // Only send categories that have movies

        // 3. Return the JSON
        return NextResponse.json({
            heroItems: heroItems,
            categories: categories,
            classics: [] // Add classics logic here if needed
        });

    } catch (error) {
        console.error("Roku Feed API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}