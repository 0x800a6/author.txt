/**
 * Plugin Manager for Author DSL Parser
 * Handles registration, lifecycle, and execution of plugins
 * 
 * @author Lexi
 * @version 1.0
 */

import { 
  Plugin, 
  PluginContext, 
  PluginError, 
  PluginOptions, 
  TypePlugin, 
  ValidationPlugin, 
  FormatterPlugin, 
  ParserPlugin 
} from './types.js';

export class PluginManager {
  private plugins: Map<string, { plugin: Plugin; options: PluginOptions }> = new Map();
  private typePlugins: Map<string, TypePlugin> = new Map();
  private validationPlugins: ValidationPlugin[] = [];
  private formatterPlugins: FormatterPlugin[] = [];
  private parserPlugins: ParserPlugin[] = [];

  /**
   * Register a plugin with the manager
   */
  register(plugin: Plugin, options: PluginOptions = {}): void {
    const defaultOptions: PluginOptions = {
      enabled: true,
      priority: 0,
      config: {},
      ...options
    };

    this.plugins.set(plugin.metadata.name, { plugin, options: defaultOptions });

    // Categorize plugin by type
    if (this.isTypePlugin(plugin)) {
      this.registerTypePlugin(plugin);
    }
    if (this.isValidationPlugin(plugin)) {
      this.registerValidationPlugin(plugin);
    }
    if (this.isFormatterPlugin(plugin)) {
      this.registerFormatterPlugin(plugin);
    }
    if (this.isParserPlugin(plugin)) {
      this.registerParserPlugin(plugin);
    }

    // Initialize plugin if it has an initialize method
    if (plugin.initialize) {
      try {
        plugin.initialize();
      } catch (error) {
        throw this.createPluginError(plugin.metadata.name, 'INIT_FAILED', error);
      }
    }
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginName: string): void {
    const pluginEntry = this.plugins.get(pluginName);
    if (!pluginEntry) {
      return;
    }

    const { plugin } = pluginEntry;

    // Clean up plugin from categories
    if (this.isTypePlugin(plugin)) {
      this.unregisterTypePlugin(plugin);
    }
    if (this.isValidationPlugin(plugin)) {
      this.unregisterValidationPlugin(plugin);
    }
    if (this.isFormatterPlugin(plugin)) {
      this.unregisterFormatterPlugin(plugin);
    }
    if (this.isParserPlugin(plugin)) {
      this.unregisterParserPlugin(plugin);
    }

    // Destroy plugin if it has a destroy method
    if (plugin.destroy) {
      try {
        plugin.destroy();
      } catch (error) {
        console.warn(`Error destroying plugin ${pluginName}:`, error);
      }
    }

    this.plugins.delete(pluginName);
  }

  /**
   * Get a plugin by name
   */
  getPlugin(pluginName: string): Plugin | undefined {
    return this.plugins.get(pluginName)?.plugin;
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values()).map(entry => entry.plugin);
  }

  /**
   * Check if a plugin is registered
   */
  isRegistered(pluginName: string): boolean {
    return this.plugins.has(pluginName);
  }

  /**
   * Process a value using type plugins
   */
  processValue(value: string, type: string | null, context: PluginContext): any {
    if (!type) {
      return value;
    }

    const plugin = this.typePlugins.get(type);
    if (!plugin) {
      return value;
    }

    try {
      return plugin.processValue(value, type, context);
    } catch (error) {
      throw this.createPluginError(plugin.metadata.name, 'PROCESS_VALUE_FAILED', error);
    }
  }

  /**
   * Validate a value using type plugins
   */
  validateValue(value: any, type: string, context: PluginContext): string[] {
    const plugin = this.typePlugins.get(type);
    if (!plugin || !plugin.validateValue) {
      return [];
    }

    try {
      return plugin.validateValue(value, type, context) || [];
    } catch (error) {
      throw this.createPluginError(plugin.metadata.name, 'VALIDATE_VALUE_FAILED', error);
    }
  }

  /**
   * Run all validation plugins
   */
  validateData(data: Record<string, any>): string[] {
    const allWarnings: string[] = [];

    for (const plugin of this.validationPlugins) {
      try {
        const warnings = plugin.validate(data);
        allWarnings.push(...warnings);
      } catch (error) {
        throw this.createPluginError(plugin.metadata.name, 'VALIDATE_DATA_FAILED', error);
      }
    }

    return allWarnings;
  }

  /**
   * Format data using formatter plugins
   */
  formatData(data: Record<string, any>, format: string, options?: any): string {
    const plugin = this.formatterPlugins.find(p => p.supportedFormats.includes(format));
    if (!plugin) {
      throw new Error(`No formatter plugin found for format: ${format}`);
    }

    try {
      return plugin.format(data, options);
    } catch (error) {
      throw this.createPluginError(plugin.metadata.name, 'FORMAT_FAILED', error);
    }
  }

  /**
   * Get available formatter formats
   */
  getAvailableFormats(): string[] {
    const formats = new Set<string>();
    for (const plugin of this.formatterPlugins) {
      plugin.supportedFormats.forEach(format => formats.add(format));
    }
    return Array.from(formats);
  }

  /**
   * Execute parser plugins before parsing
   */
  beforeParse(input: string): string {
    let processedInput = input;
    
    for (const plugin of this.parserPlugins) {
      if (plugin.beforeParse) {
        try {
          processedInput = plugin.beforeParse(processedInput);
        } catch (error) {
          throw this.createPluginError(plugin.metadata.name, 'BEFORE_PARSE_FAILED', error);
        }
      }
    }
    
    return processedInput;
  }

  /**
   * Execute parser plugins after parsing
   */
  afterParse(data: Record<string, any>): Record<string, any> {
    let processedData = data;
    
    for (const plugin of this.parserPlugins) {
      if (plugin.afterParse) {
        try {
          processedData = plugin.afterParse(processedData);
        } catch (error) {
          throw this.createPluginError(plugin.metadata.name, 'AFTER_PARSE_FAILED', error);
        }
      }
    }
    
    return processedData;
  }

  /**
   * Execute parser plugins on key-value processing
   */
  onKeyValue(key: string, value: any, context: PluginContext): { key: string; value: any } {
    let result = { key, value };
    
    for (const plugin of this.parserPlugins) {
      if (plugin.onKeyValue) {
        try {
          const pluginResult = plugin.onKeyValue(result.key, result.value, context);
          if (pluginResult) {
            result = pluginResult;
          }
        } catch (error) {
          throw this.createPluginError(plugin.metadata.name, 'ON_KEY_VALUE_FAILED', error);
        }
      }
    }
    
    return result;
  }

  /**
   * Execute parser plugins on block start
   */
  onBlockStart(blockName: string, context: PluginContext): void {
    for (const plugin of this.parserPlugins) {
      if (plugin.onBlockStart) {
        try {
          plugin.onBlockStart(blockName, context);
        } catch (error) {
          throw this.createPluginError(plugin.metadata.name, 'ON_BLOCK_START_FAILED', error);
        }
      }
    }
  }

  /**
   * Execute parser plugins on block end
   */
  onBlockEnd(blockName: string, context: PluginContext): void {
    for (const plugin of this.parserPlugins) {
      if (plugin.onBlockEnd) {
        try {
          plugin.onBlockEnd(blockName, context);
        } catch (error) {
          throw this.createPluginError(plugin.metadata.name, 'ON_BLOCK_END_FAILED', error);
        }
      }
    }
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    const pluginNames = Array.from(this.plugins.keys());
    for (const name of pluginNames) {
      this.unregister(name);
    }
  }

  // Private helper methods
  private isTypePlugin(plugin: Plugin): plugin is TypePlugin {
    return 'supportedTypes' in plugin && 'processValue' in plugin;
  }

  private isValidationPlugin(plugin: Plugin): plugin is ValidationPlugin {
    return 'validate' in plugin;
  }

  private isFormatterPlugin(plugin: Plugin): plugin is FormatterPlugin {
    return 'format' in plugin && 'supportedFormats' in plugin;
  }

  private isParserPlugin(plugin: Plugin): plugin is ParserPlugin {
    return 'beforeParse' in plugin || 'afterParse' in plugin || 'onKeyValue' in plugin || 
           'onBlockStart' in plugin || 'onBlockEnd' in plugin;
  }

  private registerTypePlugin(plugin: TypePlugin): void {
    for (const type of plugin.supportedTypes) {
      this.typePlugins.set(type, plugin);
    }
  }

  private unregisterTypePlugin(plugin: TypePlugin): void {
    for (const type of plugin.supportedTypes) {
      this.typePlugins.delete(type);
    }
  }

  private registerValidationPlugin(plugin: ValidationPlugin): void {
    this.validationPlugins.push(plugin);
    // Sort by priority (higher priority first)
    this.validationPlugins.sort((a, b) => {
      const aPriority = this.plugins.get(a.metadata.name)?.options.priority || 0;
      const bPriority = this.plugins.get(b.metadata.name)?.options.priority || 0;
      return bPriority - aPriority;
    });
  }

  private unregisterValidationPlugin(plugin: ValidationPlugin): void {
    const index = this.validationPlugins.indexOf(plugin);
    if (index > -1) {
      this.validationPlugins.splice(index, 1);
    }
  }

  private registerFormatterPlugin(plugin: FormatterPlugin): void {
    this.formatterPlugins.push(plugin);
  }

  private unregisterFormatterPlugin(plugin: FormatterPlugin): void {
    const index = this.formatterPlugins.indexOf(plugin);
    if (index > -1) {
      this.formatterPlugins.splice(index, 1);
    }
  }

  private registerParserPlugin(plugin: ParserPlugin): void {
    this.parserPlugins.push(plugin);
    // Sort by priority (higher priority first)
    this.parserPlugins.sort((a, b) => {
      const aPriority = this.plugins.get(a.metadata.name)?.options.priority || 0;
      const bPriority = this.plugins.get(b.metadata.name)?.options.priority || 0;
      return bPriority - aPriority;
    });
  }

  private unregisterParserPlugin(plugin: ParserPlugin): void {
    const index = this.parserPlugins.indexOf(plugin);
    if (index > -1) {
      this.parserPlugins.splice(index, 1);
    }
  }

  private createPluginError(pluginName: string, code: string, originalError: any): PluginError {
    const error = new Error(`Plugin ${pluginName} error: ${originalError?.message || 'Unknown error'}`) as PluginError;
    error.plugin = pluginName;
    error.code = code;
    return error;
  }
}
