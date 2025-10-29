import React, { useState, useEffect, lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
// FIX: The project seems to be using an older version of react-router-dom.
// The imports for `BrowserRouter`, `Routes`, `Route`, `Navigate`, and `useParams` were failing.
// Switched to `react-router-dom` v5 compatible imports and syntax (`Switch`, `Redirect`).
import { BrowserRouter, Switch, Route, Redirect, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { FestivalProvider } from './contexts/FestivalContext.tsx';
import LoadingSpinner from './components/LoadingSpinner.tsx';

// Dynamically import page components for code splitting
const App = lazy(() => import('./App.tsx'));
const AdminPage = lazy(() => import('./AdminPage.tsx'));
const Intro = lazy(() => import('./components/Intro.tsx'));
const ClassicsPage = lazy(() => import('./components/ClassicsPage.tsx'));
const SubmitPage = lazy(() => import('./components/SubmitPage.tsx'));
const MoviePage = lazy(() => import('./components/MoviePage.tsx'));
const MerchPage = lazy(() => import('./components/MerchPage.tsx'));
const ContactPage = lazy(() => import('./components/ContactPage.tsx'));
const AboutPage = lazy(() => import('./components/AboutPage.tsx'));
const LoginPage = lazy(() => import('./components/LoginPage.tsx'));
const AccountPage = lazy(() => import('./components/AccountPage.tsx'));
const FestivalPage = lazy(() => import('./components/FestivalPage.tsx'));
const FilmFestivalModule = lazy(() => import('./FilmFestivalModule.tsx'));
const DeveloperGuidePage = lazy(() => import('./components/DeveloperGuidePage.tsx'));
const AnalyticsPage = lazy(() => import('./components/AnalyticsPage.tsx'));
const LandingPage = lazy(() => import('./components/LandingPage.tsx'));
const ThankYouPage = lazy(() => import('./components/ThankYouPage.tsx'));
const TopTenPage = lazy(() => import('./components/TopTenPage.tsx'));
const ActorPortalPage = lazy(() => import('./components/ActorPortalPage.tsx'));
const ActorSignupPage = lazy(() => import('./components/ActorSignupPage.tsx'));
const ActorsDirectoryPage = lazy(() => import('./components/ActorsDirectoryPage.tsx'));
const ActorProfilePage = lazy(() => import('./components/ActorProfilePage.tsx'));
const WatchlistPage = lazy(() => import('./components/WatchlistPage.tsx'));
const FilmmakerSignupPage = lazy(() => import('./components/FilmmakerSignupPage.tsx'));
const FilmmakerPortalPage = lazy(() => import('./components/FilmmakerPortalPage.tsx'));
const PremiumPage = lazy(() => import('./components/PremiumPage.tsx'));
const ComingSoonPage = lazy(() => import('./components/ComingSoonPage.tsx'));

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Wrapper for MoviePage to extract the key from URL parameters
const MoviePageWrapper = () => {
  // FIX: Swapped Navigate with Redirect for react-router-dom v5 compatibility.
  const { movieKey } = useParams<{ movieKey: string }>();
  if (!movieKey) return <Redirect to="/" />;
  return <MoviePage movieKey={movieKey} />;
};

// Wrapper for ActorProfilePage to extract the slug from URL parameters
const ActorProfilePageWrapper = () => {
    // FIX: Swapped Navigate with Redirect for react-router-dom v5 compatibility.
    const { slug } = useParams<{ slug: string }>();
    if (!slug) return <Redirect to="/actors" />;
    return <ActorProfilePage slug={slug} />;
};


// FIX: Replaced v6 PrivateRoute component with a v5 compatible one that uses the render prop pattern.
// Component to handle routes that require authentication
const PrivateRoute = ({ component: Component, ...rest }: { component: React.ComponentType<any>, path: string, [key: string]: any }) => {
    const { user } = useAuth();
    return (
        <Route
            {...rest}
            render={props =>
                user ? (
                    <Component {...props} />
                ) : (
                    <Redirect
                        to={{
                            pathname: "/login",
                            // @ts-ignore
                            state: { from: props.location }
                        }}
                    />
                )
            }
        />
    );
};

// Main Router component
// FIX: Rewrote AppRouter to use react-router-dom v5 syntax with Switch, component prop, and PrivateRoute HOC.
const AppRouter: React.FC = () => {
    const { user } = useAuth();
    
    return (
        <Switch>
            {/* Public Routes */}
            <Route path="/login" component={LoginPage} />
            <Route path="/classics" component={ClassicsPage} />
            <Route path="/coming-soon" component={ComingSoonPage} />
            <Route path="/top-ten" component={TopTenPage} />
            <Route path="/submit" component={SubmitPage} />
            <Route path="/actor-signup" component={ActorSignupPage} />
            <Route path="/actor-portal" component={ActorPortalPage} />
            <Route path="/actors/:slug" component={ActorProfilePageWrapper} />
            <Route path="/actors" component={ActorsDirectoryPage} />
            <Route path="/filmmaker-signup" component={FilmmakerSignupPage} />
            <Route path="/filmmaker-portal" component={FilmmakerPortalPage} />
            <Route path="/thank-you" component={ThankYouPage} />
            <Route path="/merch" component={MerchPage} />
            <Route path="/admin" component={AdminPage} />
            <Route path="/analytics" component={AnalyticsPage} />
            <Route path="/contact" component={ContactPage} />
            <Route path="/about" component={AboutPage} />
            <Route path="/filmfestivalmodule" component={FilmFestivalModule} />
            <Route path="/developer-guide" component={DeveloperGuidePage} />
            <Route path="/movie/:movieKey" component={MoviePageWrapper} />

            {/* Protected Routes */}
            <PrivateRoute path="/account" component={AccountPage} />
            <PrivateRoute path="/festival" component={FestivalPage} />
            <PrivateRoute path="/watchlist" component={WatchlistPage} />

            {/* Root path depends on authentication */}
            <Route path="/" exact>
                {user ? <App /> : <LandingPage />}
            </Route>
            
            {/* Fallback route */}
            <Redirect from="*" to="/" />
        </Switch>
    );
};


// Manages the intro video display logic.
const Root: React.FC = () => {
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem('hasSeenIntro'));

  const handleIntroEnd = () => {
    try {
      localStorage.setItem('hasSeenIntro', 'true');
    } catch (e) {
      console.warn("Could not write to localStorage to save intro state.", e);
    }
    setShowIntro(false);
  };

  if (showIntro) {
    return <Intro onIntroEnd={handleIntroEnd} />;
  }
  
  // BrowserRouter provides the routing context for the entire app.
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
};

root.render(
  <React.StrictMode>
    <AuthProvider>
      <FestivalProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <Root />
        </Suspense>
      </FestivalProvider>
    </AuthProvider>
  </React.StrictMode>
);

// Register the Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}
