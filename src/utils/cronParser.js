/**
 * Extended CRON parser that supports seconds
 * Format: second minute hour day month dayOfWeek
 * Example: "31 10-15 1 * * MON-FRI"
 */
export class CronParser {
  /**
   * Parse CRON expression with seconds
   * @param {string} cronExpr - CRON expression
   * @returns {Object} Parsed cron fields
   */
  static parse(cronExpr) {
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length !== 6) {
      throw new Error('Invalid CRON expression. Expected format: second minute hour day month dayOfWeek');
    }

    return {
      second: this.parseField(parts[0], 0, 59, true), // Allow wildcard for step patterns
      minute: this.parseField(parts[1], 0, 59, true),
      hour: this.parseField(parts[2], 0, 23, true),
      day: this.parseField(parts[3], 1, 31, true), // true for wildcard
      month: this.parseField(parts[4], 1, 12, true),
      dayOfWeek: this.parseDayOfWeek(parts[5])
    };
  }

  /**
   * Parse a single CRON field
   */
  static parseField(field, min, max, allowWildcard = false) {
    // Handle wildcard (any value)
    if (field === '*') {
      if (allowWildcard) {
        return { type: 'any', values: [] };
      } else {
        // For fields that don't allow wildcard, treat * as "any" for step patterns
        // This allows */10 to work for seconds, minutes, hours
        return { type: 'any', values: [] };
      }
    }

    // Handle step patterns (e.g., */10, 5/15)
    if (field.includes('/')) {
      const [base, step] = field.split('/');
      const stepValue = parseInt(step);
      if (isNaN(stepValue) || stepValue <= 0) {
        throw new Error(`Invalid step value: ${step}`);
      }
      
      if (base === '*') {
        // */step means every step from min to max
        const values = [];
        for (let i = min; i <= max; i += stepValue) {
          values.push(i);
        }
        return { type: 'step', values };
      } else {
        // base/step means every step from base to max
        const baseValue = parseInt(base);
        if (isNaN(baseValue) || baseValue < min || baseValue > max) {
          throw new Error(`Invalid base value: ${base}`);
        }
        const values = [];
        for (let i = baseValue; i <= max; i += stepValue) {
          values.push(i);
        }
        return { type: 'step', values };
      }
    }

    // Handle lists (comma-separated)
    if (field.includes(',')) {
      const values = field.split(',').map(v => {
        const parsed = this.parseField(v.trim(), min, max, allowWildcard);
        return parsed.values;
      });
      return { type: 'list', values: values.flat() };
    }

    // Handle ranges (e.g., 10-15)
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(v => parseInt(v));
      if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
        throw new Error(`Invalid range: ${field}`);
      }
      return { type: 'range', values: Array.from({ length: end - start + 1 }, (_, i) => start + i) };
    }

    // Handle single value
    const value = parseInt(field);
    if (isNaN(value) || value < min || value > max) {
      throw new Error(`Invalid value: ${field}`);
    }
    return { type: 'value', values: [value] };
  }

  /**
   * Parse day of week field (MON-FRI, MON, etc.)
   */
  static parseDayOfWeek(field) {
    const dayMap = {
      'SUN': 0, 'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6,
      '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6
    };

    if (field === '*') {
      return { type: 'any', values: [] };
    }

    if (field.includes('-')) {
      const [start, end] = field.split('-').map(d => d.trim().toUpperCase());
      const startVal = dayMap[start];
      const endVal = dayMap[end];
      if (startVal === undefined || endVal === undefined) {
        throw new Error(`Invalid day range: ${field}`);
      }
      const values = [];
      for (let i = startVal; i <= endVal; i++) {
        values.push(i);
      }
      return { type: 'range', values };
    }

    if (field.includes(',')) {
      const values = field.split(',').map(d => {
        const val = dayMap[d.trim().toUpperCase()];
        if (val === undefined) throw new Error(`Invalid day: ${d}`);
        return val;
      });
      return { type: 'list', values };
    }

    const value = dayMap[field.toUpperCase()];
    if (value === undefined) {
      throw new Error(`Invalid day: ${field}`);
    }
    return { type: 'value', values: [value] };
  }

  /**
   * Check if a given date matches the CRON expression
   */
  static matches(cronFields, date) {
    const second = date.getSeconds();
    const minute = date.getMinutes();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1; // 1-12
    const dayOfWeek = date.getDay();

    return (
      this.fieldMatches(cronFields.second, second) &&
      this.fieldMatches(cronFields.minute, minute) &&
      this.fieldMatches(cronFields.hour, hour) &&
      this.fieldMatches(cronFields.day, day) &&
      this.fieldMatches(cronFields.month, month) &&
      this.fieldMatches(cronFields.dayOfWeek, dayOfWeek)
    );
  }

  /**
   * Check if a value matches a field
   */
  static fieldMatches(field, value) {
    if (field.type === 'any') return true;
    if (field.type === 'value') return field.values.includes(value);
    if (field.type === 'range' || field.type === 'list') return field.values.includes(value);
    if (field.type === 'step') return field.values.includes(value);
    return false;
  }

  /**
   * Get next execution time from a given date
   */
  static getNextExecution(cronFields, fromDate = new Date()) {
    let current = new Date(fromDate);
    current.setMilliseconds(0);

    // Try up to 1 year ahead
    for (let attempts = 0; attempts < 365 * 24 * 60 * 60; attempts++) {
      current.setSeconds(current.getSeconds() + 1);

      if (this.matches(cronFields, current)) {
        return new Date(current);
      }
    }

    throw new Error('Could not find next execution time');
  }
}

