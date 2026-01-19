import { BlockMath, InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import './MathStyles.css';
import React from 'react';

/**
 * Mathematical formula renderer for WebGAL visual novel engine
 * Renders LaTeX mathematical notation using react-katex components
 * Provides secure formula processing with proper React integration
 */
export class MathRenderer {
  private static instance: MathRenderer;

  /**
   * Gets the singleton instance of MathRenderer
   */
  static getInstance(): MathRenderer {
    if (!MathRenderer.instance) {
      MathRenderer.instance = new MathRenderer();
    }
    return MathRenderer.instance;
  }

  /**
   * Legacy method for rendering math formulas
   * @deprecated Use prepareMathForWebGAL instead for better React integration
   */
  renderMath(text: string): string {
    console.warn('MathRenderer.renderMath() is deprecated. Use prepareMathForWebGAL() instead.');
    return text;
  }

  /**
   * Checks if text contains mathematical formulas
   * @param text Text to check for math notation
   * @returns True if text contains LaTeX math formulas
   */
  hasMath(text: string): boolean {
    return /\$[\s\S]*?\$/.test(text);
  }

  /**
   * Validates LaTeX formula syntax and security
   * @param formula LaTeX formula content to validate
   * @returns True if formula is valid and safe
   */
  validateFormula(formula: string): boolean {
    try {
      // Basic validation: check for empty or whitespace-only content
      if (!formula || formula.trim() === '') return false;

      // Security check: prevent XSS attacks through formula content
      const dangerousChars = /<script|javascript|on\w+=/i;
      if (dangerousChars.test(formula)) return false;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Prepares mathematical formulas for WebGAL text processing
   * Extracts formulas and replaces them with placeholders, returning processed text and React component mapping
   * @param text Original text containing LaTeX formulas
   * @returns Object containing processed text and math component map
   */
  prepareMathForWebGAL(text: string): {
    processedText: string;
    mathComponents: Map<string, React.ReactElement>;
  } {
    const mathComponents = new Map<string, React.ReactElement>();
    let processedText = text;
    let placeholderIndex = 0;

    // Process display formulas $$...$$
    // biome-ignore lint/correctness/noEmptyCharacterClassInRegex: [^] is JS idiom for matching any char including newlines
    processedText = processedText.replace(/\$\$([^]*?)\$\$/g, (match, formula) => {
      try {
        const cleanFormula = formula.trim();

        if (!this.validateFormula(cleanFormula)) {
          console.warn('Invalid display formula:', cleanFormula);
          return match;
        }

        const placeholder = `<MATH_DISPLAY_${placeholderIndex}>`;

        // Create BlockMath component for display formulas
        const component = React.createElement(BlockMath, {
          key: placeholder,
          math: cleanFormula,
          errorColor: '#cc0000',
          renderError: (error: any) => {
            console.error('LaTeX display formula error:', error);
            return React.createElement(
              'div',
              {
                className: 'webgal-math-error',
                style: { color: '#cc0000', fontSize: '0.9em' },
              },
              `[Math Error: ${cleanFormula}]`
            );
          },
        });

        mathComponents.set(placeholder, component);
        placeholderIndex++;
        return placeholder;
      } catch (error) {
        console.error('LaTeX display formula rendering error:', error);
        return match;
      }
    });

    // Process inline formulas $...$
    processedText = processedText.replace(/\$([^$\n]+?)\$/g, (match, formula) => {
      try {
        const cleanFormula = formula.trim();

        if (!this.validateFormula(cleanFormula)) {
          console.warn('Invalid inline formula:', cleanFormula);
          return match;
        }

        const placeholder = `<MATH_INLINE_${placeholderIndex}>`;

        // Create InlineMath component with custom styling
        const component = React.createElement(
          'span',
          {
            key: placeholder,
            style: {
              color: '#2c3e50',
              verticalAlign: 'baseline',
            },
          },
          React.createElement(InlineMath, {
            math: cleanFormula,
            errorColor: '#cc0000',
            renderError: (error: any) => {
              console.error('LaTeX inline formula error:', error);
              return React.createElement(
                'span',
                {
                  className: 'webgal-math-error',
                  style: { color: '#cc0000', fontSize: '0.9em' },
                },
                `[Formula Error: ${cleanFormula}]`
              );
            },
          })
        );

        mathComponents.set(placeholder, component);
        placeholderIndex++;
        return placeholder;
      } catch (error) {
        console.error('LaTeX inline formula rendering error:', error);
        return match;
      }
    });

    return { processedText, mathComponents };
  }

  /**
   * Checks if a string is a mathematical formula placeholder
   * @param text Text to check for placeholder pattern
   * @returns True if text matches placeholder format
   */
  isMathPlaceholder(text: string): boolean {
    return /^<MATH_(DISPLAY|INLINE)_\d+>$/.test(text);
  }

  /**
   * Extracts all mathematical formulas from text
   * @param text Original text containing formulas
   * @returns Array of formula information objects
   */
  extractMathFormulas(text: string): MathFormula[] {
    const formulas: MathFormula[] = [];

    // Extract display formulas
    // biome-ignore lint/correctness/noEmptyCharacterClassInRegex: [^] is JS idiom for matching any char including newlines
    const displayMatches = text.matchAll(/\$\$([^]*?)\$\$/g);
    for (const match of displayMatches) {
      formulas.push({
        original: match[0],
        formula: match[1].trim(),
        type: 'display',
        position: match.index || 0,
      });
    }

    // Extract inline formulas
    const inlineMatches = text.matchAll(/\$([^$\n]+?)\$/g);
    for (const match of inlineMatches) {
      formulas.push({
        original: match[0],
        formula: match[1].trim(),
        type: 'inline',
        position: match.index || 0,
      });
    }

    return formulas.sort((a, b) => a.position - b.position);
  }

  /**
   * Legacy method for multi-language math rendering
   * @deprecated Modern implementation uses react-katex components
   */
  renderMathForLanguage(text: string, _language: 'zh' | 'jp' | 'en'): string {
    console.warn('MathRenderer.renderMathForLanguage() is deprecated.');
    return text;
  }

  /**
   * Legacy method for batch math rendering
   * @deprecated Modern implementation uses react-katex components
   */
  batchRenderMath(texts: string[]): string[] {
    console.warn('MathRenderer.batchRenderMath() is deprecated.');
    return texts;
  }
}

/**
 * Mathematical formula information interface
 */
export interface MathFormula {
  original: string; // Original LaTeX code
  formula: string; // Formula content
  type: 'inline' | 'display'; // Formula type
  position: number; // Position in text
}

/**
 * Gets the singleton math renderer instance
 */
export const getMathRenderer = () => MathRenderer.getInstance();
