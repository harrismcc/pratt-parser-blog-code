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

    const functionName = node.name
    const argType = builtins[functionName];

    // we found a builtin function
    if (argType) {

      // typecheck the argument
      if (node.arg.nodeType != argType) {
        errors.push(new TypeError("incompatible argument type for " + functionName, node.pos));
      }
    }
  
    // this is not a known, builtin function
    else {
      errors.push(new TypeError("unknown function", node.pos));
    }

    return errors;
  }
}

// Dictionary of builtin functions that maps a function name to the type of its argument
const builtins : {[name: string]: AST.NodeType} = {
  "isDefined" : 'Boolean'
}

const checkerMap: Partial<{[K in AST.NodeType]: TypeChecker}> = {
  'Number' : new CheckNumber(),
  'Boolean' : new CheckBoolean(),
  'BinaryOperation' : new CheckBinary(),
  'Function' : new CheckFunction()
}