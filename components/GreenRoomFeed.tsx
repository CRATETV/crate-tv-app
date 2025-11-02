import React, { useState, useEffect, useCallback } from 'react';
import { ActorPost } from '../types';
import PublicS3Uploader from './PublicS3Uploader';
import LoadingSpinner from './LoadingSpinner';

const ACTOR_PASSWORD = 'cratebio';

interface GreenRoomFeedProps {
    actorName: string;
}

const PostCard: React.FC<{ post: ActorPost; currentActor: string; onLike: (postId: string) => void; }> = ({ post, currentActor, onLike }) => {
    // Defensive check: Ensure likes is an array before using .includes()
    const isLiked = (post.likes || []).includes(currentActor);
    // Defensive check: Ensure timestamp exists and has seconds before creating a date
    const postDate = post.timestamp && typeof post.timestamp.seconds === 'number'
        ? new Date(post.timestamp.seconds * 1000).toLocaleString()
        : 'just now';

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
                <img src={post.actorPhoto} alt={post.actorName} className="w-10 h-10 rounded-full object-cover" />
                <div>
                    <p className="font-bold text-white">{post.actorName}</p>
                    <p className="text-xs text-gray-400">{postDate}</p>
                </div>
            </div>
            <p className="text-gray-300 whitespace-pre-wrap mb-3">{post.content}</p>
            {post.imageUrl && (
                <img src={post.imageUrl} alt="Post image" className="rounded-lg max-h-96 w-auto my-3" />
            )}
            <div className="border-t border-gray-700 pt-2">
                <button
                    onClick={() => onLike(post.id)}
                    className={`flex items-center gap-2 text-sm font-semibold transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    {(post.likes || []).length}
                </button>
            </div>
        </div>
    );
};


const GreenRoomFeed: React.FC<GreenRoomFeedProps> = ({ actorName }) => {
    const [posts, setPosts] = useState<ActorPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // New Post State
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostImageUrl, setNewPostImageUrl] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    const fetchPosts = useCallback(async () => {
        try {
            const response = await fetch('/api/get-actor-feed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actorName, password: ACTOR_PASSWORD })
            });
            if (!response.ok) throw new Error('Failed to fetch feed.');
            const data = await response.json();
            // FIX: Filter out any invalid posts to prevent rendering crashes.
            const validPosts = (data.posts || []).filter((p: any) => p && p.id && p.actorName && p.content && p.timestamp);
            setPosts(validPosts);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load feed.');
        } finally {
            setIsLoading(false);
        }
    }, [actorName]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const handlePostSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPostContent.trim()) return;
        setIsPosting(true);
        setError('');

        try {
            const response = await fetch('/api/actor-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actorName,
                    password: ACTOR_PASSWORD,
                    content: newPostContent,
                    imageUrl: newPostImageUrl,
                }),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to create post.');
            
            // Reset form and refresh feed
            setNewPostContent('');
            setNewPostImageUrl('');
            await fetchPosts();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create post.');
        } finally {
            setIsPosting(false);
        }
    };
    
    const handleLike = async (postId: string) => {
        // Optimistic update
        setPosts(prevPosts => prevPosts.map(p => {
            if (p.id === postId) {
                const currentLikes = p.likes || [];
                const newLikes = currentLikes.includes(actorName)
                    ? currentLikes.filter(name => name !== actorName)
                    : [...currentLikes, actorName];
                return { ...p, likes: newLikes };
            }
            return p;
        }));

        try {
            await fetch('/api/toggle-post-like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, actorName, password: ACTOR_PASSWORD }),
            });
        } catch (err) {
            // Revert on error
            console.error("Failed to sync like:", err);
            fetchPosts(); 
        }
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="space-y-8">
            {/* New Post Form */}
            <form onSubmit={handlePostSubmit} className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg">
                <h2 className="text-2xl font-bold text-white mb-4">Create a Post</h2>
                <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder={`What's on your mind, ${actorName}?`}
                    className="form-input w-full"
                    rows={4}
                    required
                />
                <div className="mt-4">
                    <PublicS3Uploader label="Attach an Image (Optional)" onUploadSuccess={setNewPostImageUrl} />
                </div>
                {newPostImageUrl && <p className="text-xs text-green-400 mt-2">Image attached and ready to post.</p>}
                <button type="submit" disabled={isPosting} className="submit-btn mt-4">
                    {isPosting ? 'Posting...' : 'Post to Green Room'}
                </button>
                 {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
            </form>

            {/* Posts Feed */}
            <div className="space-y-6">
                {posts.length > 0 ? (
                    posts.map(post => (
                        <PostCard key={post.id} post={post} currentActor={actorName} onLike={handleLike} />
                    ))
                ) : (
                    <div className="text-center text-gray-500 py-16">
                        <h3 className="text-xl font-bold">Welcome to the Green Room!</h3>
                        <p>It's quiet in here... Be the first to share something with the community.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GreenRoomFeed;