import { TokenStream } from './tokenstream';
import { Token, TokenType, BinaryOperationTokenType} from './lexer';
import * as AST from './ast';
import { AbstractParser } from './parser';
import {ParseError, token2pos, join} from './position'

export interface InitialParselet {
  parse(parser: AbstractParser, tokens: TokenStream, token: Token): AST.Node;
}

export class NumberParselet implements InitialParselet {
  parse(_parser: AbstractParser, _tokens: TokenStream, token: Token) {
    return {
      nodeType: 'Number' as 'Number',
      value: parseFloat(token.text),
      pos: token2pos(token)
    }
  }
}

export class BooleanParselet implements InitialParselet {
  constructor(private value: boolean) {}
  parse(_parser: AbstractParser, _tokens: TokenStream, token: Token) {
    return {
      nodeType: 'Boolean' as 'Boolean',
      value: this.value,
      pos: token2pos(token)
    }
  }
}

export class ParenParselet implements InitialParselet {
  parse(parser: AbstractParser, tokens: TokenStream, _token: Token) {
    const exp = parser.parse(tokens, 0);
    tokens.expectToken(')');

    return exp;
  }
}

export abstract class ConsequentParselet {
  constructor(
    readonly tokenType: TokenType,
    readonly associativity: 'left' | 'right'
  ) {}
  abstract parse(
    parser: AbstractParser,
    tokens: TokenStream,
    left: AST.Node,
    token: Token
  ): AST.Node;
}

export class BinaryOperatorParselet extends ConsequentParselet {
  constructor(
    public tokenType: BinaryOperationTokenType,
    associativity: 'left' | 'right'
  ) {
    super(tokenType, associativity);
  }

  parse(
    parser: AbstractParser,
    tokens: TokenStream,
    left: AST.Node,
    token: Token
  ): AST.Node {
    const bindingPower = parser.bindingPower(token);

    const right = parser.parse(
      tokens,
      this.associativity == 'left' ? bindingPower : bindingPower - 1
    );

    return {
      nodeType: 'BinaryOperation' as 'BinaryOperation',
      operator: this.tokenType,
      left,
      right,
      pos: join(left.pos, token2pos(tokens.last()))
    }
  }
}

// ************** THIS IS WHERE THE FUNCTION PARSELET LIVES ******************
/*
type
name: string;
  arg: ArgumentNode;
  outputType: MaybeUnd;
  pos: Position;
*/
export class FunctionParselet implements InitialParselet {
  constructor(private value: string) {}
  parse(_parser: AbstractParser, _tokens: TokenStream, token: Token) {
    
    if (this.value == 'inverse') {
      return {
        nodeType: 'Function' as 'Function',
        name: 'inverse',
        arg: undefined,
        outputType: { status: 'Maybe-Undefined' as 'Maybe-Undefined',
                      value: 'boolean' as 'boolean' },
        pos: token2pos(token)
      }
    }

    else {
      throw new ParseError(
        `Unknown function`,
        token2pos(token),
      );
    }
    
  }
}
