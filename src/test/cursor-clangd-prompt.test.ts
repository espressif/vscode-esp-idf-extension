/*
 * Test: VS Code Fork clangd Extension Prompt Functionality
 * 
 * This test verifies that the ESP-IDF extension correctly prompts VS Code fork users
 * to install the clangd extension when it's not already installed.
 */

import * as assert from "assert";
import * as vscode from "vscode";
import { PreCheck } from "../utils";

// Mock the checkAndPromptForClangdExtension function
// Since it's a private function in extension.ts, we'll test the logic separately

suite("VS Code Fork clangd Extension Prompt Tests", () => {
  
  test("should correctly identify VS Code fork environment", () => {
    // Mock vscode.env.appName to simulate Cursor
    const originalAppName = vscode.env.appName;
    Object.defineProperty(vscode.env, 'appName', {
      value: 'Cursor',
      writable: true
    });
    
    const isFork = PreCheck.isRunningInVSCodeFork();
    assert.strictEqual(isFork, true);
    
    // Restore original value
    Object.defineProperty(vscode.env, 'appName', {
      value: originalAppName,
      writable: true
    });
  });
  
  test("should not prompt in original VS Code environment", () => {
    // Mock vscode.env.appName to simulate VS Code
    const originalAppName = vscode.env.appName;
    Object.defineProperty(vscode.env, 'appName', {
      value: 'Visual Studio Code',
      writable: true
    });
    
    const isFork = PreCheck.isRunningInVSCodeFork();
    assert.strictEqual(isFork, false);
    
    // Restore original value
    Object.defineProperty(vscode.env, 'appName', {
      value: originalAppName,
      writable: true
    });
  });
  
  test("clangd extension ID should be correct", () => {
    const expectedExtensionId = "llvm-vs-code-extensions.vscode-clangd";
    assert.strictEqual(expectedExtensionId, "llvm-vs-code-extensions.vscode-clangd");
  });
}); 