# Author DSL Plugin System

The Author DSL Parser features a comprehensive plugin system that allows you to extend functionality in multiple ways. This document covers how to create, register, and use plugins.

## Plugin Types

### 1. Type Plugins
Handle custom value types with validation and processing.

```typescript
import { TypePlugin, PluginContext, PluginMetadata } from '@0x800a6/author-txt';

class CustomTypePlugin implements TypePlugin {
  metadata: PluginMetadata = {
    name: 'custom-type',
    version: '1.0.0',
    description: 'Custom type plugin example'
  };

  supportedTypes = ['custom'];

  processValue(value: string, type: string, context: PluginContext): any {
    // Process the value
    return { type, value: value.toUpperCase() };
  }

  validateValue?(value: any, type: string, context: PluginContext): string[] | null {
    // Validate the value
    if (value.length < 3) {
      return ['Value too short'];
    }
    return null;
  }
}
```

### 2. Validation Plugins
Add custom validation rules for parsed data.

```typescript
import { ValidationPlugin, PluginMetadata } from '@0x800a6/author-txt';

class CustomValidationPlugin implements ValidationPlugin {
  metadata: PluginMetadata = {
    name: 'custom-validation',
    version: '1.0.0',
    description: 'Custom validation rules'
  };

  validate(data: Record<string, any>): string[] {
    const warnings: string[] = [];
    
    // Add your validation logic
    if (!data.CustomField) {
      warnings.push('CustomField is required');
    }
    
    return warnings;
  }
}
```

### 3. Formatter Plugins
Create custom output formats.

```typescript
import { FormatterPlugin, PluginMetadata } from '@0x800a6/author-txt';

class CustomFormatterPlugin implements FormatterPlugin {
  metadata: PluginMetadata = {
    name: 'custom-formatter',
    version: '1.0.0',
    description: 'Custom output formatter'
  };

  supportedFormats = ['custom'];

  format(data: Record<string, any>, options: any = {}): string {
    // Format the data
    return `Custom format: ${JSON.stringify(data)}`;
  }
}
```

### 4. Parser Plugins
Hook into the parsing process at various stages.

```typescript
import { ParserPlugin, PluginContext, PluginMetadata } from '@0x800a6/author-txt';

class CustomParserPlugin implements ParserPlugin {
  metadata: PluginMetadata = {
    name: 'custom-parser',
    version: '1.0.0',
    description: 'Custom parser hooks'
  };

  beforeParse?(input: string): string {
    // Modify input before parsing
    return input.toUpperCase();
  }

  afterParse?(data: Record<string, any>): Record<string, any> {
    // Modify data after parsing
    return { ...data, processed: true };
  }

  onKeyValue?(key: string, value: any, context: PluginContext): { key: string; value: any } | null {
    // Transform key-value pairs
    if (key === 'SpecialKey') {
      return { key: 'TransformedKey', value: value.toUpperCase() };
    }
    return null;
  }

  onBlockStart?(blockName: string, context: PluginContext): void {
    // Handle block start events
    console.log(`Starting block: ${blockName}`);
  }

  onBlockEnd?(blockName: string, context: PluginContext): void {
    // Handle block end events
    console.log(`Ending block: ${blockName}`);
  }
}
```

## Using the Plugin System

### Basic Usage with Default Plugins

```typescript
import { parseAuthorDSLWithPlugins, validateParsedDataWithPlugins } from '@0x800a6/author-txt';

const input = `
Author: John Doe
Email@email: john@example.com
Website@url: https://example.com
`;

const data = parseAuthorDSLWithPlugins(input);
const warnings = validateParsedDataWithPlugins(data);
```

### Custom Plugin Manager

```typescript
import { 
  PluginManager, 
  parseAuthorDSL, 
  validateParsedData,
  UrlTypePlugin,
  EmailTypePlugin 
} from '@0x800a6/author-txt';

// Create plugin manager
const pluginManager = new PluginManager();

// Register plugins
pluginManager.register(new UrlTypePlugin());
pluginManager.register(new EmailTypePlugin());

// Parse with custom plugins
const data = parseAuthorDSL(input, pluginManager);
const warnings = validateParsedData(data, pluginManager);
```

### Using Formatter Plugins

```typescript
import { 
  PluginManager, 
  JsonFormatterPlugin, 
  YamlFormatterPlugin,
  MarkdownFormatterPlugin 
} from '@0x800a6/author-txt';

const pluginManager = new PluginManager();
pluginManager.register(new JsonFormatterPlugin());
pluginManager.register(new YamlFormatterPlugin());
pluginManager.register(new MarkdownFormatterPlugin());

// Get available formats
const formats = pluginManager.getAvailableFormats();
console.log(formats); // ['json', 'yaml', 'yml', 'markdown', 'md']

// Format data
const jsonOutput = pluginManager.formatData(data, 'json', { indent: 2 });
const yamlOutput = pluginManager.formatData(data, 'yaml');
const markdownOutput = pluginManager.formatData(data, 'markdown');
```

## Built-in Plugins

### Type Plugins
- **UrlTypePlugin**: Handles `@url` type with validation
- **EmailTypePlugin**: Handles `@email` type with validation
- **DateTypePlugin**: Handles `@date` type with timestamp conversion
- **PhoneTypePlugin**: Handles `@phone` type with formatting
- **GitHubTypePlugin**: Handles `@github` type with URL generation

### Validation Plugins
- **EnhancedValidationPlugin**: Additional validation rules
- **SecurityValidationPlugin**: Security-focused validation

### Formatter Plugins (Examples)
- **JsonFormatterPlugin**: JSON output format
- **YamlFormatterPlugin**: YAML output format
- **MarkdownFormatterPlugin**: Markdown output format

## Plugin Lifecycle

1. **Registration**: Plugin is registered with the PluginManager
2. **Initialization**: `initialize()` method is called if present
3. **Execution**: Plugin methods are called during parsing/validation/formatting
4. **Destruction**: `destroy()` method is called when plugin is unregistered

## Plugin Context

The `PluginContext` interface provides information about the current parsing state:

```typescript
interface PluginContext {
  lineNumber: number;    // Current line number
  line: string;          // Raw line content
  key: string;           // Current key being processed
  value: string;         // Current value being processed
  type: string | null;   // Type annotation if present
  data: Record<string, any>; // Current data object
}
```

## Error Handling

Plugin errors are wrapped in `PluginError` objects:

```typescript
interface PluginError extends Error {
  plugin: string;  // Plugin name that caused the error
  code: string;    // Error code
}
```

## Best Practices

1. **Plugin Naming**: Use descriptive, unique names for your plugins
2. **Error Handling**: Always handle errors gracefully in plugin methods
3. **Performance**: Keep plugin operations lightweight
4. **Compatibility**: Test plugins with different input formats
5. **Documentation**: Document your plugin's behavior and requirements

## Example: Complete Custom Plugin

```typescript
import { 
  TypePlugin, 
  ValidationPlugin, 
  PluginContext, 
  PluginMetadata 
} from '@0x800a6/author-txt';

class SocialMediaPlugin implements TypePlugin, ValidationPlugin {
  metadata: PluginMetadata = {
    name: 'social-media',
    version: '1.0.0',
    description: 'Social media platform support',
    author: 'Your Name'
  };

  supportedTypes = ['twitter', 'instagram', 'linkedin'];

  processValue(value: string, type: string, context: PluginContext): any {
    const cleanValue = value.replace(/^@/, '');
    const urlMap = {
      twitter: `https://twitter.com/${cleanValue}`,
      instagram: `https://instagram.com/${cleanValue}`,
      linkedin: `https://linkedin.com/in/${cleanValue}`
    };

    return {
      type,
      value: cleanValue,
      url: urlMap[type] || cleanValue
    };
  }

  validateValue(value: any, type: string, context: PluginContext): string[] | null {
    const warnings: string[] = [];
    const socialValue = typeof value === 'string' ? value : value?.value;
    
    if (socialValue && socialValue.length > 30) {
      warnings.push(`${type} username too long: ${socialValue}`);
    }
    
    return warnings.length > 0 ? warnings : null;
  }

  validate(data: Record<string, any>): string[] {
    const warnings: string[] = [];
    
    // Check for social media consistency
    const socialKeys = ['Twitter', 'Instagram', 'LinkedIn'];
    const hasSocial = socialKeys.some(key => data[key]);
    
    if (hasSocial && !data.Author) {
      warnings.push('Social media profiles found but no author name specified');
    }
    
    return warnings;
  }
}

// Usage
const pluginManager = new PluginManager();
pluginManager.register(new SocialMediaPlugin());

const input = `
Author: Jane Doe
Twitter@twitter: janedoe
Instagram@instagram: jane.doe
`;

const data = parseAuthorDSL(input, pluginManager);
const warnings = validateParsedData(data, pluginManager);
```

This plugin system provides a powerful and flexible way to extend the Author DSL Parser with custom functionality while maintaining backward compatibility and clean separation of concerns.
