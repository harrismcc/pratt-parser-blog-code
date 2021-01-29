import {Position} from './position';
import * as AST from './ast';

export function typecheck(nodes: AST.Node[]): TypeError[] {
  const errors = nodes.map(n => typecheckNode(n));
  return ([] as TypeError[]).concat(...errors);
}

function typecheckNode(node: AST.Node): TypeError[] {
  return checkerMap[node.type].check(node);
}

export class TypeError {
  constructor(public message: string, public position: Position) {}
}

export interface TypeChecker {
  check(node: AST.Node): TypeError[];
}

class CheckNumber implements TypeChecker {
  check(node: AST.NumberNode): TypeError[] {
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
      // TODO: debug this so that these problems are fixed:
      //  1) returns an error on valid, 3-operand statements like "1 + 2 + 3"
      //  2) does not return an error when you do things like "True + False" (wrong binary op)
      errors.push(new TypeError("incompatible types for binary operator", node.pos));
    }
    else {
      if (node.left.type == "Boolean" && node.operator != "^") {
        errors.push(new TypeError("incompatible operation for boolean operands", node.pos));
      }
      else if (node.left.type == "Number" && node.operator == "^") {
        errors.push(new TypeError("incompatible operation for number operands", node.pos));
      }
    }
    return errors;
  }
}

const checkerMap: Partial<{[K in AST.NodeType]: TypeChecker}> = {
  'Number' : new CheckNumber(),
  'Boolean' : new CheckBoolean(),
  'BinaryOperation' : new CheckBinary()
}