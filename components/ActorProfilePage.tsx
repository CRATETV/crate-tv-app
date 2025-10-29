import React from 'react';

interface ActorProfilePageProps {
    slug: string;
}

const ActorProfilePage: React.FC<ActorProfilePageProps> = ({ slug }) => {
  return <div>Actor Profile Page for: {slug}</div>;
};

export default ActorProfilePage;
