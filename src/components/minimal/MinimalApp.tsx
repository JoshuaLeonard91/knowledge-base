'use client';

import { useState } from 'react';
import { MinimalLanding } from './MinimalLanding';
import { MinimalWizard } from './MinimalWizard';
import { MinimalDocs } from './MinimalDocs';
import { MinimalArticle } from './MinimalArticle';
import { MinimalTicket } from './MinimalTicket';

export type MinimalView =
  | { type: 'landing' }
  | { type: 'wizard' }
  | { type: 'docs' }
  | { type: 'article'; slug: string }
  | { type: 'ticket' };

export function MinimalApp() {
  const [view, setView] = useState<MinimalView>({ type: 'landing' });
  const [wizardComplete, setWizardComplete] = useState(false);

  const navigate = (newView: MinimalView) => {
    setView(newView);
    // Scroll to top on navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    // Simple back logic
    if (view.type === 'article') {
      navigate({ type: 'docs' });
    } else if (view.type === 'ticket') {
      navigate(wizardComplete ? { type: 'wizard' } : { type: 'landing' });
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

    case 'wizard':
      return (
        <MinimalWizard
          onNavigate={navigate}
          onBack={goBack}
          onComplete={() => setWizardComplete(true)}
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
