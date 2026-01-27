import logger from '../../../utils/logger';
import { ParsedLogEntry } from '../logs.types';

/**
 * Log parser service for nginx access.log, error.log, and modsecurity audit log
 */

/**
 * Parse nginx access log line (combined format)
 * Format: $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
 */
export function parseAccessLogLine(line: string, index: number, domain?: string): ParsedLogEntry | null {
  try {
    const regex = /^(\S+) - \S+ \[([^\]]+)\] "(\S+) (\S+) \S+" (\d+) \d+ "([^"]*)" "([^"]*)"/;
    const match = line.match(regex);

    if (!match) return null;

    const [, ip, timeStr, method, path, statusStr] = match;
    const statusCode = parseInt(statusStr);

    // Parse time
    // Format: 29/Mar/2025:14:35:22 +0700
    let timestamp = new Date().toISOString();

    const timeParts = timeStr.match(/(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+) ([+-]\d{4})/);
    if (timeParts) {
      const [, day, monthStr, year, hour, min, sec, offset] = timeParts;
      const months: { [key: string]: string } = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
      };
      const month = months[monthStr] || '01';

      // FIX: giữ nguyên offset, KHÔNG ép UTC
      timestamp = `${year}-${month}-${day.padStart(2, '0')}T${hour}:${min}:${sec}${offset}`;
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
      statusCode
    };
  } catch (error) {
    logger.warn(`Failed to parse access log line: ${line}`);
    return null;
  }
}

/**
 * Parse nginx error log line
 * Format: 2025/03/29 14:35:18 [error] 12345#12345: *1 connect() failed
 */
export function parseErrorLogLine(line: string, index: number): ParsedLogEntry | null {
  try {
    const regex = /^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\] \d+#\d+: (.+)$/;
    const match = line.match(regex);

    if (!match) return null;

    const [, timeStr, levelStr, fullMessageText] = match;

    // FIX: nginx error log KHÔNG có timezone → coi là local time
    const timestamp = new Date(
      timeStr.replace(/\//g, '-').replace(' ', 'T')
    ).toISOString();

    const levelMap: { [key: string]: 'info' | 'warning' | 'error' } = {
      debug: 'info',
      info: 'info',
      notice: 'info',
      warn: 'warning',
      error: 'error',
      crit: 'error',
      alert: 'error',
      emerg: 'error'
    };
    const level = levelMap[levelStr] || 'error';

    const ipMatch = fullMessageText.match(/client: ([\d.]+)/);
    const ip = ipMatch ? ipMatch[1] : undefined;

    if (fullMessageText.includes('ModSecurity:')) {
      return parseModSecLogLine(line, index);
    }

    return {
      id: `error_${Date.now()}_${index}`,
      timestamp,
      level,
      type: 'error',
      source: 'nginx',
      message: fullMessageText.substring(0, 500),
      fullMessage: fullMessageText,
      ip
    };
  } catch (error) {
    logger.warn(`Failed to parse error log line: ${line}`);
    return null;
  }
}

/**
 * Parse ModSecurity audit log line
 */
export function parseModSecLogLine(line: string, index: number): ParsedLogEntry | null {
  try {
    if (!line.includes('ModSecurity:')) return null;

    let timestamp = new Date().toISOString();

    // nginx error log format: 2025/10/24 06:22:01
    const nginxTimeMatch = line.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (nginxTimeMatch) {
      const [, year, month, day, hour, min, sec] = nginxTimeMatch;
      timestamp = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`).toISOString();
    } else {
      // ModSec audit log format: [29/Mar/2025:14:35:22]
      const auditTimeMatch = line.match(/\[(\d{2}\/\w{3}\/\d{4}:\d{2}:\d{2}:\d{2})/);
      if (auditTimeMatch) {
        const [, timeStr] = auditTimeMatch;
        const timeParts = timeStr.match(/(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+)/);
        if (timeParts) {
          const [, day, monthStr, year, hour, min, sec] = timeParts;
          const months: { [key: string]: string } = {
            Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
            Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
          };
          const month = months[monthStr] || '01';

          timestamp = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`).toISOString();
        }
      }
    }

    const ruleIdMatch = line.match(/\[id "([^"]+)"\]/);
    const ruleId = ruleIdMatch ? ruleIdMatch[1] : undefined;

    const msgMatch = line.match(/\[msg "([^"]+)"\]/);
    const message = msgMatch ? msgMatch[1] : 'ModSecurity Alert';

    const severityMatch = line.match(/\[severity "([^"]+)"\]/);
    const severity = severityMatch ? severityMatch[1] : undefined;

    const tagMatches = line.matchAll(/\[tag "([^"]+)"\]/g);
    const tags: string[] = [];
    for (const match of tagMatches) tags.push(match[1]);

    const clientIpMatch = line.match(/\[client ([\d.]+)(?::\d+)?\]/);
    const ip = clientIpMatch ? clientIpMatch[1] : undefined;

    const hostnameMatch = line.match(/\[hostname "([^"]+)"\]/);
    const hostname = hostnameMatch ? hostnameMatch[1] : undefined;

    const uriMatch = line.match(/\[uri "([^"]+)"\]/);
    const uri = uriMatch ? uriMatch[1] : undefined;

    const uniqueIdMatch = line.match(/\[unique_id "([^"]+)"\]/);
    const uniqueId = uniqueIdMatch ? uniqueIdMatch[1] : undefined;

    const fileMatch = line.match(/\[file "([^"]+)"\]/);
    const file = fileMatch ? fileMatch[1] : undefined;

    const lineMatch = line.match(/\[line "([^"]+)"\]/);
    const lineNumber = lineMatch ? lineMatch[1] : undefined;

    const dataMatch = line.match(/\[data "([^"]+)"\]/);
    const data = dataMatch ? dataMatch[1] : undefined;

    const methodMatch = line.match(/"(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS) ([^"]+)"/);
    const method = methodMatch ? methodMatch[1] : undefined;
    const path = methodMatch ? methodMatch[2] : uri;

    let level: 'info' | 'warning' | 'error' = 'warning';
    if (line.includes('Access denied') || line.includes('blocked')) level = 'error';

    const statusMatch = line.match(/with code (\d+)/);
    const statusCode = statusMatch ? parseInt(statusMatch[1]) : undefined;

    return {
      id: `modsec_${Date.now()}_${index}`,
      timestamp,
      level,
      type: 'error',
      source: 'modsecurity',
      message: `ModSecurity: ${message}`,
      fullMessage: line,
      ip,
      domain: hostname,
      hostname,
      method,
      path,
      statusCode,
      ruleId,
      severity,
      tags,
      uri,
      uniqueId,
      file,
      line: lineNumber,
      data
    };
  } catch (error) {
    logger.warn(`Failed to parse ModSecurity log line: ${line}`);
    return null;
  }
}
