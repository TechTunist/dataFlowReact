import React from 'react';
import { Link } from 'react-router-dom';
import { trackCtaClick } from '../../utils/plausibleEvents';

/**
 * Link that records CTA clicks for Plausible funnel analysis.
 */
const TrackedSignupLink = ({ to, location, plan = 'free', children, ...rest }) => {
  const resolvedPlan = to.includes('plan=premium') ? 'premium' : plan;

  return (
    <Link
      to={to}
      onClick={() => trackCtaClick(location, resolvedPlan)}
      {...rest}
    >
      {children}
    </Link>
  );
};

export default TrackedSignupLink;