import { Participant, Venue, MatchingResult } from './types';
import mockPlacesData from './mockPlaces.json';

const ALL_VENUES: Venue[] = mockPlacesData as Venue[];

// Standard default fallback venue
const DEFAULT_FALLBACK_VENUE: Venue = {
  name: "Cozy Bean Café",
  category: "Cafes",
  budget_tier: 1,
  vibe_keywords: ["coffee", "tea", "chill", "board games", "conversation", "quiet", "study", "dessert", "bakery", "relaxing", "cozy"],
  time_slots: ["5PM-8PM", "8PM-11PM"],
  maps_url: "https://www.google.com/maps/search/?api=1&query=Cozy+Bean+Cafe"
};

/**
 * Calculates the highest overlapping time slot and lowest common budget.
 * Then filters venues and scores them using participant vibes (with negation parsing).
 */
export function calculateVibeMatch(participants: Participant[]): MatchingResult {
  if (!participants || participants.length === 0) {
    return {
      venue: DEFAULT_FALLBACK_VENUE,
      time_slot: '5PM-8PM',
      budget_tier: 1
    };
  }

  // 1. Calculate overlapping time slot
  const timeSlotVotes = {
    '9AM-1PM': 0,
    '1PM-5PM': 0,
    '5PM-8PM': 0,
    '8PM-11PM': 0,
    'AfterMidnight': 0
  };

  participants.forEach(p => {
    if (p.availability in timeSlotVotes) {
      timeSlotVotes[p.availability as keyof typeof timeSlotVotes]++;
    }
  });

  // Determine the slot with highest votes. Tie-breaker order: Morning > Afternoon > Evening > Night > Midnight
  let chosenTimeSlot: '9AM-1PM' | '1PM-5PM' | '5PM-8PM' | '8PM-11PM' | 'AfterMidnight' = '5PM-8PM';
  let maxVotes = -1;

  const orderOfPreference: ('9AM-1PM' | '1PM-5PM' | '5PM-8PM' | '8PM-11PM' | 'AfterMidnight')[] = [
    '9AM-1PM', '1PM-5PM', '5PM-8PM', '8PM-11PM', 'AfterMidnight'
  ];
  orderOfPreference.forEach(slot => {
    if (timeSlotVotes[slot] > maxVotes) {
      maxVotes = timeSlotVotes[slot];
      chosenTimeSlot = slot;
    }
  });

  // 2. Calculate lowest common budget ceiling
  // Budget is 1 ($) to 4 ($$$$)
  const budgets = participants.map(p => p.budget);
  const lowestCommonBudget = Math.min(...budgets);

  // 3. Filter candidate venues
  let candidateVenues = ALL_VENUES.filter(v => {
    return v.time_slots.includes(chosenTimeSlot) && v.budget_tier <= lowestCommonBudget;
  });

  // Fallback: If no venues match the budget constraint, relax the budget limit
  let relaxedBudget = lowestCommonBudget;
  while (candidateVenues.length === 0 && relaxedBudget < 4) {
    relaxedBudget++;
    candidateVenues = ALL_VENUES.filter(v => {
      return v.time_slots.includes(chosenTimeSlot) && v.budget_tier <= relaxedBudget;
    });
  }

  // Double Fallback: If still no venues, relax time slot constraint
  if (candidateVenues.length === 0) {
    candidateVenues = ALL_VENUES.filter(v => v.budget_tier <= lowestCommonBudget);
  }

  // Triple Fallback: If absolutely empty, use all venues
  if (candidateVenues.length === 0) {
    candidateVenues = ALL_VENUES;
  }

  // 4. Score candidates based on vibes
  interface ScoredVenue {
    venue: Venue;
    score: number;
  }

  let hasKeywordMatch = false;

  const scoredCandidates: ScoredVenue[] = candidateVenues.map(venue => {
    let score = 0;

    participants.forEach(p => {
      if (!p.vibe_text || p.vibe_text.trim() === '') {
        return;
      }

      // Pre-process vibe text: lowercase
      const text = p.vibe_text.toLowerCase();

      // Split into clauses by punctuation/conjunctions to scope negations
      const clauses = text.split(/[,.;!]| but | and | except /);

      clauses.forEach(clause => {
        const words = clause.trim().split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, ''));
        
        // Define negation triggers
        const negations = ['no', 'not', 'never', 'avoid', 'without', 'except', 'dont'];
        const hasNegation = words.some(w => negations.includes(w));

        // Check venue keywords and category
        const matchTargets = [...venue.vibe_keywords, venue.category.toLowerCase()];
        
        matchTargets.forEach(target => {
          const targetWords = target.toLowerCase().split(/\s+/);
          
          // Check if target is mentioned in the clause
          const targetIsMentioned = targetWords.every(tw => words.includes(tw)) || 
                                    words.some(w => target.toLowerCase().includes(w) && w.length > 3);

          if (targetIsMentioned) {
            hasKeywordMatch = true;
            if (hasNegation) {
              score -= 100; // Heavy negation penalty
            } else {
              score += 10;  // Positive vibe match
            }
          }
        });
      });
    });

    // Heuristics: Category weight to prioritize categories
    const categoryWeights = {
      'Activity Lounges': 2.0,
      'Cafes': 1.8,
      'Casual Dining': 1.5,
      'Bars': 1.2,
      'Parks': 1.0,
      'Fine Dining': 0.5
    };
    score += categoryWeights[venue.category] || 0;

    // Budget alignment bonus: prefer venues that match the budget ceiling exactly
    if (venue.budget_tier === lowestCommonBudget) {
      score += 2;
    }

    return { venue, score };
  });

  // Sort candidates by score descending. Tie breaker: alphabetical sort of venue name
  scoredCandidates.sort((a, b) => {
    if (Math.abs(a.score - b.score) < 0.0001) {
      return a.venue.name.localeCompare(b.venue.name);
    }
    return b.score - a.score;
  });

  const winner = scoredCandidates[0]?.venue || DEFAULT_FALLBACK_VENUE;

  // Always include up to 2 alternative suggestions to offer multiple location choices
  const alternatives: Venue[] = [];
  if (scoredCandidates.length > 1) {
    for (let i = 1; i < Math.min(scoredCandidates.length, 4); i++) {
      alternatives.push(scoredCandidates[i].venue);
    }
  }

  return {
    venue: winner,
    time_slot: chosenTimeSlot,
    budget_tier: winner.budget_tier,
    alternative_venues: alternatives.length > 0 ? alternatives : undefined
  };
}
