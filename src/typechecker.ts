import {Position} from './position';
import * as AST from './ast';

export function typecheck(nodes: AST.Node[]): TypeError[] {
  const errors = nodes.map(n => typecheckNode(n));
  return ([] as TypeError[]).concat(...errors);
}

function typecheckNode(node: AST.Node): TypeError[] {
  return checkerMap[node.type]!.check(node);
}

export class TypeError {
  constructor(public message: string, public position: Position) {}
}

export interface TypeChecker {
  check(node: AST.Node): TypeError[];
}

class CheckNumber implements TypeChecker {
  check(node: AST.ConstantNumberNode): TypeError[] {
    return [];
  }
}

class CheckBoolean implements TypeChecker {
  check(node: AST.BooleanNode): TypeError[] {
    return [];
  }
}

class CheckBinary implements TypeChecker {
  check(node: AST.BinaryOperationNode): TypeError[] {
    const errors: TypeError[] = typecheckNode(node.left).concat(typecheckNode(node.right));
    if (node.left.type != node.right.type) {
      errors.push(new TypeError("incompatible types for binary operator", node.pos));
    }
    return errors;
  }
}


class CheckSpam implements TypeChecker {
  check(node: AST.SpamNode): TypeError[] {
    return [];
  }
}

const checkerMap: Partial<{[K in AST.NodeType]: TypeChecker}> = {
  'ConstantNumber' : new CheckNumber(),
  'Number' : new CheckNumber(),
  'Boolean' : new CheckBoolean(),
  'BinaryOperation' : new CheckBinary(),
  'Spam' : new CheckSpam(),
}