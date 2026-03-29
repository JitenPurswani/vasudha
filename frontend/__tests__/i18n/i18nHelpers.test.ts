import i18n from '@/i18n';
import {
  translateCrop,
  translateState,
  translateStage,
  translateClimateRisk,
  getClimateTip,
  translateSustainabilityLevel,
} from '@/services/i18nHelpers';

// Ensure i18n is initialized for tests
beforeAll(() => {
  i18n.changeLanguage('en');
});

describe('i18nHelpers basic behavior', () => {
  it('translateCrop falls back to nicely formatted original when key missing', () => {
    const input = 'SomeUnknownCrop';
    const result = translateCrop(input);
    expect(result).toBe('Someunknowncrop');
  });

  it('translateCrop returns localized value for known crop', () => {
    const result = translateCrop('rice');
    expect(result.toLowerCase()).toContain('rice');
  });

  it('translateState formats unknown state key nicely', () => {
    const result = translateState('some_unknown_state');
    expect(result).toBe('Some Unknown State');
  });

  it('translateStage falls back to title-cased text if missing', () => {
    const result = translateStage('flowering-stage');
    expect(result).toBe('Flowering Stage');
  });

  it('translateClimateRisk returns a string and handles unknown keys gracefully', () => {
    const known = translateClimateRisk('Dry Spell Risk');
    expect(typeof known).toBe('string');

    const unknown = translateClimateRisk('TotallyUnknownRisk');
    expect(typeof unknown).toBe('string');
  });

  it('getClimateTip returns null when translation key not found', () => {
    const tip = getClimateTip('some_stage', 'some_risk');
    expect(tip).toBeNull();
  });

  it('translateSustainabilityLevel returns capitalized fallback for unknown level', () => {
    const result = translateSustainabilityLevel('mystery_level');
    expect(result).toBe('Mystery_level');
  });
});
