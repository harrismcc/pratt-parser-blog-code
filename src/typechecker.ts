import {Position} from './position';
import * as AST from './ast';

export function typecheck(nodes: AST.Node[]): TypeError[] {
  const errors = nodes.map(n => typecheckNode(n));
  return ([] as TypeError[]).concat(...errors);
}

function typecheckNode(node: AST.Node): TypeError[] {
  return checkerMap[node.nodeType].check(node);
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
    if (node.left.nodeType != node.right.nodeType) {
      if (node.left.nodeType == "BinaryOperation") {
          errors.concat(this.check(node.left));
          if (node.left.left.nodeType != node.right.nodeType) {
            errors.push(new TypeError("incompatible operation for boolean operands", node.pos));
          }
          // do the operator and the other node's type match
          else if (node.right.nodeType == "Boolean" && node.operator != "^") {
            errors.push(new TypeError("incompatible operation for boolean operands", node.pos));
          }
          else if (node.right.nodeType == "Number" && node.operator == "^") {
            errors.push(new TypeError("incompatible operation for number operands", node.pos));
          }
          
      }
      else if (node.right.nodeType == "BinaryOperation") {
          errors.concat(this.check(node.right));
          if (node.right.left.nodeType != node.left.nodeType) {
            errors.push(new TypeError("incompatible operation for boolean operands", node.pos));
          }
          // do the operator and the other node's type match
          else if (node.left.nodeType == "Boolean" && node.operator != "^") {
            errors.push(new TypeError("incompatible operation for boolean operands", node.pos));
          }
          else if (node.left.nodeType == "Number" && node.operator == "^") {
            errors.push(new TypeError("incompatible operation for number operands", node.pos));
          }
      }
      else {
        errors.push(new TypeError("incompatible types for binary operator", node.pos));
      }
    }
    else {
      if (node.left.nodeType == "Boolean" && node.operator != "^") {
        errors.push(new TypeError("incompatible operation for boolean operands", node.pos));
      }
      else if (node.left.nodeType == "Number" && node.operator == "^") {
        errors.push(new TypeError("incompatible operation for number operands", node.pos));
      }
    }
    return errors;
  }
}

class CheckFunction implements TypeChecker {
  check(node: AST.FunctionNode): TypeError[] {
    const errors: TypeError[] = [];
    if (node.name == 'isDefined') {
      // actually argument checking is unnecessary because the editor just doesn't recognize it
      // if it has the wrong argument type yikes
      // need to check that the argument is either a function or a boolean
      if (node.arg.nodeType != "Function" && node.arg.nodeType != "Boolean") {
        // then we have a problem
        errors.push(new TypeError("incompatible argument type for isDefined", node.pos));
      }
      // maybe if it is a function we need to make sure that function is defined so we can
      // convert it into Definitely, or maybe that takes place in the choose node
    }
    else if (node.name == 'test') {
      // make sure there is no argument
      if (node.arg != undefined) {
        errors.push(new TypeError("the test function does not take an argument", node.pos));
      }
    }
    else {
      // name is unknown
      errors.push(new TypeError("unknown function", node.pos));
    }
  }
}

const checkerMap: Partial<{[K in AST.NodeType]: TypeChecker}> = {
  'Number' : new CheckNumber(),
  'Boolean' : new CheckBoolean(),
  'BinaryOperation' : new CheckBinary(),
  'Function' : new CheckFunction()
}