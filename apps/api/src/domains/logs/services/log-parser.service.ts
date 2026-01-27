import logger from '../../../utils/logger';
import { ParsedLogEntry } from '../logs.types';

/**
 * =========================
 * NGINX ACCESS LOG
 * =========================
 */
export function parseAccessLogLine(
  line: string,
  index: number,
  domain?: string
): ParsedLogEntry | null {
  try {
    const regex =
      /^(\S+) - \S+ \[([^\]]+)\] "(\S+) (\S+) \S+" (\d+) \d+ "([^"]*)" "([^"]*)"/;
    const match = line.match(regex);
    if (!match) return null;

    const [, ip, timeStr, method, path, statusStr] = match;
    const statusCode = parseInt(statusStr);

    let timestamp = new Date().toISOString();
    const timeParts = timeStr.match(
      /(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+) ([+-]\d+)/
    );

    if (timeParts) {
      const [, day, monthStr, year, hour, min, sec] = timeParts;
      const months: Record<string, string> = {
        Jan: '01',
        Feb: '02',
        Mar: '03',
        Apr: '04',
        May: '05',
        Jun: '06',
        Jul: '07',
        Aug: '08',
        Sep: '09',
        Oct: '10',
        Nov: '11',
        Dec: '12',
      };
      timestamp = `${year}-${months[monthStr]}-${day.padStart(
        2,
        '0'
      )}T${hour}:${min}:${sec}Z`;
    }

    let level: 'info' | 'warning' | 'error' = 'info';
    if (statusCode >= 500) level = 'error';
    else if (statusCode >= 400) level = 'warning';

    return {
      id: `access_${Date.now()}_${index}`,
      timestamp,
      level,
      type: 'access',
      source: 'nginx',
      message: `${method} ${path} ${statusCode}`,
      domain,
      ip,
      method,
      path,
      statusCode,
    };
  } catch (e) {
    logger.warn(`Access log parse failed: ${line}`);
    return null;
  }
}

/**
 * =========================
 * NGINX ERROR LOG
 * =========================
 */
export function parseErrorLogLine(
  line: string,
  index: number
): ParsedLogEntry | null {
  try {
    const regex =
      /^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\] \d+#\d+: (.+)$/;
    const match = line.match(regex);
    if (!match) return null;

    const [, timeStr, levelStr, message] = match;
    const timestamp = timeStr.replace(/\//g, '-').replace(' ', 'T') + 'Z';

    if (message.includes('ModSecurity:')) {
      return parseModSecLogLine(line, index);
    }

    const levelMap: Record<string, any> = {
      debug: 'info',
      info: 'info',
      warn: 'warning',
      error: 'error',
      crit: 'error',
      alert: 'error',
    };

    return {
      id: `error_${Date.now()}_${index}`,
      timestamp,
      level: levelMap[levelStr] || 'error',
      type: 'error',
      source: 'nginx',
      message,
      fullMessage: message,
    };
  } catch (e) {
    logger.warn(`Error log parse failed: ${line}`);
    return null;
  }
}

/**
 * =========================
 * MODSECURITY LOG
 * =========================
 */
export function parseModSecLogLine(
  line: string,
  index: number
): ParsedLogEntry | null {
  try {
    if (!line.includes('ModSecurity:')) return null;

    const timeMatch = line.match(
      /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})/
    );
    const timestamp = timeMatch
      ? `${timeMatch[1]}-${timeMatch[2]}-${timeMatch[3]}T${timeMatch[4]}:${timeMatch[5]}:${timeMatch[6]}Z`
      : new Date().toISOString();

    const ruleId = line.match(/\[id "([^"]+)"\]/)?.[1];
    const msg = line.match(/\[msg "([^"]+)"\]/)?.[1];
    const severity = line.match(/\[severity "([^"]+)"\]/)?.[1];
    const ip = line.match(/\[client ([\d.]+)\]/)?.[1];
    const hostname = line.match(/\[hostname "([^"]+)"\]/)?.[1];
    const uri = line.match(/\[uri "([^"]+)"\]/)?.[1];
    const uniqueId = line.match(/\[unique_id "([^"]+)"\]/)?.[1];

    const tags: string[] = [];
    for (const t of line.matchAll(/\[tag "([^"]+)"\]/g)) {
      tags.push(t[1]);
    }

    return {
      id: `modsec_${Date.now()}_${index}`,
      timestamp,
      level: 'error',
      type: 'security',
      source: 'modsecurity',
      message: `ModSecurity: ${msg}`,
      fullMessage: line,
      ip,
      domain: hostname,
      uri,
      ruleId,
      uniqueId,
      severity,
      tags,
    };
  } catch (e) {
    logger.warn(`ModSecurity parse failed`);
    return null;
  }
}

/**
 * =========================
 * CROWDSEC LOG (BAN)
 * =========================
 */
export function parseCrowdSecLogLine(line: string): ParsedCrowdSecLog | null {
  try {
    // chỉ parse log INFO ban
    if (!line.includes('level=info') || !line.includes(' ban on Ip ')) {
      return null;
    }

    const timeMatch = line.match(/time="([^"]+)"/);
    const ipMatch = line.match(/by ip ([\d.]+)/);
    const scenarioMatch = line.match(/\) ([^ ]+) by ip/);
    const durationMatch = line.match(/: ([0-9a-zA-Z]+) ban on Ip/);
    const countryAsMatch = line.match(/\((\w+)\/(\d+)\)/);

    if (!timeMatch || !ipMatch || !scenarioMatch || !durationMatch) {
      return null;
    }

    return {
      timestamp: timeMatch[1],
      ip: ipMatch[1],
      scenario: scenarioMatch[1],
      duration: durationMatch[1],
      country: countryAsMatch?.[1],
      asnumber: countryAsMatch?.[2],
    };
  } catch {
    return null;
  }
}
