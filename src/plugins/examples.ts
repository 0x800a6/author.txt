/**
 * Example plugins demonstrating the plugin system capabilities
 * 
 * @author Lexi
 * @version 1.0
 */

import { 
  TypePlugin, 
  ValidationPlugin, 
  FormatterPlugin, 
  ParserPlugin, 
  PluginContext, 
  PluginMetadata 
} from './types.js';

/**
 * JSON Formatter Plugin
 * Formats parsed data as JSON
 */
export class JsonFormatterPlugin implements FormatterPlugin {
  metadata: PluginMetadata = {
    name: 'json-formatter',
    version: '1.0.0',
    description: 'JSON formatter for author data',
    author: 'Lexi'
  };

  supportedFormats = ['json'];

  format(data: Record<string, any>, options: any = {}): string {
    const indent = options.indent || 2;
    return JSON.stringify(data, null, indent);
  }
}

/**
 * YAML Formatter Plugin
 * Formats parsed data as YAML (basic implementation)
 */
export class YamlFormatterPlugin implements FormatterPlugin {
  metadata: PluginMetadata = {
    name: 'yaml-formatter',
    version: '1.0.0',
    description: 'YAML formatter for author data',
    author: 'Lexi'
  };

  supportedFormats = ['yaml', 'yml'];

  format(data: Record<string, any>, options: any = {}): string {
    return this.objectToYaml(data, 0);
  }

  private objectToYaml(obj: any, indent: number): string {
    const spaces = '  '.repeat(indent);
    let result = '';

    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        result += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            result += `${spaces}  -\n${this.objectToYaml(item, indent + 2)}`;
          } else {
            result += `${spaces}  - ${this.escapeYamlValue(item)}\n`;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        result += `${spaces}${key}:\n${this.objectToYaml(value, indent + 1)}`;
      } else {
        result += `${spaces}${key}: ${this.escapeYamlValue(value)}\n`;
      }
    }

    return result;
  }

  private escapeYamlValue(value: any): string {
    if (typeof value === 'string') {
      // Simple escaping for YAML
      if (value.includes('\n') || value.includes('"') || value.includes("'")) {
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      return value;
    }
    return String(value);
  }
}

/**
 * Markdown Formatter Plugin
 * Formats parsed data as Markdown
 */
export class MarkdownFormatterPlugin implements FormatterPlugin {
  metadata: PluginMetadata = {
    name: 'markdown-formatter',
    version: '1.0.0',
    description: 'Markdown formatter for author data',
    author: 'Lexi'
  };

  supportedFormats = ['markdown', 'md'];

  format(data: Record<string, any>, options: any = {}): string {
    let result = '# Author Profile\n\n';

    for (const [key, value] of Object.entries(data)) {
      if (key === 'Author' || key === 'author') {
        result += `## ${value}\n\n`;
      } else if (Array.isArray(value)) {
        result += `### ${key}\n\n`;
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            result += this.objectToMarkdown(item, 0);
          } else {
            result += `- ${item}\n`;
          }
        }
        result += '\n';
      } else if (typeof value === 'object' && value !== null) {
        result += `### ${key}\n\n`;
        result += this.objectToMarkdown(value, 0);
        result += '\n';
      } else {
        result += `**${key}**: ${value}\n\n`;
      }
    }

    return result;
  }

  private objectToMarkdown(obj: any, indent: number): string {
    const spaces = '  '.repeat(indent);
    let result = '';

    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        result += `${spaces}- **${key}**:\n`;
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            result += `${spaces}  - ${this.objectToMarkdown(item, indent + 2)}`;
          } else {
            result += `${spaces}  - ${item}\n`;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        result += `${spaces}- **${key}**:\n${this.objectToMarkdown(value, indent + 1)}`;
      } else {
        result += `${spaces}- **${key}**: ${value}\n`;
      }
    }

    return result;
  }
}

/**
 * Social Media Type Plugin
 * Handles various social media platform usernames
 */
export class SocialMediaTypePlugin implements TypePlugin {
  metadata: PluginMetadata = {
    name: 'social-media-type',
    version: '1.0.0',
    description: 'Social media platform type validation and processing',
    author: 'Lexi'
  };

  supportedTypes = ['twitter', 'mastodon', 'linkedin', 'instagram'];

  processValue(value: string, type: string, context: PluginContext): any {
    // Remove @ prefix if present
    const cleanValue = value.replace(/^@/, '');
    
    const urlMap: Record<string, string> = {
      twitter: `https://twitter.com/${cleanValue}`,
      mastodon: cleanValue.includes('@') ? `https://${cleanValue.split('@')[1]}/@${cleanValue.split('@')[0]}` : cleanValue,
      linkedin: `https://linkedin.com/in/${cleanValue}`,
      instagram: `https://instagram.com/${cleanValue}`
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
    if (socialValue) {
      // Basic validation for social media usernames
      const usernameRegex = /^[a-zA-Z0-9_\.-]+$/;
      if (!usernameRegex.test(socialValue)) {
        warnings.push(`Invalid ${type} username format: ${socialValue}`);
      }
      
      if (socialValue.length > 30) {
        warnings.push(`${type} username too long: ${socialValue}`);
      }
    }
    
    return warnings.length > 0 ? warnings : null;
  }
}

/**
 * Color Type Plugin
 * Validates and processes color values (hex, rgb, named colors)
 */
export class ColorTypePlugin implements TypePlugin {
  metadata: PluginMetadata = {
    name: 'color-type',
    version: '1.0.0',
    description: 'Color type validation and processing',
    author: 'Lexi'
  };

  supportedTypes = ['color'];

  processValue(value: string, type: string, context: PluginContext): any {
    const cleanValue = value.trim().toLowerCase();
    
    // Convert to hex if possible
    let hexValue = this.toHex(cleanValue);
    
    return { 
      type, 
      value: cleanValue,
      hex: hexValue
    };
  }

  validateValue(value: any, type: string, context: PluginContext): string[] | null {
    const warnings: string[] = [];
    
    const colorValue = typeof value === 'string' ? value : value?.value;
    if (colorValue) {
      const hex = this.toHex(colorValue);
      if (!hex) {
        warnings.push(`Invalid color format: ${colorValue}`);
      }
    }
    
    return warnings.length > 0 ? warnings : null;
  }

  private toHex(color: string): string | null {
    // Hex color
    if (/^#[0-9a-f]{3,6}$/i.test(color)) {
      return color;
    }
    
    // RGB color
    const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    }
    
    // Named colors (basic set)
    const namedColors: Record<string, string> = {
      'red': '#ff0000',
      'green': '#008000',
      'blue': '#0000ff',
      'white': '#ffffff',
      'black': '#000000',
      'yellow': '#ffff00',
      'cyan': '#00ffff',
      'magenta': '#ff00ff',
      'gray': '#808080',
      'grey': '#808080'
    };
    
    return namedColors[color] || null;
  }
}

/**
 * Data Sanitization Plugin
 * Sanitizes parsed data for security and consistency
 */
export class DataSanitizationPlugin implements ParserPlugin {
  metadata: PluginMetadata = {
    name: 'data-sanitization',
    version: '1.0.0',
    description: 'Data sanitization and normalization plugin',
    author: 'Lexi'
  };

  afterParse(data: Record<string, any>): Record<string, any> {
    const sanitized = this.sanitizeObject(data);
    return sanitized;
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    } else if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeKey(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  }

  private sanitizeString(str: string): string {
    // Remove excessive whitespace
    return str.replace(/\s+/g, ' ').trim();
  }

  private sanitizeKey(key: string): string {
    // Normalize key casing and remove special characters
    return key.replace(/[^a-zA-Z0-9_-]/g, '').replace(/^[0-9]/, '');
  }
}
