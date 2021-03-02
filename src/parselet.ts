import { TokenStream } from './tokenstream';
import { Token, TokenType, BinaryOperationTokenType} from './lexer';
import * as AST from './ast';
import { AbstractParser } from './parser';
import {token2pos, join} from './position'

export interface InitialParselet {
  parse(parser: AbstractParser, tokens: TokenStream, token: Token): AST.Node;
}

export class NumberParselet implements InitialParselet {
  parse(_parser: AbstractParser, _tokens: TokenStream, token: Token) {

    if (token.text == '123'){
      return {
        type: 'Number' as 'Number',
        value: parseFloat(token.text),
        outputType: 'number' as 'number',
        pos: token2pos(token)
      }
    }

    return {
      type: 'ConstantNumber' as 'ConstantNumber',
      value: parseFloat(token.text),
      outputType: 'number' as 'number',
      pos: token2pos(token)
    }
  }
}

export class BooleanParselet implements InitialParselet {
  constructor(private value: boolean) {}
  parse(_parser: AbstractParser, _tokens: TokenStream, token: Token) {
    return {
      type: 'Boolean' as 'Boolean',
      value: this.value,
      outputType: 'boolean' as 'boolean',
      pos: token2pos(token)
    }
  }
}

export class SpamParslet implements InitialParselet {
  parse(_parser: AbstractParser, _tokens: TokenStream, token: Token) {
    return {
      type: 'Spam' as 'Spam',
      outputType: 'number' as 'number',
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
      type: 'BinaryOperation' as 'BinaryOperation',
      operator: this.tokenType,
      outputType: 'number' as 'number',
      left,
      right,
      pos: join(left.pos, token2pos(tokens.last()))
    }
  }
}


// Parse function calls
// Limitation: Functions are allowed to take exactly one argument
export class FunctionParselet implements InitialParselet {
  
  parse(parser: AbstractParser, tokens: TokenStream, token: Token) {
    const position = token2pos(token);
    //const id = pos2string(position);
    
    
    tokens.expectToken('(');
    const arg1 = parser.parse(tokens, 0);  // allow for one argument
    let args = [arg1];
    if (token.text == "ParseOrderedPair") {
      const arg2 = parser.parse(tokens, 0);  // allow for second argument
      args.push(arg2);
    }
    tokens.expectToken(')');

    return {
      type: 'Function' as 'Function',
      name: token.text,
      outputType: undefined,
      args: args,
      pos: position,
      // nodeId: id
    }
  }
}
