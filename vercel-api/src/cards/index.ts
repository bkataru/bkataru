/**
 * Card Renderers
 * 
 * Exports all card rendering functions for generating GitHub profile SVG cards.
 */

// Stats Card
export {
  renderStatsCard,
  type StatsCardOptions,
} from "./StatsCard.js";

// Top Languages Card
export {
  renderTopLanguages,
  type TopLangsOptions,
} from "./TopLanguagesCard.js";

// Streak Card
export {
  renderStreakCard,
  calculateStreaks,
  type StreakCardOptions,
  type StreakData,
} from "./StreakCard.js";

// Activity Graph Card
export {
  renderActivityGraph,
  type GraphCardOptions,
} from "./GraphCard.js";
