/**
 * Plugin system interfaces and types for Author DSL Parser
 * 
 * @author Lexi
 * @version 1.0
 */

export interface PluginContext {
  lineNumber: number;
  line: string;
  key: string;
  value: string;
  type: string | null;
  data: Record<string, any>;
}

export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  homepage?: string;
}

export interface BasePlugin {
  metadata: PluginMetadata;
  initialize?(): void | Promise<void>;
  destroy?(): void | Promise<void>;
}

export interface TypePlugin extends BasePlugin {
  supportedTypes: string[];
  processValue(value: string, type: string, context: PluginContext): any;
  validateValue?(value: any, type: string, context: PluginContext): string[] | null;
}

export interface ValidationPlugin extends BasePlugin {
  validate(data: Record<string, any>): string[];
}

export interface FormatterPlugin extends BasePlugin {
  format(data: Record<string, any>, options?: any): string;
  supportedFormats: string[];
}

export interface ParserPlugin extends BasePlugin {
  beforeParse?(input: string): string;
  afterParse?(data: Record<string, any>): Record<string, any>;
  onKeyValue?(key: string, value: any, context: PluginContext): { key: string; value: any } | null;
  onBlockStart?(blockName: string, context: PluginContext): void;
  onBlockEnd?(blockName: string, context: PluginContext): void;
}

export interface PluginError extends Error {
  plugin: string;
  code: string;
}

export type Plugin = TypePlugin | ValidationPlugin | FormatterPlugin | ParserPlugin;

export interface PluginOptions {
  enabled?: boolean;
  priority?: number;
  config?: Record<string, any>;
}
