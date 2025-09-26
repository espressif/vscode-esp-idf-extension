/**
 * TypeScript interfaces for Unity test results
 */

export interface UnityTestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'IGNORE';
  message?: string;
  line?: number;
  duration?: number;
}

export interface IndividualTestResult {
  filePath: string;
  lineNumber: number;
  testName: string;
  status: 'PASS' | 'FAIL' | 'IGNORE';
  duration: number;
  message?: string;
  output: string;
}

export interface UnityTestSuite {
  name: string;
  tests: UnityTestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  ignoredTests: number;
  duration: number;
}

export interface UnityTestSummary {
  totalTests: number;
  totalFailures: number;
  totalIgnored: number;
  totalDuration: number;
}

export interface UnityParseResult {
  suites: UnityTestSuite[];
  summary: UnityTestSummary;
}

export interface SerialPortConfig {
  port: string;
  baudRate: number;
  timeout?: number;
}

export interface UnityParserOptions {
  port: string;
  baudRate?: number;
  timeout?: number;
  showOutput?: boolean;
}

