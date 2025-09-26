# Author DSL Parser

The Author DSL parser reads and validates `author.txt` files. It turns them into a clean abstract syntax tree (AST) for use in scripts, websites, or applications. The format is designed for author profiles and metadata. It supports blocks, typed keys, lists, and multiline values.

Full specification: [Author DSL Specification](https://0x800a6.dev/specs/author_txt)

## Specification

- File name: `author.txt`
- Location: `/author.txt` or `/.well-known/author.txt`
- Purpose: Provide machine-readable metadata about authors or maintainers.

The DSL is line-oriented. Each line is a statement, block, or comment.

### Syntax Rules

- **Comments**: Lines starting with `#` are ignored.  
- **Statements**: `Key: Value` pairs.  
- **Typed keys**: `Key@type: Value`. Common types include `url`, `email`, `date`, and `multiline`.  
- **Blocks**: Begin with `Begin Name` and end with `End Name`.  
- **Lists**: Repeated keys or comma-separated values.  
- **Multiline values**: Use triple quotes `"""` to span multiple lines.  
- **Includes**: `Include: <path>` to reference another file.  

### Reserved Keys

- `Author-DSL` – DSL version  
- `Include` – references another file  
- `Expires` – expiration date  
- `PublicKey` / `Fingerprint` – optional identity proof  

## Example

```
# Author file example
Author-DSL: 1.0
Author: Lexi
Handle: 0x800a6
Alias: lexi, author, sysprog
Website@url: https://0x800a6.dev
Contact@email: mailto:lexi@example.com

Bio@multiline: """
Systems programmer.
Privacy advocate.
Inspired by Serial Experiments Lain.
"""

Begin Profile
    Skills: Assembly, Rust, C, TypeScript
    Motto: "Building the future, one line at a time"
End Profile

Include: https://0x800a6.dev/more-links.txt
```

## AST Example

```
{
  "Author": "Lexi",
  "Handle": "0x800a6",
  "Alias": ["lexi", "author", "sysprog"],
  "Website": { "type": "url", "value": "https://0x800a6.dev" },
  "Bio": "Systems programmer.\nPrivacy advocate.\nInspired by Serial Experiments Lain.",
  "Profile": [
    { "Skills": ["Assembly", "Rust", "C", "TypeScript"], "Motto": "Building the future, one line at a time" }
  ]
}
```

## Installation

```bash
npm install @0x800a6/author-txt
```

or clone directly:

```bash
git clone https://github.com/0x800a6/author.txt.git
cd author.txt
```

## Usage

### Basic Usage

```typescript
import { readFileSync } from "fs";
import {
  parseAuthorDSL,
  formatParsedData,
  validateParsedData,
} from "@0x800a6/author-txt";

function main(): void {
  const inputPath = "author.txt";
  let input: string;

  try {
    input = readFileSync(inputPath, "utf-8");
  } catch (err) {
    console.error(`Failed to read file: ${inputPath}`);
    if (err instanceof Error) {
      console.error(err.message);
    }
    process.exit(1);
    return;
  }

  try {
    const data = parseAuthorDSL(input);
    console.log("Parsed JSON:", JSON.stringify(data, null, 2));
    console.log("Formatted:\n", formatParsedData(data));

    const warnings: string[] = validateParsedData(data);
    if (warnings.length > 0) {
      console.warn("Validation warnings:");
      for (const warning of warnings) {
        console.warn(`- ${warning}`);
      }
    }
  } catch (err) {
    console.error("Parsing failed.");
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error("Unknown error:", err);
    }
    process.exit(1);
  }
}

main();
```

### Using the Plugin System

```typescript
import { 
  parseAuthorDSLWithPlugins, 
  validateParsedDataWithPlugins,
  PluginManager,
  JsonFormatterPlugin,
  YamlFormatterPlugin 
} from "@0x800a6/author-txt";

// Use with default plugins
const data = parseAuthorDSLWithPlugins(input);
const warnings = validateParsedDataWithPlugins(data);

// Or create custom plugin manager
const pluginManager = new PluginManager();
pluginManager.register(new JsonFormatterPlugin());
pluginManager.register(new YamlFormatterPlugin());

// Get available output formats
const formats = pluginManager.getAvailableFormats();
console.log('Available formats:', formats); // ['json', 'yaml', 'yml']

// Format data
const jsonOutput = pluginManager.formatData(data, 'json', { indent: 2 });
const yamlOutput = pluginManager.formatData(data, 'yaml');
```

## Errors

The parser reports descriptive errors with line numbers. It will throw when:

- Blocks are unclosed or mismatched
- Multiline values are not closed
- Keys or types are invalid
- Keys or values are empty


## Plugin System

The Author DSL Parser includes a comprehensive plugin system for extensibility:

### Plugin Types

- **Type Plugins**: Handle custom value types (`@phone`, `@github`, `@color`)
- **Validation Plugins**: Add custom validation rules
- **Formatter Plugins**: Create custom output formats (JSON, YAML, Markdown)
- **Parser Plugins**: Hook into the parsing process

### Built-in Plugins

- **Type Plugins**: `@url`, `@email`, `@date`, `@phone`, `@github`
- **Validation Plugins**: Enhanced validation, security checks
- **Formatter Plugins**: JSON, YAML, Markdown output

### Creating Custom Plugins

```typescript
import { TypePlugin, PluginContext, PluginMetadata } from '@0x800a6/author-txt';

class CustomTypePlugin implements TypePlugin {
  metadata: PluginMetadata = {
    name: 'custom-type',
    version: '1.0.0',
    description: 'Custom type plugin'
  };

  supportedTypes = ['custom'];

  processValue(value: string, type: string, context: PluginContext): any {
    return { type, value: value.toUpperCase() };
  }
}

// Register and use
const pluginManager = new PluginManager();
pluginManager.register(new CustomTypePlugin());
const data = parseAuthorDSL(input, pluginManager);
```

See [Plugin System Documentation](docs/plugin-system.md) for complete details.

## Extensibility

The DSL can grow without breaking existing files. You can:

- Add new types (`@phone`, `@github`, `@color`)
- Add new blocks for projects, skills, or social profiles
- Add attributes to keys (`Social::Handle{preferred=main}`)
- Create custom plugins for any aspect of parsing, validation, or formatting

Parsers should ignore unknown keys to stay forward-compatible.

## License

MIT License. See [LICENSE](LICENSE).