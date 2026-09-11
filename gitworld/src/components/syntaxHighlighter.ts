/**
 * Lightweight regex-based syntax highlighter for GitWorld's in-game code viewer.
 * Highlights TypeScript/JavaScript, Rust, Go, Python, HTML/CSS, JSON, Markdown, and Shell
 * using GitWorld's dusk palette tokens.
 */

export interface HighlightedLine {
  lineNumber: number;
  tokens: Array<{ text: string; className?: string }>;
}

const KEYWORDS = new Set([
  // JS/TS
  'const', 'let', 'var', 'function', 'return', 'import', 'export', 'default', 'from',
  'if', 'else', 'switch', 'case', 'break', 'for', 'while', 'do', 'continue',
  'try', 'catch', 'finally', 'throw', 'new', 'class', 'extends', 'implements',
  'interface', 'type', 'async', 'await', 'yield', 'typeof', 'instanceof', 'in', 'of',
  'package', 'private', 'protected', 'public', 'static', 'readonly', 'as', 'is',
  // Rust
  'fn', 'let', 'mut', 'pub', 'struct', 'enum', 'trait', 'impl', 'use', 'mod',
  'match', 'loop', 'where', 'crate', 'self', 'super', 'unsafe',
  // Go
  'func', 'var', 'const', 'type', 'struct', 'interface', 'package', 'import',
  'return', 'defer', 'go', 'select', 'chan', 'range', 'map',
  // Python
  'def', 'class', 'import', 'from', 'as', 'return', 'if', 'elif', 'else',
  'for', 'while', 'try', 'except', 'finally', 'with', 'lambda', 'pass', 'raise',
]);

const LITERALS = new Set([
  'true', 'false', 'null', 'undefined', 'nil', 'None', 'NaN', 'Infinity', 'Some', 'None', 'Ok', 'Err',
]);

const BUILTIN_TYPES = new Set([
  'string', 'number', 'boolean', 'symbol', 'bigint', 'void', 'never', 'unknown', 'any',
  'Array', 'Object', 'Function', 'Promise', 'Record', 'Map', 'Set',
  'i8', 'i16', 'i32', 'i64', 'u8', 'u16', 'u32', 'u64', 'f32', 'f64', 'usize', 'isize', 'bool', 'str', 'String', 'Vec', 'Option', 'Result',
  'int', 'int64', 'float64', 'error', 'byte', 'rune',
]);

export function highlightCode(code: string, language = 'text'): HighlightedLine[] {
  const lines = code.split('\n');
  const normalizedLang = language.toLowerCase().replace(/^\./, '');

  return lines.map((line, index) => {
    return {
      lineNumber: index + 1,
      tokens: tokenizeLine(line, normalizedLang),
    };
  });
}

function tokenizeLine(line: string, lang: string): Array<{ text: string; className?: string }> {
  if (!line) {
    return [{ text: ' ' }];
  }

  const tokens: Array<{ text: string; className?: string }> = [];

  // Match comments first
  const commentRegex = (lang === 'python' || lang === 'shell' || lang === 'sh' || lang === 'bash' || lang === 'yaml' || lang === 'yml')
    ? /(#.*$)/
    : /(\/\/.*$|\/\*.*?\*\/)/;

  const commentMatch = line.match(commentRegex);
  let codePart = line;
  let commentPart = '';

  if (commentMatch && commentMatch.index !== undefined) {
    codePart = line.slice(0, commentMatch.index);
    commentPart = line.slice(commentMatch.index);
  }

  // Regex token pattern for code part
  // 1: strings (double, single, backtick)
  // 2: numbers
  // 3: identifiers / words
  // 4: punctuation / operators
  // 5: whitespace
  const tokenPattern = /(`(?:\\.|[^`])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|([a-zA-Z_$][a-zA-Z0-9_$]*)|([^\s\w]+)|(\s+)/g;

  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = tokenPattern.exec(codePart)) !== null) {
    const [, str, num, ident, punct, space] = match;

    if (str) {
      tokens.push({ text: str, className: 'hl-string' });
    } else if (num) {
      tokens.push({ text: num, className: 'hl-number' });
    } else if (ident) {
      if (KEYWORDS.has(ident)) {
        tokens.push({ text: ident, className: 'hl-keyword' });
      } else if (LITERALS.has(ident)) {
        tokens.push({ text: ident, className: 'hl-literal' });
      } else if (BUILTIN_TYPES.has(ident) || /^[A-Z][a-zA-Z0-9_]*$/.test(ident)) {
        tokens.push({ text: ident, className: 'hl-type' });
      } else {
        // Lookahead in codePart to see if followed by '(' for function call
        const nextChars = codePart.slice(tokenPattern.lastIndex).trimStart();
        if (nextChars.startsWith('(')) {
          tokens.push({ text: ident, className: 'hl-function' });
        } else {
          tokens.push({ text: ident, className: 'hl-ident' });
        }
      }
    } else if (punct) {
      tokens.push({ text: punct, className: 'hl-punct' });
    } else if (space) {
      tokens.push({ text: space });
    }

    lastIndex = tokenPattern.lastIndex;
  }

  // Catch any remaining characters
  if (lastIndex < codePart.length) {
    tokens.push({ text: codePart.slice(lastIndex) });
  }

  // Add comment if present
  if (commentPart) {
    tokens.push({ text: commentPart, className: 'hl-comment' });
  }

  return tokens.length > 0 ? tokens : [{ text: ' ' }];
}
