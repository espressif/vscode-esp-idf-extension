/**
 * Unity Test Output Parser
 * Parses Unity test framework output and converts to structured data
 */

import { IndividualTestResult } from './types';

export class UnityParser {
  
  // Patterns for individual test parsing
  private individualTestStartPattern = /Running\s+(.+?)\s*\.\.\./;
  private individualTestResultPattern = /^(.+):(\d+):(.+?):(PASS|FAIL|IGNORE)(?:[:]\s*(.+))?$/;
  private individualTestDurationPattern = /Test ran in\s+(\d+)(?:ms|s)/;

  /**
   * Parse individual test result from a single test run
   * Expects format like:
   * Running Mean of an empty array is zero...
   * /path/to/file.c:16:Mean of an empty array is zero:PASS
   * Test ran in 17ms
   */
  parseIndividualTest(lines: string[]): IndividualTestResult | null {
    let testName = '';
    let filePath = '';
    let lineNumber = 0;
    let status: 'PASS' | 'FAIL' | 'IGNORE' = 'PASS';
    let duration = 0;
    let message = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Check for test start
      const startMatch = this.individualTestStartPattern.exec(trimmedLine);
      if (startMatch) {
        testName = startMatch[1];
        continue;
      }

      // Check for test result line
      const resultMatch = this.individualTestResultPattern.exec(trimmedLine);
      if (resultMatch) {
        filePath = resultMatch[1];
        lineNumber = parseInt(resultMatch[2], 10);
        const resultTestName = resultMatch[3];
        status = resultMatch[4] as 'PASS' | 'FAIL' | 'IGNORE';
        message = resultMatch[5] || '';
        continue;
      }

      // Check for duration
      const durationMatch = this.individualTestDurationPattern.exec(trimmedLine);
      if (durationMatch) {
        const durationValue = parseInt(durationMatch[1], 10);
        // Keep in milliseconds
        duration = durationValue;
        continue;
      }
    }

    // Return result if we have the essential information
    if (filePath && testName && status) {
      return {
        filePath,
        lineNumber,
        testName,
        status,
        duration,
        message: message || undefined,
        output: lines.slice(1).join('\r\n')
      };
    }

    return null;
  }

  /**
   * Parse multiple individual test results from output
   */
  parseIndividualTests(lines: string[]): IndividualTestResult[] {
    const results: IndividualTestResult[] = [];
    let currentTestLines: string[] = [];
    let inTest = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if we're starting a new test
      if (this.individualTestStartPattern.test(trimmedLine)) {
        // If we were already in a test, parse the previous one
        if (inTest && currentTestLines.length > 0) {
          const result = this.parseIndividualTest(currentTestLines);
          if (result) {
            results.push(result);
          }
        }
        // Start new test
        currentTestLines = [line];
        inTest = true;
        continue;
      }

      // If we're in a test, collect lines until we hit a separator or end
      if (inTest) {
        if (trimmedLine === '-----------------------' || trimmedLine === '') {
          // End of test, parse it
          const result = this.parseIndividualTest(currentTestLines);
          if (result) {
            results.push(result);
          }
          currentTestLines = [];
          inTest = false;
        } else {
          currentTestLines.push(line);
        }
      }
    }

    // Parse the last test if we were still in one
    if (inTest && currentTestLines.length > 0) {
      const result = this.parseIndividualTest(currentTestLines);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }
}

