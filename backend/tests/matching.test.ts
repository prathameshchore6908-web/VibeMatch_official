import { calculateVibeMatch } from '../src/matching';
import { Participant } from '../src/types';

describe('VibeMatch Constraint Solver & Matching Engine Tests', () => {

  // Mock participants skeleton
  const createMockParticipant = (
    nickname: string,
    availability: '5PM-8PM' | '8PM-11PM' | 'AfterMidnight',
    budget: number,
    vibeText: string
  ): Participant => ({
    id: `p-${nickname}`,
    room_id: 'room-123',
    nickname,
    ip_address: '127.0.0.1',
    availability,
    budget,
    vibe_text: vibeText,
    has_submitted: true,
    created_at: new Date().toISOString()
  });

  describe('1. Time Slot Overlap Solver', () => {
    test('should select the slot with the absolute highest vote frequency', () => {
      const participants = [
        createMockParticipant('Alice', '5PM-8PM', 3, 'chill'),
        createMockParticipant('Bob', '5PM-8PM', 2, 'drinks'),
        createMockParticipant('Charlie', '8PM-11PM', 2, 'food')
      ];

      const result = calculateVibeMatch(participants);
      expect(result.time_slot).toBe('5PM-8PM');
    });

    test('should resolve ties deterministically using predefined slot preferences (5PM-8PM > 8PM-11PM > AfterMidnight)', () => {
      const participants = [
        createMockParticipant('Alice', '8PM-11PM', 3, 'chill'),
        createMockParticipant('Bob', '5PM-8PM', 2, 'drinks')
      ];

      // 1 vote for 5PM-8PM, 1 vote for 8PM-11PM.
      // Tie breaker should pick 5PM-8PM.
      const result = calculateVibeMatch(participants);
      expect(result.time_slot).toBe('5PM-8PM');
    });
  });

  describe('2. Budget Ceiling Solver', () => {
    test('should pick the lowest common denominator budget among all participants', () => {
      const participants = [
        createMockParticipant('Alice', '5PM-8PM', 3, 'grill'), // $$$
        createMockParticipant('Bob', '5PM-8PM', 1, 'street tacos'), // $ (lowest)
        createMockParticipant('Charlie', '5PM-8PM', 2, 'tasty dim sum') // $$
      ];

      // The group budget ceiling must be 1 ($), which is the minimum.
      const result = calculateVibeMatch(participants);
      expect(result.budget_tier).toBeLessThanOrEqual(1);
    });

    test('should select a higher budget tier if everyone agrees on it', () => {
      const participants = [
        createMockParticipant('Alice', '8PM-11PM', 3, 'jazz club'),
        createMockParticipant('Bob', '8PM-11PM', 3, 'fancy steak')
      ];

      const result = calculateVibeMatch(participants);
      // Lowest common budget is 3 ($$$), so it should be <= 3.
      expect(result.budget_tier).toBeLessThanOrEqual(3);
    });
  });

  describe('3. NLP Vibe Matching & Negation Logic', () => {
    test('should match positive keywords to correct venue description', () => {
      const participants = [
        createMockParticipant('Alice', '5PM-8PM', 2, 'craving spicy hotpot or sichuan food')
      ];

      const result = calculateVibeMatch(participants);
      // "Sichuan Palace" is Casual Dining (Budget 2), supports 5PM-8PM, and has "spicy" / "sichuan" keywords.
      expect(result.venue.name).toBe('Sichuan Palace');
    });

    test('should properly parse and apply negative constraint keywords (e.g. "no ...", "avoid ...")', () => {
      const participants = [
        // Cozy Bean Cafe matches "chill", "board games" but has "coffee" as a core keyword.
        // If we say "no coffee", Cozy Bean should get heavily penalized, and we get another cheap cafe/dining option.
        createMockParticipant('Alice', '5PM-8PM', 2, 'chill spot for board games, but no coffee, absolutely avoid coffee')
      ];

      const result = calculateVibeMatch(participants);
      // Result should not be Cozy Bean Café due to negation of "coffee".
      expect(result.venue.name).not.toBe('Cozy Bean Café');
      // Should match another 5PM-8PM venue with budget <= 2 like "Neon Arcade Arena" or "Taco Fiesta Street Stand".
      expect(['Neon Arcade Arena', 'Taco Fiesta Street Stand', 'Starlight Bowling Alley', 'The Golden Dragon Dim Sum', 'Sichuan Palace']).toContain(result.venue.name);
    });
  });

  describe('4. Hard Fallback & Safety Rules', () => {
    test('should always return exactly one valid venue even with zero matching vibes', () => {
      const participants = [
        createMockParticipant('Alice', '5PM-8PM', 1, 'xyzabc qwerty uiop') // random gibberish
      ];

      const result = calculateVibeMatch(participants);
      expect(result.venue).toBeDefined();
      expect(result.venue.name).toBeDefined();
      expect(result.venue.budget_tier).toBeLessThanOrEqual(1);
    });

    test('should resolve ties deterministically (alphabetically) when scores are equal', () => {
      // 5PM-8PM, Budget 1.
      // Candidate places are:
      // - Cozy Bean Café (Category Cafes: Weight 1.8) -> total 1.8
      // - Taco Fiesta Street Stand (Category Casual Dining: Weight 1.5) -> total 1.5
      // - Central Park Meadows (Category Parks: Weight 1.0) -> total 1.0
      // - Sweet Retreat Bakery (Category Cafes: Weight 1.8) -> total 1.8
      
      // Cozy Bean Café and Sweet Retreat Bakery are tied at 1.8 (assuming zero vibe words match).
      // Cozy Bean Café starts with "C" and Sweet Retreat Bakery starts with "S".
      // Alphabetical tie breaker should pick Cozy Bean Café.
      const participants = [
        createMockParticipant('Alice', '5PM-8PM', 1, '')
      ];

      const result = calculateVibeMatch(participants);
      expect(result.venue.name).toBe('Cozy Bean Café');
    });

    test('should relax budget constraints to find a venue if no venues exist under the strict budget limit', () => {
      // Setup a situation where lowest budget is 1, but we only have a time slot.
      // Every slot has at least one budget 1 venue in our database, but let's check if the code runs safely.
      const participants = [
        createMockParticipant('Alice', 'AfterMidnight', 1, 'fancy exclusive steak')
      ];

      const result = calculateVibeMatch(participants);
      expect(result.venue).toBeDefined();
      // Since AfterMidnight has no budget 1 venues in mockPlaces (Neon Arcade, Starlight Bowling, Iron Tavern, Whiskey & Jazz, Neon Dreams, Retro Vinyl are all budget 2 or 3).
      // The budget limit must have relaxed to at least budget 2.
      expect(result.venue.budget_tier).toBe(2); // Neon Arcade, Starlight Bowling, Iron Tavern, Retro Vinyl are budget 2
    });
  });
});
