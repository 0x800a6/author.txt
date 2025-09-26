/**
 * Author DSL Parser v2.0 (TypeScript)
 * A robust parser for author configuration files with support for blocks, types, and multiline values.
 * Features a comprehensive plugin system for extensibility.
 * 
 * @author Lexi
 * @version 1.0
 */

import { PluginManager } from './plugins/manager.js';
import { PluginContext } from './plugins/types.js';
import { 
  UrlTypePlugin, 
  EmailTypePlugin, 
  DateTypePlugin, 
  PhoneTypePlugin, 
  GitHubTypePlugin,
  EnhancedValidationPlugin,
  SecurityValidationPlugin
} from './plugins/builtin.js';

class DSLParseError extends Error {
  lineNumber: number | null;
  line: string | null;

  constructor(message: string, lineNumber: number | null = null, line: string | null = null) {
    super(lineNumber ? `Line ${lineNumber}: ${message}` : message);
    this.name = 'DSLParseError';
    this.lineNumber = lineNumber;
    this.line = line;
  }
}

function validateInput(input: string): void {
  if (typeof input !== 'string') {
    throw new DSLParseError('Input must be a string');
  }
  if (input.trim().length === 0) {
    throw new DSLParseError('Input cannot be empty');
  }
}

function assignValue(obj: Record<string, any>, key: string, value: any): void {
  if (!obj[key]) {
    obj[key] = value;
  } else if (Array.isArray(obj[key])) {
    obj[key].push(value);
  } else {
    obj[key] = [obj[key], value];
  }
}

function parseKeyValue(line: string, lineNumber: number): { key: string; value: string; type: string | null } {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) {
    throw new DSLParseError(`Invalid line format - missing colon`, lineNumber, line);
  }

  let key = line.slice(0, colonIndex).trim();
  let value = line.slice(colonIndex + 1).trim();

  if (!key) {
    throw new DSLParseError(`Empty key not allowed`, lineNumber, line);
  }

  let type: string | null = null;
  if (key.includes("@")) {
    const parts = key.split("@");
    if (parts.length !== 2) {
      throw new DSLParseError(`Invalid type syntax - use Key@Type format`, lineNumber, line);
    }
    [key, type] = parts.map(s => s.trim());
    if (!type) {
      throw new DSLParseError(`Empty type not allowed`, lineNumber, line);
    }
  }

  return { key, value, type };
}

function processValue(value: string): string | string[] {
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }

  if (value.includes(",")) {
    return value.split(",").map(v => v.trim()).filter(v => v.length > 0);
  }

  return value;
}

function handleMultilineContent(line: string, multilineBuffer: string[]): boolean {
  if (line.trim().endsWith('"""')) {
    multilineBuffer.push(line.trim().slice(0, -3));
    return true;
  } else {
    multilineBuffer.push(line);
    return false;
  }
}

function handleBlockStart(
  line: string,
  lineNumber: number,
  stack: Array<Record<string, any>>,
  blockNames: string[]
): void {
  const name = line.replace(/^Begin\s+/i, "").trim();
  if (!name) {
    throw new DSLParseError(`Empty block name not allowed`, lineNumber, line);
  }

  const newBlock: Record<string, any> = {};
  const current = stack[stack.length - 1];
  if (!current[name]) current[name] = [];
  current[name].push(newBlock);
  stack.push(newBlock);
  blockNames.push(name);
}

function handleBlockEnd(
  line: string,
  lineNumber: number,
  stack: Array<Record<string, any>>,
  blockNames: string[]
): void {
  const name = line.replace(/^End\s+/i, "").trim();
  if (!name) {
    throw new DSLParseError(`Empty block name not allowed`, lineNumber, line);
  }

  if (blockNames.length === 0) {
    throw new DSLParseError(`No open blocks to close`, lineNumber, line);
  }

  const last = blockNames.pop();
  if (last !== name) {
    throw new DSLParseError(`Mismatched End: expected '${last}', got '${name}'`, lineNumber, line);
  }
  stack.pop();
}

function parseAuthorDSL(input: string, pluginManager?: PluginManager): Record<string, any> {
  validateInput(input);

  // Apply plugin preprocessing if plugin manager is provided
  let processedInput = input;
  if (pluginManager) {
    processedInput = pluginManager.beforeParse(input);
  }

  const lines = processedInput.split(/\r?\n/);
  const stack: Array<Record<string, any>> = [{}];
  const blockNames: string[] = [];
  let inMultiline = false;
  let multilineKey: string | null = null;
  let multilineBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    let rawLine = lines[i];
    let line = rawLine;

    if (inMultiline) {
      if (handleMultilineContent(line, multilineBuffer)) {
        const current = stack[stack.length - 1];
        assignValue(current, multilineKey as string, multilineBuffer.join("\n").trim());
        inMultiline = false;
        multilineKey = null;
        multilineBuffer = [];
      }
      continue;
    }

    line = line.trim();
    if (!line || line.startsWith("#")) continue;

    if (/^Begin\s+/i.test(line)) {
      const blockName = line.replace(/^Begin\s+/i, "").trim();
      if (pluginManager) {
        const context: PluginContext = {
          lineNumber,
          line: rawLine,
          key: '',
          value: '',
          type: null,
          data: stack[stack.length - 1]
        };
        pluginManager.onBlockStart(blockName, context);
      }
      handleBlockStart(line, lineNumber, stack, blockNames);
      continue;
    }

    if (/^End\s+/i.test(line)) {
      const blockName = line.replace(/^End\s+/i, "").trim();
      if (pluginManager) {
        const context: PluginContext = {
          lineNumber,
          line: rawLine,
          key: '',
          value: '',
          type: null,
          data: stack[stack.length - 1]
        };
        pluginManager.onBlockEnd(blockName, context);
      }
      handleBlockEnd(line, lineNumber, stack, blockNames);
      continue;
    }

    const { key, value, type } = parseKeyValue(line, lineNumber);

    if (value.startsWith('"""')) {
      inMultiline = true;
      multilineKey = key;
      multilineBuffer = [];
      const rest = value.slice(3);
      if (rest.length > 0) multilineBuffer.push(rest);
      continue;
    }

    let processedValue = processValue(value);
    const current = stack[stack.length - 1];

    // Apply plugin processing
    if (pluginManager) {
      const context: PluginContext = {
        lineNumber,
        line: rawLine,
        key,
        value: typeof processedValue === 'string' ? processedValue : value,
        type,
        data: current
      };

      // Process value through type plugins
      if (type) {
        processedValue = pluginManager.processValue(value, type, context);
      }

      // Apply parser plugins
      const pluginResult = pluginManager.onKeyValue(key, processedValue, context);
      if (pluginResult) {
        assignValue(current, pluginResult.key, pluginResult.value);
      } else {
        assignValue(current, key, processedValue);
      }
    } else {
      // Original behavior without plugins
      if (type) {
        assignValue(current, key, { type, value: processedValue });
      } else {
        assignValue(current, key, processedValue);
      }
    }
  }

  if (stack.length !== 1) {
    const openBlocks = blockNames.join(', ');
    throw new DSLParseError(`Unclosed block(s): ${openBlocks}`);
  }

  if (inMultiline) {
    throw new DSLParseError(`Unclosed multiline value for key: ${multilineKey}`);
  }

  let result = stack[0];

  // Apply plugin postprocessing if plugin manager is provided
  if (pluginManager) {
    result = pluginManager.afterParse(result);
  }

  return result;
}

function validateParsedData(data: Record<string, any>, pluginManager?: PluginManager): string[] {
  const warnings: string[] = [];

  // Basic validation (original behavior)
  if (!data.Author && !data.author) {
    warnings.push('Warning: No author name specified');
  }

  const keys = Object.keys(data);
  const lowerKeys = keys.map(k => k.toLowerCase());
  const duplicates = lowerKeys.filter((key, index) => lowerKeys.indexOf(key) !== index);
  if (duplicates.length > 0) {
    warnings.push(`Warning: Potential duplicate keys (case-insensitive): ${duplicates.join(', ')}`);
  }

  // Apply plugin validation if plugin manager is provided
  if (pluginManager) {
    const pluginWarnings = pluginManager.validateData(data);
    warnings.push(...pluginWarnings);
  }

  return warnings;
}

function getValueByKey(data: Record<string, any>, key: string): any {
  const lowerKey = key.toLowerCase();
  for (const [k, v] of Object.entries(data)) {
    if (k.toLowerCase() === lowerKey) {
      return v;
    }
  }
  return undefined;
}

function formatParsedData(data: Record<string, any>, indent: number = 0): string {
  const spaces = '  '.repeat(indent);
  let result = '';

  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      result += `${spaces}${key}:\n`;
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          result += `${spaces}  [${index}]:\n${formatParsedData(item, indent + 2)}`;
        } else {
          result += `${spaces}  [${index}]: ${item}\n`;
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      result += `${spaces}${key}:\n${formatParsedData(value, indent + 1)}`;
    } else {
      result += `${spaces}${key}: ${value}\n`;
    }
  }

  return result;
}

/**
 * Create a default plugin manager with built-in plugins
 */
function createDefaultPluginManager(): PluginManager {
  const manager = new PluginManager();
  
  // Register built-in type plugins
  manager.register(new UrlTypePlugin());
  manager.register(new EmailTypePlugin());
  manager.register(new DateTypePlugin());
  manager.register(new PhoneTypePlugin());
  manager.register(new GitHubTypePlugin());
  
  // Register built-in validation plugins
  manager.register(new EnhancedValidationPlugin());
  manager.register(new SecurityValidationPlugin());
  
  return manager;
}

/**
 * Parse Author DSL with default plugins
 */
function parseAuthorDSLWithPlugins(input: string): Record<string, any> {
  const pluginManager = createDefaultPluginManager();
  return parseAuthorDSL(input, pluginManager);
}

/**
 * Validate parsed data with default plugins
 */
function validateParsedDataWithPlugins(data: Record<string, any>): string[] {
  const pluginManager = createDefaultPluginManager();
  return validateParsedData(data, pluginManager);
}

// Export all functions and classes
export {
  DSLParseError,
  parseAuthorDSL,
  parseAuthorDSLWithPlugins,
  validateParsedData,
  validateParsedDataWithPlugins,
  getValueByKey,
  formatParsedData,
  createDefaultPluginManager,
  PluginManager
};

// Re-export plugin types and built-in plugins
export * from './plugins/types.js';
export * from './plugins/manager.js';
export * from './plugins/builtin.js';
export * from './plugins/examples.js';
