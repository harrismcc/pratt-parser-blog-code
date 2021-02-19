import { TokenStream } from './tokenstream';
import { Token, TokenType, BinaryOperationTokenType} from './lexer';
import * as AST from './ast';
import { AbstractParser } from './parser';
import {ParseError, token2pos, join, pos2string} from './position'

export interface InitialParselet {
  parse(parser: AbstractParser, tokens: TokenStream, token: Token, varMap: {[key: string]: string}): AST.Node;
}



export class NumberParselet implements InitialParselet {
  parse(_parser: AbstractParser, _tokens: TokenStream, token: Token, varMap: {[key: string]: string}) {
    const position = token2pos(token);
    const id = pos2string(position);
    return {
      nodeType: 'Number' as 'Number',
      value: parseFloat(token.text),
      outputType: { status: 'Definitely' as 'Definitely',
                    valueType: 'number' as 'number' },
      pos: position,
      nodeId: id
    }
  }
}

export class BooleanParselet implements InitialParselet {
  constructor(private value: boolean) {}
  parse(_parser: AbstractParser, _tokens: TokenStream, token: Token, varMap: {[key: string]: string}) {
    const position = token2pos(token);
    const id = pos2string(position);
    return {
      nodeType: 'Boolean' as 'Boolean',
      value: this.value,
      outputType: { status: 'Definitely' as 'Definitely',
                    valueType: 'boolean' as 'boolean' },
      pos: position,
      nodeId: id
    }
  }
}

export class ParenParselet implements InitialParselet {
  parse(parser: AbstractParser, tokens: TokenStream, _token: Token, varMap: {[key: string]: string}) {
    const exp = parser.parse(tokens, 0, varMap);
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
    token: Token,
    varMap: {[key: string]: string}
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
    token: Token,
    varMap: {[key: string]: string}
  ): AST.Node {
    const bindingPower = parser.bindingPower(token);

    const right = parser.parse(
      tokens,
      this.associativity == 'left' ? bindingPower : bindingPower - 1,
      varMap
    );
    const position = join(left.pos, token2pos(tokens.last()));
    const id = pos2string(position);
    return {
      nodeType: 'BinaryOperation' as 'BinaryOperation',
      operator: this.tokenType,
      left,
      right,
      outputType: undefined,
      pos: position,
      nodeId: id
    }
  }
}

// Parse function calls
// Limitation: Functions are allowed to take exactly one argument
export class FunctionParselet implements InitialParselet {
  
  parse(parser: AbstractParser, tokens: TokenStream, token: Token, varMap: {[key: string]: string}) {
    const position = token2pos(token);
    const id = pos2string(position);
    tokens.expectToken('(');
    const exp = parser.parse(tokens, 0, varMap);  // allow for one argument
    tokens.expectToken(')');

    return {
      nodeType: 'Function' as 'Function',
      name: token.text,
      arg: exp,
      outputType: { status: 'Maybe-Undefined' as 'Maybe-Undefined',
                    valueType: undefined },
      pos: position,
      nodeId: id
    }
  }
}

export class ChooseParselet implements InitialParselet {
  parse(parser: AbstractParser, tokens: TokenStream, token: Token, varMap: {[key: string]: string}) {
    const position = token2pos(token);
    const id = pos2string(position);
    const predicate = parser.parse(tokens, 0, varMap);
    const consequent = parser.parse(tokens, 0, varMap);
    tokens.expectToken('CHOOSE2');
    const otherwise = parser.parse(tokens, 0, varMap);

    return {
      nodeType: 'Choose' as 'Choose',
      case: { predicate: predicate, consequent: consequent },
      otherwise: otherwise,
      outputType: { status: 'Maybe-Undefined' as 'Maybe-Undefined',
                    valueType: undefined },
      pos: position,
      nodeId: id
    }
  }
}

export class VariableAssignmentParselet implements InitialParselet {
  parse(parser: AbstractParser, tokens: TokenStream, token: Token, varMap: {[key: string]: string}) {

    const position = token2pos(token);
    const id = pos2string(position);
    
    // deal with variable assignment
    tokens.expectToken('=');
    const assignment = parser.parse(tokens, 0, varMap);

    // need to save the variable and its assignment in a lookup table
    varMap[token.text] = assignment.nodeId;

    return {
      nodeType: 'VariableAssignment' as 'VariableAssignment',
      name: token.text,
      assignment: assignment,
      outputType: { status: "Maybe-Undefined" as "Maybe-Undefined",
                    valueType: assignment?.outputType?.valueType },
      pos: position,
      nodeId: id
    }
  }
}

export class IdentifierParselet implements InitialParselet {
  parse(parser: AbstractParser, tokens: TokenStream, token: Token, varMap: {[key: string]: string}) {
    
    const position = token2pos(token);
    const id = pos2string(position);
    // need to look up known variables in a lookup table (map?)

    const assignmentId = varMap[token.text];

    if (!assignmentId) {
      const varParselet = new VariableAssignmentParselet();
      return varParselet.parse(parser, tokens, token, varMap);
    }
    else {
      return {
        nodeType: 'Identifier' as 'Identifier',
        name: token.text,
        assignmentId: assignmentId,
        outputType: { status: "Maybe-Undefined" as "Maybe-Undefined",
                      valueType: undefined },
        pos: position,
        nodeId: id
      }
    }
  }
}
