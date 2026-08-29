import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { emailQueue } from '../queues/email.queue';

export const metricsRegistry = new Registry();

// Enable standard Node.js process and memory metrics
collectDefaultMetrics({ register: metricsRegistry });

// Custom Prometheus Counters
export const emailsScheduledTotal = new Counter({
  name: 'emails_scheduled_total',
  help: 'Total number of emails scheduled via API',
  registers: [metricsRegistry],
});

export const emailsSentTotal = new Counter({
  name: 'emails_sent_total',
  help: 'Total number of emails successfully sent via SMTP',
  registers: [metricsRegistry],
});

export const emailsFailedTotal = new Counter({
  name: 'emails_failed_total',
  help: 'Total number of emails permanently failed',
  registers: [metricsRegistry],
});

export const emailsRetriedTotal = new Counter({
  name: 'emails_retried_total',
  help: 'Total number of email delivery retry attempts',
  registers: [metricsRegistry],
});

export const emailsCancelledTotal = new Counter({
  name: 'emails_cancelled_total',
  help: 'Total number of scheduled emails cancelled',
  registers: [metricsRegistry],
});

export const emailsRateLimitedTotal = new Counter({
  name: 'emails_rate_limited_total',
  help: 'Total number of email delivery attempts throttled by hourly rate limiter',
  registers: [metricsRegistry],
});

// Custom Prometheus Histogram for email processing duration
export const emailProcessingDurationSeconds = new Histogram({
  name: 'email_processing_duration_seconds',
  help: 'Duration of email delivery processing in seconds',
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

// Gauges for BullMQ Queue status
export const emailQueueWaitingGauge = new Gauge({
  name: 'email_queue_waiting',
  help: 'Number of email jobs waiting in queue',
  registers: [metricsRegistry],
});

export const emailQueueActiveGauge = new Gauge({
  name: 'email_queue_active',
  help: 'Number of email jobs currently active in worker',
  registers: [metricsRegistry],
});

export const emailQueueDelayedGauge = new Gauge({
  name: 'email_queue_delayed',
  help: 'Number of email jobs delayed in queue',
  registers: [metricsRegistry],
});

// Safe Helper Functions (Error Isolated)
export function incrementEmailsScheduled() {
  try {
    emailsScheduledTotal.inc();
  } catch (err) {
    console.warn('[Metrics Warning] Failed to increment emailsScheduledTotal:', err);
  }
}

export function incrementEmailsSent() {
  try {
    emailsSentTotal.inc();
  } catch (err) {
    console.warn('[Metrics Warning] Failed to increment emailsSentTotal:', err);
  }
}

export function incrementEmailsFailed() {
  try {
    emailsFailedTotal.inc();
  } catch (err) {
    console.warn('[Metrics Warning] Failed to increment emailsFailedTotal:', err);
  }
}

export function incrementEmailsRetried() {
  try {
    emailsRetriedTotal.inc();
  } catch (err) {
    console.warn('[Metrics Warning] Failed to increment emailsRetriedTotal:', err);
  }
}

export function incrementEmailsCancelled() {
  try {
    emailsCancelledTotal.inc();
  } catch (err) {
    console.warn('[Metrics Warning] Failed to increment emailsCancelledTotal:', err);
  }
}

export function incrementEmailsRateLimited() {
  try {
    emailsRateLimitedTotal.inc();
  } catch (err) {
    console.warn('[Metrics Warning] Failed to increment emailsRateLimitedTotal:', err);
  }
}

export function startProcessingTimer() {
  try {
    return emailProcessingDurationSeconds.startTimer();
  } catch (err) {
    console.warn('[Metrics Warning] Failed to start processing timer:', err);
    return () => {};
  }
}

export async function updateQueueMetricsSafely() {
  try {
    const counts = await emailQueue.getJobCounts('waiting', 'active', 'delayed');
    emailQueueWaitingGauge.set(counts.waiting || 0);
    emailQueueActiveGauge.set(counts.active || 0);
    emailQueueDelayedGauge.set(counts.delayed || 0);
  } catch (err) {
    console.warn('[Metrics Warning] Failed to collect BullMQ queue counts:', err);
  }
}

export async function getMetricsText(): Promise<string> {
  await updateQueueMetricsSafely();
  return metricsRegistry.metrics();
}
