/**
 * Fenced real BTC risk-colour data for the public splash preview only.
 * Frozen snapshot through 10 Oct 2024, not wired to DataContext or live API.
 *
 * Regenerate: node scripts/generate-splash-preview-risk-data.mjs
 */
import previewPayload from './splashPreviewRiskData.json';

export const SPLASH_PREVIEW_END_LABEL = previewPayload.previewEndLabel;

export const splashPreviewRiskData = previewPayload.data;