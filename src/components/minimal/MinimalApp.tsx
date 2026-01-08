'use client';

import { useState } from 'react';
import { MinimalLanding } from './MinimalLanding';
import { MinimalDocs } from './MinimalDocs';
import { MinimalArticle } from './MinimalArticle';
import { MinimalTicket } from './MinimalTicket';

export type MinimalView =
  | { type: 'landing' }
  | { type: 'docs' }
  | { type: 'article'; slug: string }
  | { type: 'ticket' };

export function MinimalApp() {
  const [view, setView] = useState<MinimalView>({ type: 'landing' });

  const navigate = (newView: MinimalView) => {
    setView(newView);
    // Scroll to top on navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    // Simple back logic
    if (view.type === 'article') {
      navigate({ type: 'docs' });
    } else {
      navigate({ type: 'landing' });
    }
  };

  switch (view.type) {
    case 'landing':
      return (
        <MinimalLanding
          onNavigate={navigate}
        />
      );

    case 'docs':
      return (
        <MinimalDocs
          onNavigate={navigate}
          onBack={goBack}
        />
      );

    case 'article':
      return (
        <MinimalArticle
          slug={view.slug}
          onNavigate={navigate}
          onBack={goBack}
        />
      );

    case 'ticket':
      return (
        <MinimalTicket
          onBack={goBack}
        />
      );

    default:
      return <MinimalLanding onNavigate={navigate} />;
  }
}
