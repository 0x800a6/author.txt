/**
 * Example demonstrating the Author DSL Plugin System
 * 
 * @author Lexi
 * @version 1.0
 */

import { readFileSync } from 'fs';
import {
  parseAuthorDSL,
  parseAuthorDSLWithPlugins,
  validateParsedData,
  validateParsedDataWithPlugins,
  formatParsedData,
  PluginManager,
  DSLParseError
} from '../src/index.js';

import {
  JsonFormatterPlugin,
  YamlFormatterPlugin,
  MarkdownFormatterPlugin,
  SocialMediaTypePlugin,
  ColorTypePlugin,
  DataSanitizationPlugin
} from '../src/plugins/examples.js';

function main(): void {
  console.log('=== Author DSL Plugin System Demo ===\n');

  // Example author.txt content
  const input = `
# Author file example with plugins
Author-DSL: 1.0
Author: Lexi
Handle: 0x800a6
Alias: lexi, author, sysprog
Website@url: https://0x800a6.dev
Contact@email: mailto:lexi@example.com
Twitter@twitter: 0x800a6
GitHub@github: 0x800a6
FavoriteColor@color: #ff6b6b

Bio@multiline: """
Systems programmer.
Privacy advocate.
Inspired by Serial Experiments Lain.
"""

Begin Profile
    Skills: Assembly, Rust, C, TypeScript
    Motto: "Building the future, one line at a time"
    ThemeColor@color: blue
End Profile
`;

  try {
    // 1. Parse without plugins (original behavior)
    console.log('1. Parsing without plugins:');
    const basicData = parseAuthorDSL(input);
    console.log('Basic JSON:', JSON.stringify(basicData, null, 2));
    console.log('Basic validation:', validateParsedData(basicData));
    console.log();

    // 2. Parse with default plugins
    console.log('2. Parsing with default plugins:');
    const pluginData = parseAuthorDSLWithPlugins(input);
    console.log('Plugin JSON:', JSON.stringify(pluginData, null, 2));
    console.log('Plugin validation:', validateParsedDataWithPlugins(pluginData));
    console.log();

    // 3. Custom plugin manager with additional plugins
    console.log('3. Custom plugin manager:');
    const customManager = new PluginManager();
    
    // Register example plugins
    customManager.register(new JsonFormatterPlugin());
    customManager.register(new YamlFormatterPlugin());
    customManager.register(new MarkdownFormatterPlugin());
    customManager.register(new SocialMediaTypePlugin());
    customManager.register(new ColorTypePlugin());
    customManager.register(new DataSanitizationPlugin());

    const customData = parseAuthorDSL(input, customManager);
    console.log('Custom JSON:', JSON.stringify(customData, null, 2));
    console.log('Custom validation:', validateParsedData(customData, customManager));
    console.log();

    // 4. Demonstrate formatter plugins
    console.log('4. Available formatters:');
    const formats = customManager.getAvailableFormats();
    console.log('Formats:', formats);
    console.log();

    console.log('JSON format:');
    console.log(customManager.formatData(customData, 'json', { indent: 2 }));
    console.log();

    console.log('YAML format:');
    console.log(customManager.formatData(customData, 'yaml'));
    console.log();

    console.log('Markdown format:');
    console.log(customManager.formatData(customData, 'markdown'));
    console.log();

    // 5. Demonstrate plugin management
    console.log('5. Plugin management:');
    console.log('Registered plugins:', customManager.getAllPlugins().map(p => p.metadata.name));
    console.log('Is social-media plugin registered?', customManager.isRegistered('social-media'));
    console.log();

    // 6. Show original formatter for comparison
    console.log('6. Original formatter:');
    console.log(formatParsedData(customData));

  } catch (err) {
    console.error('Error:', err);
    if (err instanceof DSLParseError) {
      console.error('Parse error details:');
      console.error('- Line:', err.lineNumber);
      console.error('- Content:', err.line);
    }
    process.exit(1);
  }
}

// Run the demo
main();
