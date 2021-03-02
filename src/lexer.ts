import StringStream from './StringStream';

export function getTokens(text: string): Token[] {
  const tokens: Token[] = [];
  const state: State = {line: 1, stack: ['default']};

  for (const line of text.split('\n')) {
    const stream = new StringStream(line);
    while (!stream.eol()) {
      const token = getToken(stream, state);
      if (token != undefined) {
        tokens.push(token);
      }

      if (stream.start == stream.pos) {
        throw new Error(
          `getToken failed to advance stream at position ${
            stream.pos
          } in string ${stream.string}`,
        );
      }
      stream.start = stream.pos;
    }

    state.line += 1;
  }

  return tokens;
}

export function getToken(
  stream: StringStream,
  state: State,
): Token | undefined {
  //Built for codeMirror streams API
  //State is a stack of states
  switch (state.stack[state.stack.length - 1]) {
    default:
      return getDefaultToken(stream, state);
  }
}

function makeEmit(stream: StringStream, state: State) {
  return function emitToken(type: TokenType): Token {
    return {
      type,
      first_column: stream.start,
      last_column: stream.pos,
      line: state.line,
      text: stream.current(),
    };
  };
}

function getDefaultToken(
  stream: StringStream,
  state: State,
): Token | undefined {
  const emitToken = makeEmit(stream, state);
  if (stream.eatSpace()) {
    // skip whitespace
    return undefined;
  }

  if (stream.match(/\+/)) {
    return emitToken('+');
  }

  if (stream.match(/\-/)) {
    return emitToken('-');
  }

  if (stream.match(/\*/)) {
    return emitToken('*');
  }

  if (stream.match(/\//)) {
    return emitToken('/');
  }

  if (stream.match(/\|/)) {
    return emitToken('|');
  }

  if (stream.match(/\&/)) {
    return emitToken('&');
  }

  if (stream.match(/\(/)) {
    return emitToken('(');
  }

  if (stream.match(/\)/)) {
    return emitToken(')');
  }

  // adding an equals operator
  if (stream.match(/\=/)) {
    return emitToken('=');
  }

  if (stream.match(/-?[0-9]+(\.[0-9]+)?/)) {
    return emitToken('NUMBER');
  }

  if (stream.match(/True/)) {
    return emitToken('TRUE');
  }

  if (stream.match(/False/)) {
    return emitToken('FALSE');
  }

  if (stream.match(/#/)) {
    if (!stream.match(/\n/)) {
      // comment lasts till end of line
      stream.match(/.*/); // if no eol encountered, comment lasts till end of file
    }
    return emitToken('COMMENT');
  }

  // hardcode when to be a choose node not an identifier to get around parsing
  if (stream.match(/WHEN/)) {
    return emitToken('CHOOSE1');
  }

  // Remove otherwise clause for now
  if (stream.match(/OTHERWISE/)) {
    return emitToken('CHOOSE2');
  }

  if (stream.match(/[A-Z]([a-z|A-Z])*/)) {
    return emitToken('FUNCTION');
  }

  // Identifiers
  // For now, the form of a valid identifier is: a lower-case alphabetic character,
  // followed by zero or more alpha characters.
  if (stream.match(/[a-z]([a-z|A-Z])*/)) {
    return emitToken('IDENTIFIER');
  }
  

  stream.next();
  return emitToken('ERROR');
}

export type BinaryOperationTokenType =
  | '+'
  | '-'
  | '*'
  | '/'
  | '|' // this is an or
  | '&' // this is an and

export type TokenType =
  | BinaryOperationTokenType
  | 'NUMBER'
  | 'TRUE'
  | 'FALSE'
  | '('
  | ')'
  | 'COMMENT'
  | 'ERROR'
  | 'FUNCTION'
  | 'IDENTIFIER'
  | 'CHOOSE1'
  | 'CHOOSE2'
  | '='

export interface Token<T extends TokenType = TokenType> {
  type: T;
  text: string;
  line: number;
  first_column: number;
  last_column: number;
}

type Mode = 'default';

export interface State {
  stack: Mode[];
  line: number;
}
