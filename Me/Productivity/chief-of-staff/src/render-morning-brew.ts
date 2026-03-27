/**
 * Morning Brew HTML renderer — v4.
 *
 * Takes a DayPlan with narrative groupings and produces a self-contained
 * HTML string styled per the visual identity.
 *
 * Interactive features:
 * - Checkboxes + skip buttons on ALL items (tasks AND events)
 * - Notes with fullscreen modal for mobile writing
 * - Supabase sync (falls back to localStorage)
 * - Copy Status button for end-of-day coaching prompt
 * - Now-line with auto-scroll, updates every 60s
 * - Webapp manifest + favicon for home-screen install
 */

import type { DayPlan, TaskSlot, TaskEnrichment } from "./morning-helpers.ts";

// --- Narrative grouping types ---

/** How a task relates to today's priority. */
export type NarrativeCategory = "direct" | "indirect" | "obligation";

/** A TaskSlot annotated with its narrative relationship to the priority. */
export interface NarrativeTaskSlot extends TaskSlot {
  narrativeCategory: NarrativeCategory;
}

/** A calendar event for timeline rendering. */
export interface TimelineEvent {
  summary: string;
  start: string;
  end: string;
  location?: string;
  /** Google Meet / Hangout link for video calls. */
  hangoutLink?: string;
  /** Link to the Google Calendar event page. */
  htmlLink?: string;
  /** Google Calendar color ID ('1'-'11'). */
  colorId?: string;
}

/** A task deferred to a future date, with priority for sorting. */
export interface DeferredTask {
  label: string;
  /** Planning priority: 4 = urgent (P1), 3 = high (P2), 2 = medium (P3), 1 = normal (P4). */
  priority: number;
  description?: string;
  suggestedDate?: string;
  reason?: string;
  /** Supabase task UUID — required for write-back (done, defer, reprioritize). */
  taskId?: string;
}

/** A single item in an exercise block (strength exercise, family activity, or yoga pose). */
export interface ExerciseItem {
  name: string;
  detail: string;
  subtext?: string;
}

/** An exercise block for the Morning Brew (strength+meditation or family fun). */
export interface ExerciseBlock {
  type: "strength-meditation" | "family";
  title: string;
  /** Time slot assigned by the /morning planner (e.g., "10:00-10:30") or fixed ("18:00-18:30"). */
  timeSlot: string;
  duration: string;
  subtitle?: string;
  /** Strength exercises (for strength-meditation blocks). */
  strengthItems?: ExerciseItem[];
  /** Family activities (for family blocks). */
  familyItems?: ExerciseItem[];
  /** Yoga poses bridging strength → meditation. */
  yogaTransition?: {
    poses: Array<{ name: string; instruction: string }>;
  };
  /** Guided meditation session (15 min). */
  meditation?: {
    type: string;
    guidance: string;
  };
  /** Family yoga cool-down (for family blocks). */
  coolDown?: {
    title: string;
    items: Array<{ name: string; instruction: string }>;
    breathingNote: string;
  };
  note?: string;
}

/** Extended DayPlan with narrative groupings for Morning Brew rendering. */
export interface MorningBrewPlan extends DayPlan {
  greeting?: string;
  priorityReason: string;
  scheduledTasks: NarrativeTaskSlot[];
  calendarEvents: TimelineEvent[];
  /** Tasks deferred to a future date, rendered as interactive cards sorted by priority. */
  deferredTasks?: DeferredTask[];
  /** Daily exercise blocks (strength+meditation and/or family fun). */
  exerciseBlocks?: ExerciseBlock[];
}

// --- Google Calendar color map ---

/** Maps Google Calendar colorId to CSS hex colors. */
const GCAL_COLORS: Record<string, string> = {
  "1": "#7986CB",  // Lavender
  "2": "#33B679",  // Sage
  "3": "#8E24AA",  // Grape
  "4": "#E67C73",  // Flamingo
  "5": "#F6BF26",  // Banana
  "6": "#F4511E",  // Tangerine
  "7": "#039BE5",  // Peacock
  "8": "#616161",  // Graphite
  "9": "#3F51B5",  // Blueberry
  "10": "#0B8043", // Basil
  "11": "#D50000", // Tomato
};

// --- Helpers ---

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return d.toLocaleDateString("en-US", options);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const PENCIL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>';

/** Internal timeline item with all metadata for rendering. */
interface TimelineItem {
  type: "event" | "task";
  start: string;
  end: string;
  label: string;
  reason?: string;
  category?: NarrativeCategory;
  hangoutLink?: string;
  htmlLink?: string;
  colorId?: string;
  taskId?: string;
  /** Task enrichment context (shown in details modal). */
  enrichment?: TaskEnrichment;
}

/** Build a sorted timeline of events and tasks for chronological view. */
function buildTimeline(plan: MorningBrewPlan): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const event of plan.calendarEvents) {
    items.push({
      type: "event",
      start: event.start,
      end: event.end,
      label: event.summary,
      hangoutLink: event.hangoutLink,
      htmlLink: event.htmlLink,
      colorId: event.colorId,
    });
  }

  for (const slot of plan.scheduledTasks) {
    items.push({
      type: "task",
      start: slot.timeSlot.start,
      end: slot.timeSlot.end,
      label: slot.task.content,
      reason: slot.reason,
      category: slot.narrativeCategory,
      taskId: slot.task.id,
      enrichment: slot.enrichment,
    });
  }

  items.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return items;
}

// --- Enrichment rendering ---

/** Formats a TaskEnrichment as HTML for the details modal. */
function formatEnrichmentHtml(enrichment: TaskEnrichment): string {
  let html = escapeHtml(enrichment.summary);
  if (enrichment.keyPoints.length > 0) {
    html += "<ul>";
    for (const point of enrichment.keyPoints) {
      html += `<li>${escapeHtml(point)}</li>`;
    }
    html += "</ul>";
  }
  if (enrichment.approach) {
    html += `<p><strong>Approach:</strong> ${escapeHtml(enrichment.approach)}</p>`;
  }
  if (enrichment.priorWork) {
    html += `<p><strong>Prior work:</strong> ${escapeHtml(enrichment.priorWork)}</p>`;
  }
  return html;
}

// --- Render functions ---

/**
 * Renders timeline items with interactive controls.
 *
 * Every task AND calendar event gets:
 * - data-item-index attribute (sequential, used for Supabase sync)
 * - data-start / data-end attributes
 * - Checkbox (done = green) + skip button (red)
 * - Note toggle + note area with fullscreen expand
 *
 * Buffers and protected blocks do NOT get controls.
 */
function renderTimeline(plan: MorningBrewPlan): string {
  const items = buildTimeline(plan);

  if (items.length === 0) {
    return '<p class="empty-state">No scheduled items today.</p>';
  }

  // Compute min-height per card proportional to duration (1px per minute, min 48px, max 200px)
  function durationMinHeight(start: string, end: string): string {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.max(0, ms / 60000);
    const px = Math.min(200, Math.max(48, mins * 1));
    return `min-height: ${px}px;`;
  }

  let itemIndex = 0;
  const rows = items
    .map((item) => {
      const timeStr = `${formatTime(item.start)}&ndash;${formatTime(item.end)}`;
      const startAttr = ` data-start="${escapeHtml(item.start)}"`;
      const endAttr = ` data-end="${escapeHtml(item.end)}"`;
      const idx = itemIndex++;
      const heightStyle = durationMinHeight(item.start, item.end);

      if (item.type === "event") {
        const colorHex = item.colorId ? GCAL_COLORS[item.colorId] : "#039BE5";
        const bgTint = hexToRgba(colorHex, 0.06);
        const cardStyle = ` style="border-left: 4px solid ${colorHex}; background: ${bgTint}; ${heightStyle}"`;

        const labelHtml = item.htmlLink
          ? `<a href="${escapeHtml(item.htmlLink)}" target="_blank" rel="noopener" class="event-link">${escapeHtml(item.label)}</a>`
          : escapeHtml(item.label);

        const meetHtml = item.hangoutLink
          ? `<a href="${escapeHtml(item.hangoutLink)}" target="_blank" rel="noopener" class="meet-link">Join</a>`
          : "";

        return `
        <div class="timeline-item timeline-event"${cardStyle}${startAttr}${endAttr} data-item-index="${idx}">
          <div class="timeline-time">${timeStr}</div>
          <div class="timeline-content"><div class="timeline-label">${labelHtml}${meetHtml}</div></div>
          <div class="timeline-actions"><input type="checkbox" class="item-check" data-index="${idx}" aria-label="Done"><button class="item-skip" data-index="${idx}" aria-label="Skip">&times;</button></div>
          <div class="timeline-card-footer"><button class="note-toggle" data-index="${idx}" aria-label="Add note">${PENCIL_SVG}</button></div>
          <div class="item-note-area" style="display:none" data-note-index="${idx}"><div class="note-row"><textarea class="item-note" data-index="${idx}" placeholder="Add a note..."></textarea><button class="note-expand" data-index="${idx}" aria-label="Fullscreen">&#x26F6;</button></div></div>
        </div>`;
      }

      // Task
      const categoryAttr = item.category ? ` data-category="${item.category}"` : "";

      const hasDetails = !!(item.enrichment || item.reason);
      const detailsBtn = hasDetails
        ? `<button class="details-toggle" data-details-index="${idx}">details</button>`
        : "";

      let enrichmentContent = "";
      if (item.reason) {
        enrichmentContent += `<div class="timeline-reason">${escapeHtml(item.reason)}</div>`;
      }
      if (item.enrichment) {
        enrichmentContent += formatEnrichmentHtml(item.enrichment);
      }
      const enrichmentHtml = hasDetails
        ? `<div class="timeline-enrichment" data-enrichment-index="${idx}">${enrichmentContent}</div>`
        : "";

      const taskIdAttr = item.taskId ? ` data-task-id="${escapeHtml(item.taskId)}"` : "";

      return `
        <div class="timeline-item timeline-task"${categoryAttr}${startAttr}${endAttr}${taskIdAttr} style="${heightStyle}" data-item-index="${idx}">
          <div class="timeline-time">${timeStr}</div>
          <div class="timeline-content"><div class="timeline-label">${escapeHtml(item.label)}</div></div>
          <div class="timeline-actions"><input type="checkbox" class="item-check" data-index="${idx}" aria-label="Done"><button class="item-skip" data-index="${idx}" aria-label="Skip">&times;</button></div>
          <div class="timeline-card-footer">${detailsBtn}<button class="note-toggle" data-index="${idx}" aria-label="Add note">${PENCIL_SVG}</button></div>
          ${enrichmentHtml}
          <div class="item-note-area" style="display:none" data-note-index="${idx}"><div class="note-row"><textarea class="item-note" data-index="${idx}" placeholder="Add a note..."></textarea><button class="note-expand" data-index="${idx}" aria-label="Fullscreen">&#x26F6;</button></div></div>
        </div>`;
    })
    .join("");

  return rows;
}


// --- Deferred task helpers ---

const DEFERRED_INDEX_OFFSET = 1000;

function deferredPriorityLabel(p: number): string {
  switch (p) {
    case 4: return "P1";
    case 3: return "P2";
    case 2: return "P3";
    default: return "P4";
  }
}

function deferredPriorityColor(p: number): string {
  switch (p) {
    case 4: return "#D93025";
    case 3: return "#D97757";
    case 2: return "#F6BF26";
    default: return "#9B9B9B";
  }
}

/**
 * Renders the deferred tasks section with interactive cards sorted by priority.
 * Each card is expandable, with checkbox, skip, note, and fullscreen support.
 * Uses item indexes starting at DEFERRED_INDEX_OFFSET (1000) for Supabase sync.
 */
function renderDeferredSection(tasks: DeferredTask[]): string {
  if (tasks.length === 0) return "";

  // Sort by priority descending (4=P1 first, 1=P4 last)
  const sorted = [...tasks].sort((a, b) => b.priority - a.priority);

  const items = sorted
    .map((task, i) => {
      const idx = DEFERRED_INDEX_OFFSET + i;
      const badge = deferredPriorityLabel(task.priority);
      const color = deferredPriorityColor(task.priority);
      const dateStr = task.suggestedDate
        ? `<span class="deferred-date">${escapeHtml(task.suggestedDate)}</span>`
        : "";
      const descHtml = task.description
        ? `<div class="deferred-description">${escapeHtml(task.description)}</div>`
        : "";
      const reasonHtml = task.reason
        ? `<div class="deferred-reason">${escapeHtml(task.reason)}</div>`
        : "";

      const taskIdAttr = task.taskId ? ` data-task-id="${escapeHtml(task.taskId)}"` : "";
      const sbPriority = Math.max(0, 4 - task.priority); // planning→supabase: 4→0, 3→1, 2→2, 1→3

      return `
      <div class="deferred-card" data-item-index="${idx}" data-deferred="true"${taskIdAttr} data-sb-priority="${sbPriority}">
        <div class="deferred-header" data-deferred-toggle="${idx}">
          <div class="deferred-actions">
            <input type="checkbox" class="item-check" data-index="${idx}" aria-label="Done">
            <button class="item-skip" data-index="${idx}" aria-label="Skip">&times;</button>
          </div>
          <span class="deferred-badge" data-index="${idx}" style="background:${color}">${badge}</span>
          <div class="deferred-label">${escapeHtml(task.label)}</div>
          ${dateStr}
          <svg class="deferred-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="deferred-detail" data-deferred-detail="${idx}" style="display:none">
          ${descHtml}${reasonHtml}
          <div class="item-note-area" data-note-index="${idx}">
            <div class="note-row">
              <textarea class="item-note" data-index="${idx}" placeholder="Add a note..."></textarea>
              <button class="note-expand" data-index="${idx}" aria-label="Fullscreen">&#x26F6;</button>
            </div>
          </div>
        </div>
      </div>`;
    })
    .join("");

  return `
    <div class="deferred-section" data-testid="deferred-section">
      <h2>Deferred</h2>
      ${items}
    </div>`;
}

// --- Main render function ---

/**
 * Renders a Morning Brew HTML page from a MorningBrewPlan.
 *
 * Returns a self-contained HTML string with inline CSS and inline JS for:
 * - Supabase sync (morning_brew_status table, falls back to localStorage)
 * - Three-state items: done (green), skip (red), pending
 * - Fullscreen note modal for comfortable mobile writing
 * - Copy Status button (generates end-of-day coaching prompt)
 * - Now-line with auto-scroll, updates every 60s
 * - Webapp manifest + favicon for home-screen install
 */
export function renderMorningBrew(plan: MorningBrewPlan): string {
  const greeting = plan.greeting ?? "Good morning";
  const dateFormatted = formatDate(plan.date);
  const priorityLabel = escapeHtml(plan.priority);
  const timelineHtml = renderTimeline(plan);
  const dateKey = escapeHtml(plan.date);
  const deferredHtml = plan.deferredTasks && plan.deferredTasks.length > 0
    ? renderDeferredSection(plan.deferredTasks)
    : "";
  const MIC_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="Morning Brew">
  <meta name="theme-color" content="#D97757">
  <title>Morning Brew &mdash; ${escapeHtml(plan.date)}</title>
  <link rel="apple-touch-icon" href="/favicon-192.png">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/png" href="/favicon-192.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 17px; line-height: 1.7; color: #1A1A1A;
      background-color: #FAF9F6; padding: 48px 24px;
    }
    .container { max-width: 720px; margin: 0 auto; }
    h1, h2, h3 { font-family: 'Source Serif 4', Georgia, serif; line-height: 1.3; }
    h1 { font-size: 36px; font-weight: 700; }
    h2 { font-size: 24px; font-weight: 600; margin-bottom: 16px; }
    .header { margin-bottom: 48px; }
    .header-date { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #6B6B6B; margin-bottom: 8px; }
    .header-greeting { font-size: 36px; font-weight: 700; }

    /* Priority Card */
    .priority-card { background: #FFF; border: 1px solid #E5E4E0; border-radius: 12px; padding: 24px; margin-bottom: 48px; border-left: 4px solid #D97757; }
    .priority-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #D97757; font-weight: 600; margin-bottom: 8px; }
    .priority-label a { color: #D97757; text-decoration: none; }
    .priority-label a:hover { text-decoration: underline; }
    .priority-statement { font-family: 'Source Serif 4', Georgia, serif; font-size: 24px; font-weight: 600; margin-bottom: 8px; }
    .priority-reason { font-size: 15px; color: #6B6B6B; line-height: 1.6; }

    /* Sync indicator */
    .sync-status { font-size: 11px; color: #9B9B9B; text-align: right; margin-bottom: 8px; }
    .sync-status.syncing { color: #D97757; }
    .sync-status.synced { color: #33B679; }

    /* Timeline */
    .day-timeline { margin-bottom: 48px; position: relative; }
    .day-timeline > h2 { margin-bottom: 24px; }
    .timeline-item { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; padding: 12px 16px; border-radius: 8px; margin-bottom: 8px; transition: background-color 150ms, opacity 150ms; position: relative; }
    .timeline-item:hover { background-color: #F0EFEB; }
    .timeline-event { background: #FFF; border: 1px solid #E5E4E0; border-radius: 8px; }
    .timeline-event .timeline-label { font-weight: 500; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .event-link { color: #1A1A1A; text-decoration: none; }
    .event-link:hover { color: #D97757; text-decoration: underline; }
    .meet-link {
      display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500;
      color: #FFF; background: #039BE5; padding: 2px 10px; border-radius: 4px; text-decoration: none; letter-spacing: 0.02em;
    }
    .meet-link:hover { background: #0288D1; }
    .timeline-task { background: #FFF; border: 1px solid #E5E4E0; border-radius: 8px; }
    .timeline-task[data-category="direct"] { border-left: 4px solid #D97757; background: rgba(217, 119, 87, 0.06); }
    .timeline-task[data-category="indirect"] { border-left: 4px solid #B8C4B8; background: rgba(184, 196, 184, 0.08); }
    .timeline-task[data-category="obligation"] { border-left: 4px solid #C5C1D6; background: rgba(197, 193, 214, 0.08); }
    .timeline-task[data-category="direct"]:hover { background: rgba(217, 119, 87, 0.10); }
    .timeline-task[data-category="indirect"]:hover { background: rgba(184, 196, 184, 0.14); }
    .timeline-task[data-category="obligation"]:hover { background: rgba(197, 193, 214, 0.14); }

    /* Actions: checkbox + skip (below time in grid row 2) */
    .timeline-actions { display: flex; gap: 4px; align-items: center; padding-top: 0; flex-shrink: 0; }
    .item-check {
      appearance: none; -webkit-appearance: none; width: 18px; height: 18px;
      border: 2px solid #D1D0CC; border-radius: 4px; cursor: pointer; position: relative; transition: all 150ms; flex-shrink: 0;
    }
    .item-check:hover { border-color: #33B679; }
    .item-check:checked { background-color: #33B679; border-color: #33B679; }
    .item-check:checked::after { content: ''; position: absolute; left: 4px; top: 1px; width: 6px; height: 10px; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg); }
    .item-skip {
      appearance: none; -webkit-appearance: none; width: 18px; height: 18px;
      border: 2px solid #D1D0CC; border-radius: 4px; background: transparent; cursor: pointer;
      font-size: 13px; font-weight: 700; line-height: 14px; color: #D1D0CC;
      display: flex; align-items: center; justify-content: center; padding: 0; transition: all 150ms; flex-shrink: 0;
    }
    .item-skip:hover { border-color: #E53935; color: #E53935; }
    .item-skip.is-active { background: #E53935; border-color: #E53935; color: white; }
    .timeline-item.is-done { opacity: 0.55; background: #F0FAF0 !important; }
    .timeline-item.is-done .timeline-label { text-decoration: line-through; color: #33B679; }
    .timeline-item.is-skipped { opacity: 0.45; background: #FFF5F5 !important; }
    .timeline-item.is-skipped .timeline-label { text-decoration: line-through; color: #9B9B9B; }

    /* Note toggle & area */
    .note-toggle {
      appearance: none; -webkit-appearance: none; background: none; border: 1px solid #E5E4E0; border-radius: 6px;
      cursor: pointer; color: #9B9B9B; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; padding: 0; flex-shrink: 0; transition: all 150ms;
    }
    .note-toggle svg { width: 14px; height: 14px; }
    .note-toggle:hover { border-color: #D97757; color: #D97757; }
    .note-toggle.has-note { background: #FFF8F0; border-color: #D97757; color: #D97757; }
    .timeline-card-footer { display: flex; gap: 8px; align-items: center; padding-top: 2px; }
    .item-note-area { grid-column: 1 / -1; padding: 4px 16px 8px 16px; }
    @media (min-width: 600px) { .item-note-area { padding-left: calc(110px + 16px + 44px + 16px); } }
    .note-row { display: flex; gap: 6px; align-items: stretch; }
    .item-note {
      flex: 1; min-height: 80px; border: 1px solid #E5E4E0; border-radius: 6px; padding: 8px 10px;
      font-family: 'Inter', sans-serif; font-size: 15px; resize: vertical; background: #FFF; color: #1A1A1A; line-height: 1.5;
    }
    .item-note:focus { outline: none; border-color: #D97757; }
    .item-note::placeholder { color: #C5C1C1; }
    .note-expand {
      appearance: none; -webkit-appearance: none; background: none; border: 1px solid #E5E4E0; border-radius: 6px;
      cursor: pointer; font-size: 16px; color: #9B9B9B; padding: 0 8px; display: flex; align-items: center; transition: all 150ms;
    }
    .note-expand:hover { border-color: #D97757; color: #D97757; }

    /* Shared stt-modal components (used by note, reflection, and recap modals) */
    .stt-modal-close {
      appearance: none; -webkit-appearance: none; background: #D97757; color: white; border: none; border-radius: 8px;
      padding: 8px 20px; font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer;
    }
    .stt-modal-close:hover { background: #C5643F; }
    .stt-modal-body { flex: 1; display: flex; flex-direction: column; padding: 20px; overflow: auto; }
    .stt-modal-stt-notice { font-size: 13px; color: #9B9B9B; font-style: italic; margin-bottom: 8px; display: none; }
    .stt-modal-textarea {
      flex: 1; border: none; resize: none; font-family: 'Inter', sans-serif; font-size: 17px; line-height: 1.7;
      outline: none; background: transparent; color: #1A1A1A;
    }
    .stt-modal-interim { font-size: 14px; color: #9B9B9B; font-style: italic; min-height: 20px; margin-top: 8px; }
    .stt-modal-footer { display: flex; justify-content: center; align-items: center; padding: 12px 20px; border-top: 1px solid #E5E4E0; gap: 16px; }
    .stt-modal-mic {
      width: 48px; height: 48px; border-radius: 50%; border: 2px solid #D1D0CC; background: white;
      display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 200ms;
    }
    .stt-modal-mic:hover { border-color: #D97757; }
    .stt-modal-mic.listening { border-color: #E53935; animation: mic-pulse 1.5s ease-in-out infinite; }
    .stt-modal-mic svg { width: 22px; height: 22px; }
    .stt-modal-mic-lg { width: 64px; height: 64px; }
    .stt-modal-mic-lg svg { width: 28px; height: 28px; }
    .note-modal-mic-area { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px 20px 12px; border-bottom: 1px solid #E5E4E0; }

    /* Fullscreen note modal */
    .note-modal { position: fixed; inset: 0; background: #FAF9F6; z-index: 1000; display: none; flex-direction: column; }
    .note-modal.open { display: flex; }
    .note-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #E5E4E0; }
    .note-modal-title { font-family: 'Source Serif 4', Georgia, serif; font-size: 18px; font-weight: 600; flex: 1; margin-right: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Protected & buffer */
    .timeline-protected { background: #F5F3EE; border: 1px dashed #D1D0CC; border-radius: 8px; }
    .timeline-protected .timeline-label { color: #9B9B9B; font-style: italic; }
    .timeline-buffer { background: transparent; border: none; }
    .timeline-buffer .timeline-label { color: #C5C1C1; font-style: italic; font-size: 14px; }
    .timeline-time { font-size: 13px; font-weight: 500; color: #6B6B6B; min-width: 80px; padding-top: 2px; }
    .timeline-content { min-width: 0; }
    .timeline-label { font-size: 15px; color: #1A1A1A; }
    .timeline-reason { font-size: 13px; color: #9B9B9B; margin-top: 4px; font-style: italic; }
    .details-modal-content .timeline-reason { font-size: 15px; color: #6B6B6B; margin-bottom: 12px; font-style: italic; }
    .timeline-enrichment { display: none; }
    .details-toggle {
      appearance: none; -webkit-appearance: none; background: none; border: 1px solid #E5E4E0; border-radius: 4px;
      cursor: pointer; font-size: 11px; color: #9B9B9B; padding: 2px 8px; transition: all 150ms; margin-top: 6px; align-self: flex-start;
    }
    .details-toggle:hover { border-color: #D97757; color: #D97757; }
    .details-modal { position: fixed; inset: 0; background: #FAF9F6; z-index: 1001; display: none; flex-direction: column; }
    .details-modal.open { display: flex; }
    .details-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #E5E4E0; }
    .details-modal-title { font-family: 'Source Serif 4', Georgia, serif; font-size: 18px; font-weight: 600; flex: 1; margin-right: 12px; }
    .details-modal-close {
      appearance: none; -webkit-appearance: none; background: #D97757; color: white; border: none; border-radius: 8px;
      padding: 8px 20px; font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer;
    }
    .details-modal-close:hover { background: #C5643F; }
    .details-modal-content { flex: 1; padding: 20px; overflow-y: auto; font-size: 15px; line-height: 1.7; color: #6B6B6B; }
    .details-modal-content ul { margin: 8px 0 0 20px; padding: 0; }
    .details-modal-content li { margin-bottom: 6px; line-height: 1.5; }
    .details-modal-footer {
      padding: 16px 20px; border-top: 1px solid #E5E4E0;
      display: flex; justify-content: center;
    }
    .details-reflect-btn {
      appearance: none; -webkit-appearance: none; display: flex; align-items: center; gap: 8px;
      background: #D97757; color: #FFF; border: none; border-radius: 8px;
      padding: 12px 24px; font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 600;
      cursor: pointer; transition: background 150ms;
    }
    .details-reflect-btn:hover { background: #C5643F; }
    .details-reflect-btn svg { width: 18px; height: 18px; stroke: #FFF; }

    /* Now Line */
    .now-line { position: relative; display: flex; align-items: center; margin: 4px 0; z-index: 10; }
    .now-line::before { content: ''; display: block; width: 10px; height: 10px; background: #D50000; border-radius: 50%; flex-shrink: 0; }
    .now-line::after { content: ''; display: block; flex: 1; height: 2px; background: #D50000; }
    .now-time { position: absolute; right: 0; top: -8px; font-size: 11px; font-weight: 600; color: #D50000; background: #FAF9F6; padding: 0 4px; }

    /* Copy Status */
    .status-section { margin-bottom: 24px; }
    .copy-buttons { display: flex; gap: 12px; flex-wrap: wrap; }
    .copy-btn {
      flex: 1; min-width: 0; padding: 14px 12px; border: none; border-radius: 8px;
      font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 150ms;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
    }
    .copy-btn-chat { background: #D97757; color: #FFF; }
    .copy-btn-chat:hover { background: #C5643F; }
    .copy-btn-tomorrow { background: #1A1A1A; color: #FFF; }
    .copy-btn-tomorrow:hover { background: #333; }
    .copy-btn.copied { background: #33B679; }
    .copy-btn-sub { font-size: 11px; font-weight: 400; opacity: 0.8; }
    .footer { text-align: center; font-size: 12px; color: #9B9B9B; padding-top: 24px; border-top: 1px solid #E5E4E0; }

    /* Bottom tab bar */
    .bottom-tabs {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 900;
      background: #FFF; border-top: 1px solid #E5E4E0;
      display: flex; justify-content: space-around; align-items: stretch;
      padding: 0 0 env(safe-area-inset-bottom, 0px) 0;
      box-shadow: 0 -1px 6px rgba(0,0,0,0.06);
    }
    .bottom-tab {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 3px; padding: 14px 4px 12px; border: none; background: none;
      font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 500; color: #9B9B9B;
      cursor: pointer; -webkit-tap-highlight-color: transparent; transition: color 150ms;
    }
    .bottom-tab:hover, .bottom-tab:active { color: #D97757; }
    .bottom-tab svg { width: 22px; height: 22px; }
    body { padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px)); }

    /* Refresh button */
    .refresh-btn {
      position: fixed; top: 16px; right: 16px; z-index: 900;
      width: 36px; height: 36px; border-radius: 50%;
      background: #FFF; border: 1px solid #E5E4E0; box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 200ms; -webkit-tap-highlight-color: transparent;
    }
    .refresh-btn:hover { border-color: #D97757; }
    .refresh-btn:active { background: #F0EFEB; }
    .refresh-btn.spinning svg { animation: spin 0.6s ease; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* Editable priority */
    .priority-statement[contenteditable] { outline: none; cursor: text; border-bottom: 1px dashed transparent; transition: border-color 200ms; }
    .priority-statement[contenteditable]:hover { border-color: #E5E4E0; }
    .priority-statement[contenteditable]:focus { border-color: #D97757; }
    .priority-reason[contenteditable] { outline: none; cursor: text; border-bottom: 1px dashed transparent; transition: border-color 200ms; }
    .priority-reason[contenteditable]:hover { border-color: #E5E4E0; }
    .priority-reason[contenteditable]:focus { border-color: #D97757; }
    .priority-edit-hint { font-size: 10px; color: #C5C1C1; margin-top: 8px; transition: opacity 200ms; }
    .priority-card:hover .priority-edit-hint { opacity: 1; }
    .priority-saved { display: inline-block; font-size: 10px; color: #33B679; margin-left: 8px; opacity: 0; transition: opacity 300ms; }
    .priority-saved.show { opacity: 1; }

    /* Deferred section */
    .deferred-section { margin-bottom: 48px; }
    .deferred-section > h2 { font-size: 20px; color: #6B6B6B; margin-bottom: 16px; }
    .deferred-card { background: #FFF; border: 1px solid #E5E4E0; border-radius: 8px; margin-bottom: 8px; overflow: hidden; transition: opacity 150ms, background-color 150ms; }
    .deferred-card:hover { background-color: #FAFAF8; }
    .deferred-card.is-done { opacity: 0.55; background: #F0FAF0; }
    .deferred-card.is-done .deferred-label { text-decoration: line-through; color: #33B679; }
    .deferred-card.is-skipped { opacity: 0.45; background: #FFF5F5; }
    .deferred-card.is-skipped .deferred-label { text-decoration: line-through; color: #9B9B9B; }
    .deferred-header { display: flex; gap: 10px; align-items: center; padding: 12px 16px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
    .deferred-actions { display: flex; gap: 4px; align-items: center; flex-shrink: 0; }
    .deferred-badge { display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #FFF; padding: 2px 6px; border-radius: 3px; flex-shrink: 0; letter-spacing: 0.05em; }
    .deferred-label { flex: 1; font-size: 15px; color: #1A1A1A; min-width: 0; }
    .deferred-date { font-size: 12px; color: #C5C1C1; flex-shrink: 0; }
    .deferred-chevron { color: #C5C1C1; transition: transform 200ms; flex-shrink: 0; }
    .deferred-card.is-expanded .deferred-chevron { transform: rotate(180deg); }
    .deferred-detail { padding: 0 16px 16px 16px; border-top: 1px solid #F0EFEB; }
    .deferred-description { font-size: 14px; color: #6B6B6B; line-height: 1.6; margin-bottom: 12px; padding-top: 12px; }
    .deferred-reason { font-size: 13px; color: #9B9B9B; font-style: italic; margin-bottom: 12px; }
    .deferred-card .item-note-area { padding: 0; }
    .deferred-card .item-note { min-height: 60px; }

    /* Reflections */
    .reflections-section { margin-bottom: 48px; }
    .reflections-section h2 { font-size: 20px; color: #6B6B6B; margin-bottom: 16px; }
    .reflection-card {
      appearance: none; -webkit-appearance: none;
      display: flex; gap: 12px; align-items: center;
      width: 100%; padding: 14px 16px; margin-bottom: 8px;
      background: #FFF; border: 1px solid #E5E4E0; border-radius: 8px;
      cursor: pointer; text-align: left; transition: all 150ms;
      font-family: 'Inter', sans-serif; -webkit-tap-highlight-color: transparent;
    }
    .reflection-card:hover { background: #FAFAF8; border-color: #D1D0CC; }
    .reflection-card:active { background: #F0EFEB; }
    .reflection-card.has-entry { border-left: 3px solid #33B679; }
    .reflection-card.has-entry .reflection-check { opacity: 1; }
    .reflection-num {
      width: 24px; height: 24px; border-radius: 50%;
      background: #F0EFEB; color: #6B6B6B;
      font-size: 12px; font-weight: 600;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .reflection-card.has-entry .reflection-num { background: #33B679; color: #FFF; }
    .reflection-text { flex: 1; min-width: 0; }
    .reflection-label { font-size: 15px; font-weight: 500; color: #1A1A1A; }
    .reflection-prompt { font-size: 13px; color: #9B9B9B; margin-top: 2px; }
    .reflection-check { width: 20px; height: 20px; color: #33B679; opacity: 0; transition: opacity 200ms; flex-shrink: 0; }

    /* Reflection modal */
    .reflection-modal { position: fixed; inset: 0; background: #FAF9F6; z-index: 1002; display: none; flex-direction: column; }
    .reflection-modal.open { display: flex; }
    .reflection-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #E5E4E0; }
    .reflection-modal-title { font-family: 'Source Serif 4', Georgia, serif; font-size: 20px; font-weight: 600; flex: 1; margin-right: 12px; }
    .reflection-modal-prompt { padding: 16px 0 0; font-size: 15px; color: #6B6B6B; line-height: 1.6; font-style: italic; }
    .reflection-modal .stt-modal-body { padding: 0 20px 20px; }
    .reflection-modal .stt-modal-textarea { padding: 16px 0; }

    /* Recap guided flow */
    .reflections-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .reflections-header h2 { margin-bottom: 0; }
    .recap-btn {
      appearance: none; -webkit-appearance: none; background: #D97757; color: #FFF; border: none; border-radius: 8px;
      padding: 6px 14px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer;
      display: flex; align-items: center; gap: 6px; transition: background 150ms; flex-shrink: 0;
    }
    .recap-btn:hover { background: #C5643F; }
    .recap-modal { position: fixed; inset: 0; background: #FAF9F6; z-index: 1003; display: none; flex-direction: column; }
    .recap-modal.open { display: flex; }
    .recap-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #E5E4E0; }
    .recap-step-counter { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; color: #6B6B6B; }
    .recap-close {
      appearance: none; -webkit-appearance: none; background: none; border: none; font-size: 24px; color: #9B9B9B;
      cursor: pointer; padding: 0 4px; line-height: 1;
    }
    .recap-close:hover { color: #1A1A1A; }
    .recap-dots { display: flex; justify-content: center; gap: 8px; padding: 12px 20px; }
    .recap-dot { width: 10px; height: 10px; border-radius: 50%; background: #E5E4E0; transition: all 200ms; }
    .recap-dot.active { background: #D97757; transform: scale(1.2); }
    .recap-dot.done { background: #33B679; }
    .recap-body { flex: 1; display: flex; flex-direction: column; padding: 20px; overflow-y: auto; }
    .recap-topic { font-family: 'Source Serif 4', Georgia, serif; font-size: 24px; font-weight: 600; color: #1A1A1A; margin-bottom: 8px; }
    .recap-prompt { font-size: 15px; color: #6B6B6B; font-style: italic; margin-bottom: 16px; line-height: 1.6; }
    .recap-stt-notice {
      background: #FFF8F0; border: 1px solid #E5E4E0; border-radius: 6px; padding: 8px 12px;
      font-size: 13px; color: #6B6B6B; margin-bottom: 12px; display: none;
    }
    .recap-textarea {
      flex: 1; min-height: 120px; border: 1px solid #E5E4E0; border-radius: 8px; padding: 12px 16px;
      font-family: 'Inter', sans-serif; font-size: 16px; line-height: 1.7; resize: none;
      background: #FFF; color: #1A1A1A; outline: none;
    }
    .recap-textarea:focus { border-color: #D97757; }
    .recap-textarea::placeholder { color: #C5C1C1; }
    .recap-interim { font-size: 14px; color: #9B9B9B; font-style: italic; min-height: 20px; margin-top: 8px; }
    .recap-footer { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-top: 1px solid #E5E4E0; }
    .recap-back, .recap-next {
      appearance: none; -webkit-appearance: none; border: none; border-radius: 8px;
      padding: 10px 20px; font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 150ms;
    }
    .recap-back { background: #F0EFEB; color: #6B6B6B; }
    .recap-back:hover { background: #E5E4E0; }
    .recap-back:disabled { opacity: 0.3; cursor: default; }
    .recap-next { background: #D97757; color: #FFF; }
    .recap-next:hover { background: #C5643F; }
    /* recap mic uses shared .stt-modal-mic class */
    @keyframes mic-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(229,57,53,0.3); }
      50% { box-shadow: 0 0 0 10px rgba(229,57,53,0); }
    }
    .recap-congrats {
      position: fixed; inset: 0; z-index: 1004; background: rgba(250,249,246,0.95);
      display: none; flex-direction: column; align-items: center; justify-content: center;
    }
    .recap-congrats.open { display: flex; }
    .congrats-circle {
      width: 80px; height: 80px; border-radius: 50%; background: #33B679;
      display: flex; align-items: center; justify-content: center; margin-bottom: 20px;
      animation: congrats-pop 0.4s ease-out;
    }
    .congrats-circle svg { width: 40px; height: 40px; color: #FFF; }
    .congrats-title { font-family: 'Source Serif 4', Georgia, serif; font-size: 24px; font-weight: 600; color: #1A1A1A; margin-bottom: 8px; }
    .congrats-sub { font-size: 15px; color: #6B6B6B; }
    @keyframes congrats-pop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
    @keyframes congrats-fade { from { opacity: 1; } to { opacity: 0; } }
  </style>
</head>
<body>
  <button class="refresh-btn" id="refresh-btn" aria-label="Refresh">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9B9B9B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
  </button>

  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-date">${escapeHtml(dateFormatted)}</div>
      <h1 class="header-greeting">${escapeHtml(greeting)}</h1>
    </div>

    <!-- Priority Card -->
    <div class="priority-card" data-testid="priority-card">
      <div class="priority-label"><a href="https://morningbrew-gilt.vercel.app" target="_blank" rel="noopener">Today's Priority</a></div>
      <div class="priority-statement" id="priority-text" contenteditable="true" spellcheck="false">${priorityLabel}</div>
      <div class="priority-reason" id="priority-reason" contenteditable="true" spellcheck="false">${escapeHtml(plan.priorityReason)}</div>
      <div class="priority-edit-hint">tap to edit<span class="priority-saved" id="priority-saved">Saved</span></div>
    </div>

    <!-- Sync status indicator -->
    <div class="sync-status" id="sync-status"></div>

    <!-- Day Timeline -->
    <div class="day-timeline" data-testid="day-timeline">
      <h2>Your schedule</h2>
      ${timelineHtml}
    </div>

    ${deferredHtml}

    <!-- Evening Reflections -->
    <div class="reflections-section">
      <div class="reflections-header">
        <h2>Evening reflections</h2>
        <button class="recap-btn" id="recap-open">&#9654; Recap</button>
      </div>
      <button class="reflection-card" data-reflection-idx="9990">
        <span class="reflection-num">1</span>
        <div class="reflection-text">
          <div class="reflection-label">Biggest win</div>
          <div class="reflection-prompt">What was the most meaningful accomplishment today?</div>
        </div>
        <svg class="reflection-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <button class="reflection-card" data-reflection-idx="9991">
        <span class="reflection-num">2</span>
        <div class="reflection-text">
          <div class="reflection-label">Gratitude</div>
          <div class="reflection-prompt">Whom are you grateful for today, and why?</div>
        </div>
        <svg class="reflection-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <button class="reflection-card" data-reflection-idx="9992">
        <span class="reflection-num">3</span>
        <div class="reflection-text">
          <div class="reflection-label">Learnings</div>
          <div class="reflection-prompt">What did you learn or discover today?</div>
        </div>
        <svg class="reflection-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <button class="reflection-card" data-reflection-idx="9993">
        <span class="reflection-num">4</span>
        <div class="reflection-text">
          <div class="reflection-label">Priority achieved?</div>
          <div class="reflection-prompt" id="reflection-priority-prompt">How aligned were you with &ldquo;${priorityLabel}&rdquo; today?</div>
        </div>
        <svg class="reflection-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <button class="reflection-card" data-reflection-idx="9994">
        <span class="reflection-num">5</span>
        <div class="reflection-text">
          <div class="reflection-label">Tomorrow&rsquo;s priority</div>
          <div class="reflection-prompt">Without looking at to-dos, what should you focus on tomorrow?</div>
        </div>
        <svg class="reflection-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
    </div>

    <!-- Copy buttons -->
    <div class="status-section">
      <div class="copy-buttons">
        <button class="copy-btn copy-btn-chat" id="copy-chat">Copy for Chat<span class="copy-btn-sub">Reflect in voice mode</span></button>
        <button class="copy-btn copy-btn-tomorrow" id="copy-tomorrow">Copy for Tomorrow<span class="copy-btn-sub">Bootstrap /morning</span></button>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      Morning Brew &mdash; generated ${escapeHtml(plan.date)}
    </div>
  </div>

  <!-- Bottom tab bar -->
  <nav class="bottom-tabs" id="bottom-tabs">
    <button class="bottom-tab" data-tab-target="top" aria-label="Scroll to priority">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
      Priority
    </button>
    <button class="bottom-tab" data-tab-target="now" aria-label="Scroll to now">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      Now
    </button>
    <button class="bottom-tab" data-tab-target="backlog" aria-label="Scroll to backlog">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
      Backlog
    </button>
    <button class="bottom-tab" data-tab-target="evening" aria-label="Scroll to reflections">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      Reflect
    </button>
  </nav>

  <!-- Details modal -->
  <div class="details-modal" id="details-modal">
    <div class="details-modal-header">
      <span class="details-modal-title" id="details-modal-title"></span>
      <button class="details-modal-close" id="details-modal-close">Close</button>
    </div>
    <div class="details-modal-content" id="details-modal-content"></div>
    <div class="details-modal-footer">
      <button class="details-reflect-btn" id="details-reflect-btn">${PENCIL_SVG}<span>Reflect</span></button>
    </div>
  </div>

  <!-- Fullscreen note modal -->
  <div class="note-modal" id="note-modal">
    <div class="note-modal-header">
      <span class="note-modal-title" id="note-modal-title"></span>
      <button class="stt-modal-close" id="note-modal-close">Done</button>
    </div>
    <div class="note-modal-mic-area">
      <button class="stt-modal-mic stt-modal-mic-lg" id="note-modal-mic">${MIC_SVG}</button>
      <div class="stt-modal-stt-notice" id="note-modal-stt-notice">Speech-to-text is not available in this browser. You can still type your notes.</div>
      <div class="stt-modal-interim" id="note-modal-interim"></div>
    </div>
    <div class="stt-modal-body">
      <textarea class="stt-modal-textarea" id="note-modal-textarea" placeholder="Tap the mic above to speak, or tap here to type..."></textarea>
    </div>
  </div>

  <!-- Reflection modal -->
  <div class="reflection-modal" id="reflection-modal">
    <div class="reflection-modal-header">
      <span class="reflection-modal-title" id="reflection-modal-title"></span>
      <button class="stt-modal-close" id="reflection-modal-close">Done</button>
    </div>
    <div class="stt-modal-body">
      <div class="reflection-modal-prompt" id="reflection-modal-prompt-text"></div>
      <div class="stt-modal-stt-notice" id="reflection-modal-stt-notice">Speech-to-text is not available in this browser. You can still type your reflection.</div>
      <textarea class="stt-modal-textarea" id="reflection-modal-textarea" placeholder="Speak or type your reflection..."></textarea>
      <div class="stt-modal-interim" id="reflection-modal-interim"></div>
    </div>
    <div class="stt-modal-footer">
      <button class="stt-modal-mic" id="reflection-modal-mic">${MIC_SVG}</button>
    </div>
  </div>

  <!-- Recap modal -->
  <div class="recap-modal" id="recap-modal">
    <div class="recap-modal-header">
      <span class="recap-step-counter" id="recap-step-counter">1 of 5</span>
      <button class="recap-close" id="recap-close">&times;</button>
    </div>
    <div class="recap-dots" id="recap-dots">
      <span class="recap-dot"></span><span class="recap-dot"></span><span class="recap-dot"></span><span class="recap-dot"></span><span class="recap-dot"></span>
    </div>
    <div class="recap-body">
      <div class="recap-topic" id="recap-topic"></div>
      <div class="recap-prompt" id="recap-prompt-text"></div>
      <div class="recap-stt-notice" id="recap-stt-notice">Speech-to-text is not available in this browser. You can still type your reflections.</div>
      <textarea class="recap-textarea" id="recap-textarea" placeholder="Speak or type your reflection..."></textarea>
      <div class="recap-interim" id="recap-interim"></div>
    </div>
    <div class="recap-footer">
      <button class="recap-back" id="recap-back" disabled>Back</button>
      <button class="stt-modal-mic" id="recap-mic">${MIC_SVG}</button>
      <button class="recap-next" id="recap-next">Next</button>
    </div>
  </div>

  <!-- Congrats overlay -->
  <div class="recap-congrats" id="recap-congrats">
    <div class="congrats-circle">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <div class="congrats-title">Reflections complete</div>
    <div class="congrats-sub">Well done. See you tomorrow.</div>
  </div>

  <script>
  (function() {
    var DATE_KEY = '${dateKey}';
    var PRIORITY = document.getElementById('priority-text').textContent;
    var REASON = document.getElementById('priority-reason').textContent;

    // --- Refresh button ---
    document.getElementById('refresh-btn').addEventListener('click', function() {
      this.classList.add('spinning');
      setTimeout(function() { location.reload(); }, 300);
    });

    // --- Supabase config ---
    var SB_URL = 'https://xwxsrsybllifbivhgojl.supabase.co';
    var SB_KEY = 'sb_publishable_fcZRHJWzxFYrwfQVmTy0GQ_6DVu0Byk';
    var SB_HEADERS = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' };
    var syncEl = document.getElementById('sync-status');

    function showSync(msg, cls) { syncEl.textContent = msg; syncEl.className = 'sync-status ' + (cls || ''); }

    function sbUpsert(idx, status, note) {
      showSync('Syncing...', 'syncing');
      fetch(SB_URL + '/rest/v1/morning_brew_status?on_conflict=brew_date,item_index', {
        method: 'POST',
        headers: Object.assign({}, SB_HEADERS, { 'Prefer': 'resolution=merge-duplicates' }),
        body: JSON.stringify({ brew_date: DATE_KEY, item_index: parseInt(idx), status: status || null, note: note || null })
      }).then(function() { showSync('Synced', 'synced'); })
        .catch(function() { showSync('Offline - saved locally', ''); });
    }

    // Write-back to the tasks table (done, defer, reprioritize)
    function sbTaskPatch(taskId, data) {
      if (!taskId) return;
      fetch(SB_URL + '/rest/v1/tasks?id=eq.' + taskId, {
        method: 'PATCH',
        headers: Object.assign({}, SB_HEADERS, { 'Prefer': 'return=minimal' }),
        body: JSON.stringify(data)
      }).catch(function() { /* tasks write-back is best-effort */ });
    }

    function getTaskId(el) {
      var item = el.closest('[data-task-id]');
      return item ? item.dataset.taskId : null;
    }

    function sbLoad() {
      showSync('Loading...', 'syncing');
      return fetch(SB_URL + '/rest/v1/morning_brew_status?brew_date=eq.' + DATE_KEY, { headers: SB_HEADERS })
        .then(function(r) { return r.json(); })
        .then(function(rows) { showSync('Synced', 'synced'); return rows; })
        .catch(function() { showSync('Offline - using local data', ''); return null; });
    }

    // --- State management ---
    var itemState = {}; // { index: { status, note } }
    var reflectionState = {}; // { 9990-9994: text }
    var items = document.querySelectorAll('[data-item-index]');

    function applyState(el, idx) {
      var s = itemState[idx] || {};
      var check = el.querySelector('.item-check');
      var skip = el.querySelector('.item-skip');
      var noteToggle = el.querySelector('.note-toggle');
      var noteInput = el.querySelector('.item-note');
      el.classList.remove('is-done', 'is-skipped');
      if (check) check.checked = false;
      if (skip) skip.classList.remove('is-active');
      if (s.status === 'done') { el.classList.add('is-done'); if (check) check.checked = true; }
      if (s.status === 'skip') { el.classList.add('is-skipped'); if (skip) skip.classList.add('is-active'); }
      if (noteInput && s.note) { noteInput.value = s.note; }
      if (noteToggle) { noteToggle.classList.toggle('has-note', !!(s.note && s.note.trim())); }
      // localStorage fallback
      localStorage.setItem('mb-' + DATE_KEY + '-' + idx, JSON.stringify(s));
    }

    function setState(idx, key, val) {
      if (!itemState[idx]) itemState[idx] = {};
      itemState[idx][key] = val;
      var el = document.querySelector('[data-item-index="' + idx + '"]');
      if (el) applyState(el, idx);
      sbUpsert(idx, itemState[idx].status, itemState[idx].note);
    }

    // --- Init: load from Supabase, fall back to localStorage ---
    sbLoad().then(function(rows) {
      if (rows && rows.length > 0) {
        rows.forEach(function(r) {
          if (r.item_index === 9999) {
            if (r.status) { document.getElementById('priority-text').textContent = r.status; PRIORITY = r.status; }
            if (r.note) { document.getElementById('priority-reason').textContent = r.note; REASON = r.note; }
          } else if (r.item_index >= 9990 && r.item_index <= 9994) {
            reflectionState[r.item_index] = r.note;
            var rCard = document.querySelector('[data-reflection-idx="' + r.item_index + '"]');
            if (rCard) rCard.classList.toggle('has-entry', !!r.note);
          } else {
            itemState[r.item_index] = { status: r.status, note: r.note };
          }
        });
      } else {
        // Fall back to localStorage
        items.forEach(function(el) {
          var idx = el.dataset.itemIndex;
          var saved = localStorage.getItem('mb-' + DATE_KEY + '-' + idx);
          if (saved) { try { itemState[idx] = JSON.parse(saved); } catch(e) {} }
        });
        // Also load reflections from localStorage
        [9990,9991,9992,9993,9994].forEach(function(ri) {
          var sv = localStorage.getItem('mb-' + DATE_KEY + '-ref-' + ri);
          if (sv) { reflectionState[ri] = sv; var rc = document.querySelector('[data-reflection-idx="' + ri + '"]'); if (rc) rc.classList.toggle('has-entry', true); }
        });
      }
      // Apply state to DOM
      items.forEach(function(el) { applyState(el, el.dataset.itemIndex); });
    });

    // --- Event handlers ---
    items.forEach(function(el) {
      var idx = el.dataset.itemIndex;
      var check = el.querySelector('.item-check');
      var skip = el.querySelector('.item-skip');
      var noteToggle = el.querySelector('.note-toggle');
      var noteArea = document.querySelector('[data-note-index="' + idx + '"]');
      var noteInput = el.querySelector('.item-note');
      var noteExpand = el.querySelector('.note-expand');

      if (check) check.addEventListener('change', function() {
        var isDone = check.checked;
        setState(idx, 'status', isDone ? 'done' : null);
        var tid = getTaskId(check);
        if (tid) sbTaskPatch(tid, { status: isDone ? 'done' : 'open' });
      });
      if (skip) skip.addEventListener('click', function() {
        var cur = (itemState[idx] || {}).status;
        var newStatus = cur === 'skip' ? null : 'skip';
        setState(idx, 'status', newStatus);
        // Skip = defer: push due_date +7 days
        if (newStatus === 'skip') {
          var tid = getTaskId(skip);
          if (tid) {
            var d = new Date(); d.setDate(d.getDate() + 7);
            sbTaskPatch(tid, { due_date: d.toISOString().slice(0, 10) });
          }
        }
      });
      if (noteToggle) {
        noteToggle.addEventListener('click', function() { openNoteModal(idx); });
      }
      if (noteInput) {
        var debounce;
        noteInput.addEventListener('input', function() {
          clearTimeout(debounce);
          debounce = setTimeout(function() { setState(idx, 'note', noteInput.value.trim() || null); }, 600);
        });
      }
      if (noteExpand) noteExpand.addEventListener('click', function() { openNoteModal(idx); });
    });

    // --- Web Speech API setup (shared by note, reflection, and recap modals) ---
    var recogInstance = null;
    var sttAvailable = false;
    var activeTarget = null;
    var SpeechRecog = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecog) {
      sttAvailable = true;
      recogInstance = new SpeechRecog();
      recogInstance.continuous = true;
      recogInstance.interimResults = true;
      recogInstance.lang = 'en-US';

      recogInstance.onresult = function(event) {
        if (!activeTarget) return;
        var allText = '';
        for (var i = 0; i < event.results.length; i++) {
          allText += event.results[i][0].transcript;
        }
        var base = activeTarget.baseText || '';
        activeTarget.textarea.value = base + (base && allText ? ' ' : '') + allText;
        activeTarget.interim.textContent = '';
      };

      recogInstance.onend = function() {
        if (activeTarget) {
          activeTarget.baseText = activeTarget.textarea.value;
          try { recogInstance.start(); } catch(e) {}
        }
      };

      recogInstance.onerror = function(event) {
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        stopAllListening();
      };
    }

    // --- STT controller factory ---
    var sttControllers = [];
    function createSttController(textarea, interim, micBtn, sttNotice) {
      var ctrl = { listening: false };
      ctrl.start = function() {
        if (!recogInstance) return;
        stopAllListening();
        activeTarget = { textarea: textarea, interim: interim, baseText: textarea.value };
        ctrl.listening = true;
        micBtn.classList.add('listening');
        try { recogInstance.start(); } catch(e) {}
      };
      ctrl.stop = function() {
        if (!ctrl.listening) return;
        ctrl.listening = false;
        micBtn.classList.remove('listening');
        if (recogInstance && activeTarget && activeTarget.textarea === textarea) {
          try { recogInstance.stop(); } catch(e) {}
          activeTarget = null;
        }
        interim.textContent = '';
      };
      ctrl.configure = function(noun) {
        if (!sttAvailable) {
          sttNotice.style.display = 'block';
          micBtn.style.display = 'none';
          textarea.placeholder = 'Type your ' + noun + '...';
        } else {
          sttNotice.style.display = 'none';
          micBtn.style.display = 'flex';
          textarea.placeholder = 'Speak or type your ' + noun + '...';
        }
      };
      micBtn.addEventListener('click', function() {
        if (ctrl.listening) ctrl.stop(); else ctrl.start();
      });
      sttControllers.push(ctrl);
      return ctrl;
    }
    function stopAllListening() {
      for (var i = 0; i < sttControllers.length; i++) sttControllers[i].stop();
    }

    // --- Fullscreen note modal ---
    var modal = document.getElementById('note-modal');
    var modalTitle = document.getElementById('note-modal-title');
    var modalTextarea = document.getElementById('note-modal-textarea');
    var modalClose = document.getElementById('note-modal-close');
    var activeModalIdx = null;
    var noteStt = createSttController(
      modalTextarea,
      document.getElementById('note-modal-interim'),
      document.getElementById('note-modal-mic'),
      document.getElementById('note-modal-stt-notice')
    );

    function openNoteModal(idx) {
      activeModalIdx = idx;
      stopAllListening();
      var el = document.querySelector('[data-item-index="' + idx + '"]');
      var labelEl = el ? (el.querySelector('.timeline-label') || el.querySelector('.deferred-label')) : null;
      var label = labelEl ? labelEl.textContent : '';
      modalTitle.textContent = label;
      modalTextarea.value = (itemState[idx] || {}).note || '';
      modal.classList.add('open');
      noteStt.configure('notes');
      // Don't focus textarea — keyboard only appears when user taps the text area
    }

    modalClose.addEventListener('click', function() {
      noteStt.stop();
      if (activeModalIdx !== null) {
        var val = modalTextarea.value.trim() || null;
        setState(activeModalIdx, 'note', val);
        var inline = document.querySelector('.item-note[data-index="' + activeModalIdx + '"]');
        if (inline) inline.value = val || '';
      }
      modal.classList.remove('open');
      activeModalIdx = null;
    });

    // --- Details modal ---
    var detailsModal = document.getElementById('details-modal');
    var detailsTitle = document.getElementById('details-modal-title');
    var detailsContent = document.getElementById('details-modal-content');
    var detailsClose = document.getElementById('details-modal-close');

    var activeDetailsIdx = null;
    document.querySelectorAll('.details-toggle').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = btn.dataset.detailsIndex;
        activeDetailsIdx = idx;
        var el = document.querySelector('[data-item-index="' + idx + '"]');
        var enrichment = document.querySelector('[data-enrichment-index="' + idx + '"]');
        var label = el ? el.querySelector('.timeline-label').textContent : '';
        detailsTitle.textContent = label;
        detailsContent.innerHTML = enrichment ? enrichment.innerHTML : '';
        detailsModal.classList.add('open');
      });
    });

    detailsClose.addEventListener('click', function() {
      detailsModal.classList.remove('open');
      activeDetailsIdx = null;
    });

    // Reflect button inside details modal → close details, open note modal
    document.getElementById('details-reflect-btn').addEventListener('click', function() {
      if (activeDetailsIdx !== null) {
        var idx = activeDetailsIdx;
        detailsModal.classList.remove('open');
        activeDetailsIdx = null;
        openNoteModal(idx);
      }
    });

    // --- Priority editing ---
    var priorityEl = document.getElementById('priority-text');
    var reasonEl = document.getElementById('priority-reason');
    var savedEl = document.getElementById('priority-saved');

    function savePriority() {
      var text = priorityEl.textContent.trim();
      var reason = reasonEl.textContent.trim();
      PRIORITY = text;
      REASON = reason;
      showSync('Syncing...', 'syncing');
      fetch(SB_URL + '/rest/v1/morning_brew_status?on_conflict=brew_date,item_index', {
        method: 'POST',
        headers: Object.assign({}, SB_HEADERS, { 'Prefer': 'resolution=merge-duplicates' }),
        body: JSON.stringify({ brew_date: DATE_KEY, item_index: 9999, status: text, note: reason })
      }).then(function() {
        showSync('Synced', 'synced');
        if (savedEl) { savedEl.classList.add('show'); setTimeout(function() { savedEl.classList.remove('show'); }, 1500); }
      }).catch(function() { showSync('Offline', ''); });
    }

    var priorityDebounce;
    priorityEl.addEventListener('input', function() {
      clearTimeout(priorityDebounce);
      priorityDebounce = setTimeout(savePriority, 800);
    });
    reasonEl.addEventListener('input', function() {
      clearTimeout(priorityDebounce);
      priorityDebounce = setTimeout(savePriority, 800);
    });
    // Prevent newlines in priority fields
    priorityEl.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); priorityEl.blur(); } });
    reasonEl.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); reasonEl.blur(); } });

    // --- Deferred priority badge click (reprioritize) ---
    var SB_PRIORITY_LABELS = ['P0','P1','P2','P3','P4'];
    var SB_PRIORITY_COLORS = ['#D32F2F','#E65100','#1565C0','#757575','#BDBDBD'];
    document.querySelectorAll('.deferred-badge[data-index]').forEach(function(badge) {
      badge.style.cursor = 'pointer';
      badge.title = 'Click to change priority';
      badge.addEventListener('click', function(e) {
        e.stopPropagation();
        var card = badge.closest('.deferred-card');
        if (!card) return;
        var tid = card.dataset.taskId;
        var cur = parseInt(card.dataset.sbPriority) || 0;
        var next = (cur + 1) % 5;
        card.dataset.sbPriority = next;
        badge.textContent = SB_PRIORITY_LABELS[next];
        badge.style.background = SB_PRIORITY_COLORS[next];
        if (tid) sbTaskPatch(tid, { priority: next });
      });
    });

    // --- Deferred card expand/collapse ---
    document.querySelectorAll('[data-deferred-toggle]').forEach(function(header) {
      header.addEventListener('click', function(e) {
        if (e.target.closest('.item-check, .item-skip, .deferred-badge')) return;
        var idx = header.dataset.deferredToggle;
        var card = header.closest('.deferred-card');
        var detail = document.querySelector('[data-deferred-detail="' + idx + '"]');
        if (!card || !detail) return;
        var isOpen = card.classList.contains('is-expanded');
        card.classList.toggle('is-expanded');
        detail.style.display = isOpen ? 'none' : 'block';
      });
    });

    // --- Reflections ---
    var REFLECTION_LABELS = {9990:'Biggest win',9991:'Gratitude',9992:'Learnings',9993:'Priority achieved?',9994:"Tomorrow's priority"};
    var refModal = document.getElementById('reflection-modal');
    var refModalTitle = document.getElementById('reflection-modal-title');
    var refModalPrompt = document.getElementById('reflection-modal-prompt-text');
    var refModalTextarea = document.getElementById('reflection-modal-textarea');
    var refModalInterim = document.getElementById('reflection-modal-interim');
    var refModalClose = document.getElementById('reflection-modal-close');
    var activeRefIdx = null;
    var refStt = createSttController(
      refModalTextarea,
      refModalInterim,
      document.getElementById('reflection-modal-mic'),
      document.getElementById('reflection-modal-stt-notice')
    );

    document.querySelectorAll('[data-reflection-idx]').forEach(function(card) {
      card.addEventListener('click', function() {
        var idx = parseInt(card.dataset.reflectionIdx);
        activeRefIdx = idx;
        stopAllListening();
        refModalTitle.textContent = card.querySelector('.reflection-label').textContent;
        var prompt = card.querySelector('.reflection-prompt').textContent;
        if (idx === 9993) {
          prompt = 'How aligned were you with \\u201c' + document.getElementById('priority-text').textContent.trim() + '\\u201d today?';
        }
        refModalPrompt.textContent = prompt;
        refModalTextarea.value = reflectionState[idx] || '';
        refStt.configure('reflection');
        refModal.classList.add('open');
        refModalTextarea.focus();
      });
    });

    refModalClose.addEventListener('click', function() {
      refStt.stop();
      if (activeRefIdx !== null) {
        var val = refModalTextarea.value.trim() || null;
        reflectionState[activeRefIdx] = val;
        var card = document.querySelector('[data-reflection-idx="' + activeRefIdx + '"]');
        if (card) card.classList.toggle('has-entry', !!val);
        sbUpsert(activeRefIdx, 'reflection', val);
        localStorage.setItem('mb-' + DATE_KEY + '-ref-' + activeRefIdx, val || '');
      }
      refModal.classList.remove('open');
      activeRefIdx = null;
    });

    // --- Now-line ---
    function updateNowLine() {
      var existing = document.querySelector('.now-line');
      if (existing) existing.remove();
      var now = new Date();
      var allItems = document.querySelectorAll('.timeline-item[data-start]');
      if (allItems.length === 0) return;
      if (now < new Date(allItems[0].dataset.start) || now > new Date(allItems[allItems.length-1].dataset.end)) return;

      var line = document.createElement('div'); line.className = 'now-line'; line.id = 'now-marker';
      var t = document.createElement('span'); t.className = 'now-time';
      t.textContent = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
      line.appendChild(t);

      for (var i = 0; i < allItems.length; i++) {
        var s = new Date(allItems[i].dataset.start), e = new Date(allItems[i].dataset.end);
        if (now >= s && now < e) {
          // Inside this item — position proportionally like Google Calendar
          var progress = (now.getTime() - s.getTime()) / (e.getTime() - s.getTime());
          line.style.position = 'absolute';
          line.style.left = '0';
          line.style.right = '0';
          line.style.top = (progress * 100) + '%';
          line.style.margin = '0';
          allItems[i].appendChild(line);
          return;
        }
        if (now < s) {
          // In a gap before this item — insert between items
          allItems[i].parentNode.insertBefore(line, allItems[i]);
          return;
        }
      }
      // After the last item
      allItems[allItems.length-1].parentNode.insertBefore(line, allItems[allItems.length-1].nextSibling);
    }
    updateNowLine();
    setTimeout(function() { var m = document.getElementById('now-marker'); if (m) m.scrollIntoView({behavior:'smooth',block:'center'}); }, 300);
    setInterval(updateNowLine, 60000);

    // --- Build day status markdown (shared by both copy buttons) ---
    function buildDayStatusMd() {
      var done = [], skipped = [], pending = [], deferredDone = [], deferredPending = [];
      var curPriority = document.getElementById('priority-text').textContent.trim();
      var curReason = document.getElementById('priority-reason').textContent.trim();
      items.forEach(function(el) {
        var idx = el.dataset.itemIndex;
        var isDeferred = el.dataset.deferred === 'true';
        var labelEl = el.querySelector('.timeline-label') || el.querySelector('.deferred-label');
        var label = labelEl ? labelEl.textContent.trim() : '';
        var timeEl = el.querySelector('.timeline-time');
        var time = timeEl ? timeEl.textContent.trim().replace(/\\u2013/g, '-') : '';
        var s = itemState[idx] || {};
        var entry = time ? '- ' + time + ' | ' + label : '- ' + label;
        if (s.note) entry += '\\n  > ' + s.note;
        if (isDeferred) {
          if (s.status === 'done') deferredDone.push(entry);
          else if (s.status !== 'skip') deferredPending.push(entry);
        } else {
          if (s.status === 'done') done.push(entry);
          else if (s.status === 'skip') skipped.push(entry);
          else pending.push(entry);
        }
      });
      var md = '';
      md += '## Today\\'s Priority\\n**' + curPriority + '**\\n' + curReason + '\\n\\n';
      md += '## Completed (' + done.length + ')\\n' + (done.length > 0 ? done.join('\\n') : '_Nothing yet._') + '\\n\\n';
      if (deferredDone.length > 0) { md += '## Bonus: Completed from Deferred (' + deferredDone.length + ')\\n' + deferredDone.join('\\n') + '\\n\\n'; }
      md += '## Skipped (' + skipped.length + ')\\n' + (skipped.length > 0 ? skipped.join('\\n') : '_Nothing skipped._') + '\\n\\n';
      md += '## Still Pending (' + pending.length + ')\\n' + (pending.length > 0 ? pending.join('\\n') : '_Everything addressed!_') + '\\n\\n';
      if (deferredPending.length > 0) { md += '## Deferred (not scheduled today)\\n' + deferredPending.join('\\n') + '\\n\\n'; }
      var hasRef = false;
      var refMd = '## My Reflections\\n\\n';
      [9990,9991,9992,9993,9994].forEach(function(ri) {
        if (reflectionState[ri]) {
          hasRef = true;
          refMd += '### ' + REFLECTION_LABELS[ri] + '\\n' + reflectionState[ri] + '\\n\\n';
        }
      });
      if (hasRef) { md += refMd; }
      return { md: md, curPriority: curPriority, hasRef: hasRef, done: done, pending: pending, deferredPending: deferredPending };
    }

    function flashCopied(btn, originalHtml) {
      btn.innerHTML = 'Copied!'; btn.classList.add('copied');
      setTimeout(function() { btn.innerHTML = originalHtml; btn.classList.remove('copied'); }, 2000);
    }

    // --- Copy for Chat ---
    document.getElementById('copy-chat').addEventListener('click', function() {
      var btn = this;
      var data = buildDayStatusMd();
      var md = '# Day Context \\u2014 ' + DATE_KEY + '\\n\\n';
      md += 'First, just absorb this context about how my day went. Don\\'t respond with analysis yet \\u2014 just say "Got it, ready when you are." Then I\\'ll switch to voice mode and we\\'ll have a conversation about it.\\n\\n';
      md += data.md;
      md += '---\\n\\n';
      if (data.hasRef) {
        md += 'When I\\'m ready to talk, help me explore my reflections above. React to what I wrote \\u2014 affirm, challenge, or build on it. Then help me refine tomorrow\\'s priority.\\n';
      } else {
        md += 'When I\\'m ready to talk, coach me through: priority alignment with "' + data.curPriority + '", biggest win, gratitude, learnings, and what to focus on tomorrow.\\n';
      }
      md += 'Be warm but direct. Call out patterns you notice. Keep it conversational.\\n';
      navigator.clipboard.writeText(md).then(function() {
        flashCopied(btn, 'Copy for Chat<span class="copy-btn-sub">Reflect in voice mode</span>');
      });
    });

    // --- Copy for Tomorrow ---
    document.getElementById('copy-tomorrow').addEventListener('click', function() {
      var btn = this;
      var data = buildDayStatusMd();
      var md = 'Here is my end-of-day review for ' + DATE_KEY + '. Run /morning to plan tomorrow based on this context.\\n\\n';
      md += '# Today\\'s Review \\u2014 ' + DATE_KEY + '\\n\\n';
      md += data.md;
      md += '---\\n\\n';
      md += 'This is the review of what happened today. Use /morning to synthesize tomorrow\\'s priority. Pay attention to what was pending, deferred, and any reflections \\u2014 they carry forward into tomorrow\\'s plan.\\n';
      navigator.clipboard.writeText(md).then(function() {
        flashCopied(btn, 'Copy for Tomorrow<span class="copy-btn-sub">Bootstrap /morning</span>');
      });
    });

    // --- Bottom tab bar navigation ---
    document.getElementById('bottom-tabs').addEventListener('click', function(e) {
      var tab = e.target.closest('[data-tab-target]');
      if (!tab) return;
      var target = tab.dataset.tabTarget;
      if (target === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (target === 'now') {
        var nowLine = document.getElementById('now-marker');
        if (nowLine) { nowLine.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        else { window.scrollTo({ top: 0, behavior: 'smooth' }); }
      } else if (target === 'backlog') {
        var deferred = document.querySelector('[data-testid="deferred-section"]');
        if (deferred) { deferred.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      } else if (target === 'evening') {
        var reflections = document.querySelector('.reflections-section');
        if (reflections) { reflections.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      }
    });

    // --- Recap guided flow ---
    var RECAP_TOPICS = [
      { idx: 9990, label: 'Biggest win', prompt: 'What was the most meaningful accomplishment today?' },
      { idx: 9991, label: 'Gratitude', prompt: 'Whom are you grateful for today, and why?' },
      { idx: 9992, label: 'Learnings', prompt: 'What did you learn or discover today?' },
      { idx: 9993, label: 'Priority achieved?', prompt: '' },
      { idx: 9994, label: "Tomorrow's priority", prompt: 'Without looking at to-dos, what should you focus on tomorrow?' }
    ];

    var recapModal = document.getElementById('recap-modal');
    var recapStepCounter = document.getElementById('recap-step-counter');
    var recapDotsEl = document.getElementById('recap-dots');
    var recapTopic = document.getElementById('recap-topic');
    var recapPromptText = document.getElementById('recap-prompt-text');
    var recapTextarea = document.getElementById('recap-textarea');
    var recapInterim = document.getElementById('recap-interim');
    var recapBackBtn = document.getElementById('recap-back');
    var recapNextBtn = document.getElementById('recap-next');
    var recapCloseBtn = document.getElementById('recap-close');
    var recapCongratsEl = document.getElementById('recap-congrats');
    var recapStep = 0;
    var rcStt = createSttController(
      recapTextarea,
      recapInterim,
      document.getElementById('recap-mic'),
      document.getElementById('recap-stt-notice')
    );

    function renderRecapStep() {
      var topic = RECAP_TOPICS[recapStep];
      recapStepCounter.textContent = (recapStep + 1) + ' of 5';
      recapTopic.textContent = topic.label;
      var prompt = topic.prompt;
      if (topic.idx === 9993) {
        prompt = 'How aligned were you with \\u201c' + document.getElementById('priority-text').textContent.trim() + '\\u201d today?';
      }
      recapPromptText.textContent = prompt;
      recapTextarea.value = reflectionState[topic.idx] || '';
      recapBackBtn.disabled = recapStep === 0;
      recapNextBtn.textContent = recapStep === 4 ? 'Finish' : 'Next';

      var dots = recapDotsEl.querySelectorAll('.recap-dot');
      for (var i = 0; i < dots.length; i++) {
        dots[i].className = 'recap-dot';
        if (i === recapStep) dots[i].classList.add('active');
        else if (reflectionState[RECAP_TOPICS[i].idx]) dots[i].classList.add('done');
      }
    }

    function saveRecapStep() {
      var topic = RECAP_TOPICS[recapStep];
      var val = recapTextarea.value.trim() || null;
      reflectionState[topic.idx] = val;
      var card = document.querySelector('[data-reflection-idx="' + topic.idx + '"]');
      if (card) card.classList.toggle('has-entry', !!val);
      sbUpsert(topic.idx, 'reflection', val);
      localStorage.setItem('mb-' + DATE_KEY + '-ref-' + topic.idx, val || '');
    }

    function openRecap() {
      recapStep = 0;
      stopAllListening();
      renderRecapStep();
      recapModal.classList.add('open');
      rcStt.configure('reflection');
    }

    document.getElementById('recap-open').addEventListener('click', openRecap);

    recapNextBtn.addEventListener('click', function() {
      saveRecapStep();
      rcStt.stop();
      if (recapStep < 4) {
        recapStep++;
        renderRecapStep();
      } else {
        recapModal.classList.remove('open');
        recapCongratsEl.classList.add('open');
        setTimeout(function() {
          recapCongratsEl.style.animation = 'congrats-fade 0.4s ease forwards';
          setTimeout(function() {
            recapCongratsEl.classList.remove('open');
            recapCongratsEl.style.animation = '';
            var refSec = document.querySelector('.reflections-section');
            if (refSec) refSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 400);
        }, 2200);
      }
    });

    recapBackBtn.addEventListener('click', function() {
      if (recapStep > 0) {
        saveRecapStep();
        rcStt.stop();
        recapStep--;
        renderRecapStep();
      }
    });

    recapCloseBtn.addEventListener('click', function() {
      saveRecapStep();
      rcStt.stop();
      recapModal.classList.remove('open');
    });
  })();
  </script>
</body>
</html>`;
}
