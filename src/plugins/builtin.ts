/**
 * Built-in plugins for Author DSL Parser
 * Provides common type plugins and validation rules
 * 
 * @author Lexi
 * @version 1.0
 */

import { TypePlugin, ValidationPlugin, PluginContext, PluginMetadata } from './types.js';

/**
 * URL Type Plugin
 * Validates and processes URL values
 */
export class UrlTypePlugin implements TypePlugin {
  metadata: PluginMetadata = {
    name: 'url-type',
    version: '1.0.0',
    description: 'URL type validation and processing',
    author: 'Lexi'
  };

  supportedTypes = ['url'];

  processValue(value: string, type: string, context: PluginContext): any {
    // Remove mailto: prefix if present
    if (value.startsWith('mailto:')) {
      return { type, value: value.slice(7) };
    }
    
    // Remove http:// or https:// prefix for display
    const cleanValue = value.replace(/^https?:\/\//, '');
    return { type, value: cleanValue, original: value };
  }

  validateValue(value: any, type: string, context: PluginContext): string[] | null {
    const warnings: string[] = [];
    
    if (typeof value === 'string') {
      try {
        new URL(value.startsWith('http') ? value : `https://${value}`);
      } catch {
        warnings.push(`Invalid URL format: ${value}`);
      }
    } else if (value && typeof value === 'object' && value.original) {
      try {
        new URL(value.original);
      } catch {
        warnings.push(`Invalid URL format: ${value.original}`);
      }
    }
    
    return warnings.length > 0 ? warnings : null;
  }
}

/**
 * Email Type Plugin
 * Validates and processes email values
 */
export class EmailTypePlugin implements TypePlugin {
  metadata: PluginMetadata = {
    name: 'email-type',
    version: '1.0.0',
    description: 'Email type validation and processing',
    author: 'Lexi'
  };

  supportedTypes = ['email'];

  processValue(value: string, type: string, context: PluginContext): any {
    // Remove mailto: prefix if present
    const cleanValue = value.replace(/^mailto:/, '');
    return { type, value: cleanValue };
  }

  validateValue(value: any, type: string, context: PluginContext): string[] | null {
    const warnings: string[] = [];
    
    const emailValue = typeof value === 'string' ? value : value?.value;
    if (emailValue) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailValue)) {
        warnings.push(`Invalid email format: ${emailValue}`);
      }
    }
    
    return warnings.length > 0 ? warnings : null;
  }
}

/**
 * Date Type Plugin
 * Validates and processes date values
 */
export class DateTypePlugin implements TypePlugin {
  metadata: PluginMetadata = {
    name: 'date-type',
    version: '1.0.0',
    description: 'Date type validation and processing',
    author: 'Lexi'
  };

  supportedTypes = ['date'];

  processValue(value: string, type: string, context: PluginContext): any {
    const date = new Date(value);
    return { 
      type, 
      value: value,
      timestamp: date.getTime(),
      iso: date.toISOString()
    };
  }

  validateValue(value: any, type: string, context: PluginContext): string[] | null {
    const warnings: string[] = [];
    
    const dateValue = typeof value === 'string' ? value : value?.value;
    if (dateValue) {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        warnings.push(`Invalid date format: ${dateValue}`);
      }
    }
    
    return warnings.length > 0 ? warnings : null;
  }
}

/**
 * Phone Type Plugin
 * Validates and processes phone number values
 */
export class PhoneTypePlugin implements TypePlugin {
  metadata: PluginMetadata = {
    name: 'phone-type',
    version: '1.0.0',
    description: 'Phone number type validation and processing',
    author: 'Lexi'
  };

  supportedTypes = ['phone'];

  processValue(value: string, type: string, context: PluginContext): any {
    // Remove common formatting characters
    const cleanValue = value.replace(/[\s\-\(\)\.]/g, '');
    return { type, value: cleanValue, formatted: value };
  }

  validateValue(value: any, type: string, context: PluginContext): string[] | null {
    const warnings: string[] = [];
    
    const phoneValue = typeof value === 'string' ? value : value?.value;
    if (phoneValue) {
      // Basic phone validation - digits, +, and common separators
      const phoneRegex = /^[\+]?[0-9\s\-\(\)\.]{7,20}$/;
      if (!phoneRegex.test(phoneValue)) {
        warnings.push(`Invalid phone format: ${phoneValue}`);
      }
    }
    
    return warnings.length > 0 ? warnings : null;
  }
}

/**
 * GitHub Type Plugin
 * Validates and processes GitHub usernames/repositories
 */
export class GitHubTypePlugin implements TypePlugin {
  metadata: PluginMetadata = {
    name: 'github-type',
    version: '1.0.0',
    description: 'GitHub username/repository type validation and processing',
    author: 'Lexi'
  };

  supportedTypes = ['github'];

  processValue(value: string, type: string, context: PluginContext): any {
    // Remove @ prefix if present
    const cleanValue = value.replace(/^@/, '');
    return { 
      type, 
      value: cleanValue,
      url: `https://github.com/${cleanValue}`
    };
  }

  validateValue(value: any, type: string, context: PluginContext): string[] | null {
    const warnings: string[] = [];
    
    const githubValue = typeof value === 'string' ? value : value?.value;
    if (githubValue) {
      // GitHub username validation
      const githubRegex = /^[a-zA-Z0-9]([a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
      if (!githubRegex.test(githubValue)) {
        warnings.push(`Invalid GitHub username format: ${githubValue}`);
      }
    }
    
    return warnings.length > 0 ? warnings : null;
  }
}

/**
 * Enhanced Validation Plugin
 * Provides additional validation rules beyond the basic ones
 */
export class EnhancedValidationPlugin implements ValidationPlugin {
  metadata: PluginMetadata = {
    name: 'enhanced-validation',
    version: '1.0.0',
    description: 'Enhanced validation rules for author data',
    author: 'Lexi'
  };

  validate(data: Record<string, any>): string[] {
    const warnings: string[] = [];

    // Check for required fields
    if (!data.Author && !data.author) {
      warnings.push('Warning: No author name specified');
    }

    // Check for duplicate keys (case-insensitive)
    const keys = Object.keys(data);
    const lowerKeys = keys.map(k => k.toLowerCase());
    const duplicates = lowerKeys.filter((key, index) => lowerKeys.indexOf(key) !== index);
    if (duplicates.length > 0) {
      warnings.push(`Warning: Potential duplicate keys (case-insensitive): ${duplicates.join(', ')}`);
    }

    // Check for suspicious values
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.length > 1000) {
        warnings.push(`Warning: Very long value for key '${key}' (${value.length} characters)`);
      }
      
      if (Array.isArray(value) && value.length > 100) {
        warnings.push(`Warning: Very large array for key '${key}' (${value.length} items)`);
      }
    }

    // Check for deprecated keys
    const deprecatedKeys = ['name', 'email', 'website']; // These should use Author, Contact@email, Website@url
    for (const deprecatedKey of deprecatedKeys) {
      if (data[deprecatedKey]) {
        warnings.push(`Warning: Deprecated key '${deprecatedKey}' found. Consider using the typed version.`);
      }
    }

    return warnings;
  }
}

/**
 * Security Validation Plugin
 * Validates for potential security issues
 */
export class SecurityValidationPlugin implements ValidationPlugin {
  metadata: PluginMetadata = {
    name: 'security-validation',
    version: '1.0.0',
    description: 'Security validation rules for author data',
    author: 'Lexi'
  };

  validate(data: Record<string, any>): string[] {
    const warnings: string[] = [];

    // Check for potential XSS in string values
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];

    const checkForXSS = (value: any, key: string): void => {
      if (typeof value === 'string') {
        for (const pattern of xssPatterns) {
          if (pattern.test(value)) {
            warnings.push(`Security warning: Potential XSS in key '${key}'`);
            break;
          }
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'string') {
            checkForXSS(item, `${key}[${index}]`);
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        for (const [subKey, subValue] of Object.entries(value)) {
          checkForXSS(subValue, `${key}.${subKey}`);
        }
      }
    };

    for (const [key, value] of Object.entries(data)) {
      checkForXSS(value, key);
    }

    return warnings;
  }
}
