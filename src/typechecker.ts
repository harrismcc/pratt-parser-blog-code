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
      if (node.left.type == "BinaryOperation") {
          errors.concat(this.check(node.left));
          if (node.left.left.type != node.right.type) {
            errors.push(new TypeError("incompatible operation for boolean operands", node.pos));
          }
          // do the operator and the other node's type match
          else if (node.right.type == "Boolean" && node.operator != "^") {
            errors.push(new TypeError("incompatible operation for boolean operands", node.pos));
          }
          else if (node.right.type == "Number" && node.operator == "^") {
            errors.push(new TypeError("incompatible operation for number operands", node.pos));
          }
          
      }
      else if (node.right.type == "BinaryOperation") {
          errors.concat(this.check(node.right));
          if (node.right.left.type != node.left.type) {
            errors.push(new TypeError("incompatible operation for boolean operands", node.pos));
          }
          // do the operator and the other node's type match
          else if (node.left.type == "Boolean" && node.operator != "^") {
            errors.push(new TypeError("incompatible operation for boolean operands", node.pos));
          }
          else if (node.left.type == "Number" && node.operator == "^") {
            errors.push(new TypeError("incompatible operation for number operands", node.pos));
          }
      }
      else {
        errors.push(new TypeError("incompatible types for binary operator", node.pos));
      }
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

class CheckFunction implements TypeChecker {
  check(node: AST.FunctionNode): TypeError[] {
    return [];
  }
}

const checkerMap: Partial<{[K in AST.NodeType]: TypeChecker}> = {
  'Number' : new CheckNumber(),
  'Boolean' : new CheckBoolean(),
  'BinaryOperation' : new CheckBinary(),
  'Function' : new CheckFunction()
}