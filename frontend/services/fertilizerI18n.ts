/**
 * Fertilizer i18n Helpers
 * Provides translation lookups for all backend fertilizer strings
 */

import i18n from '@/i18n';

// ─── Generic lookup helper ───────────────────────────────────

function t(key: string, fallback?: string): string {
  const translated = i18n.t(key);
  if (translated === key) return fallback ?? key;
  return translated;
}

// ─── Release Speed ───────────────────────────────────────────

export function translateReleaseSpeed(speed: string): string {
  if (!speed) return '';
  const key = `fert_data.release_speed.${speed.toLowerCase()}`;
  return t(key, speed);
}

// ─── Rainfall Classification ─────────────────────────────────

export function translateRainfallClassification(classification: string): string {
  if (!classification) return '';
  const key = `fert_data.classification.${classification.toLowerCase()}`;
  return t(key, classification);
}

// ─── Severity ────────────────────────────────────────────────

export function translateSeverity(severity: string): string {
  if (!severity) return '';
  const key = `fert_data.severity.${severity.toLowerCase()}`;
  return t(key, severity.charAt(0).toUpperCase() + severity.slice(1));
}

// ─── Timing Advice ───────────────────────────────────────────

export function translateTimingAdvice(classification: string): string {
  if (!classification) return '';
  const key = `fert_data.timing_advice.${classification.toLowerCase()}`;
  return t(key, '');
}

// ─── Fertilizer Names ────────────────────────────────────────

/**
 * Translates a fertilizer display_name using a normalized key lookup.
 * Falls back to the original English name if no translation found.
 */
export function translateFertilizerName(displayName: string): string {
  if (!displayName) return '';
  const normalizedKey = displayName
    .toLowerCase()
    .replace(/[()₃₄]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const key = `fert_data.names.${normalizedKey}`;
  return t(key, displayName);
}

// ─── Benefits ────────────────────────────────────────────────

/**
 * Translates a benefit string by normalizing it to a snake_case key.
 * Falls back to the original English text.
 */
export function translateBenefit(benefit: string): string {
  if (!benefit) return '';
  const normalizedKey = benefit
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  const key = `fert_data.benefits.${normalizedKey}`;
  return t(key, benefit);
}

// ─── Notes ───────────────────────────────────────────────────

/**
 * Translates a note string. Uses first few words as key.
 */
export function translateNote(note: string): string {
  if (!note) return '';
  const normalizedKey = note
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 60);
  const key = `fert_data.notes.${normalizedKey}`;
  return t(key, note);
}

// ─── Method display_name / description / when_to_use ─────────

export function translateMethodName(methodId: string): string {
  if (!methodId) return '';
  const key = `fert_data.methods.${methodId}.name`;
  return t(key, methodId);
}

export function translateMethodDescription(methodId: string): string {
  if (!methodId) return '';
  const key = `fert_data.methods.${methodId}.description`;
  return t(key, '');
}

export function translateMethodWhenToUse(methodId: string): string {
  if (!methodId) return '';
  const key = `fert_data.methods.${methodId}.when_to_use`;
  return t(key, '');
}

// ─── Tool names & descriptions ───────────────────────────────

export function translateToolName(toolId: string, fallbackName: string): string {
  if (!toolId) return fallbackName;
  const key = `fert_data.tools.${toolId}.name`;
  return t(key, fallbackName);
}

export function translateToolDescription(toolId: string, fallbackDesc: string): string {
  if (!toolId) return fallbackDesc;
  const key = `fert_data.tools.${toolId}.description`;
  return t(key, fallbackDesc);
}

// ─── Rainfall Reason ─────────────────────────────────────────

/**
 * Translates a rainfall reason string by normalizing to key.
 * Falls back to original English text.
 */
export function translateRainfallReason(reason: string): string {
  if (!reason) return '';
  const normalizedKey = reason
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 60);
  const key = `fert_data.rainfall_reasons.${normalizedKey}`;
  return t(key, reason);
}

// ─── Summary ─────────────────────────────────────────────────

import type { FertilizerResponseData } from './fertilizerApi';

/**
 * Builds a fully translated summary from the structured response data.
 * Falls back to the raw backend summary if data is unavailable.
 */
export function translateSummary(
  summary: string,
  data?: FertilizerResponseData
): string {
  if (!summary) return '';

  // Static "no deficit" case - check for new message first, then old message
  if (summary.includes('No deficit detected') || summary.includes('Soil nutrients and pH are within optimal range')) {
    return t('fert_data.summary.no_deficit', summary);
  }

  // If structured data is not available, return raw summary
  if (!data) return summary;

  // Build translated summary from structured data
  const parts: string[] = [];

  // Nutrient deficit parts
  for (const n of ['N', 'P', 'K']) {
    const sev = data.severity?.[n];
    if (sev && sev !== 'none') {
      const translatedSev = translateSeverity(sev);
      parts.push(
        t('fert_data.summary.nutrient_deficit_part',
          `${n}: ${translatedSev} (${data.deficit_kg_ha[n]} kg/ha ${t('fert_data.summary.deficit_word', 'deficit')})`
        )
          .replace('{{nutrient}}', n)
          .replace('{{severity}}', translatedSev)
          .replace('{{amount}}', String(data.deficit_kg_ha[n] ?? 0))
      );
    }
  }

  // pH part
  const ph = data.ph_assessment;
  if (ph && ph.status !== 'none' && ph.direction) {
    parts.push(
      t('fert_data.summary.ph_deficit_part', `pH: ${ph.direction} (gap: ${ph.gap})`)
        .replace('{{direction}}', ph.direction)
        .replace('{{gap}}', String(ph.gap))
    );
  }

  let result = '';
  if (parts.length > 0) {
    result = t('fert_data.summary.deficits_detected', 'Deficits detected') + ' — ' + parts.join(', ') + '. ';
  }

  // Organic count
  const organicCount = data.recommendations?.organic?.length ?? 0;
  if (organicCount > 0) {
    result += t('fert_data.summary.organic_recommended', `Recommended ${organicCount} organic fertilizer(s) as primary treatment.`)
      .replace('{{count}}', String(organicCount)) + ' ';
  }

  // Chemical count
  const chemCount = data.recommendations?.chemical_supplements?.length ?? 0;
  if (chemCount > 0) {
    result += t('fert_data.summary.chemical_added', `Added ${chemCount} chemical supplement(s) where organic is insufficient.`)
      .replace('{{count}}', String(chemCount)) + ' ';
  }

  // pH correction
  const phRecs = data.recommendations?.ph_amendments ?? [];
  if (phRecs.length > 0) {
    const phName = translateFertilizerName(phRecs[0].display_name);
    result += t('fert_data.summary.ph_correction', `pH correction: ${phName}.`)
      .replace('{{name}}', phName) + ' ';
  }

  return result.trim() || summary;
}

// ─── "from" prefix for rainfall adjustment ───────────────────

export function getFromPrefix(): string {
  return t('fert_data.from_prefix', 'from');
}
