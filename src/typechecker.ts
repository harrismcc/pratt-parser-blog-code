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
    
    // Check if same operand type (both numbers, both booleans)
    if (node.left?.outputType?.value != node.right?.outputType?.value) {
      errors.push(new TypeError("incompatible types for binary operator", node.pos));
    }
    // Check if incorrect combination of operator and operands
    else if (node.right?.outputType?.value == 'boolean' && node.operator != "^") {
      errors.push(new TypeError("incompatible operation for boolean operands", node.pos));
    }
    else if (node.right?.outputType?.value == 'number' && node.operator == "^") {
      errors.push(new TypeError("incompatible operation for number operands", node.pos));
    }

    // If no type errors, update the output type of this node, based on the outputType of its inputs
    if (errors.length == 0) {
      if (node.right?.outputType?.status == 'Maybe-Undefined' || node.left?.outputType?.status == 'Maybe-Undefined') {
        node.outputType = {status: 'Maybe-Undefined', value: node.left?.outputType?.value};
      } else {
        node.outputType = {status: 'Definitely', value: node.left?.outputType?.value};
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
      if (node.arg?.nodeType != argType) {
        errors.push(new TypeError("incompatible argument type for " + functionName, node.pos));
      }
    }
  
    // this is not a known, builtin function
    else {
      errors.push(new TypeError("unknown function", node.pos));
    }

    // If no type errors, update the output type of this node, based on the outputType of its argument
    if (errors.length == 0) {
      if (node.arg?.outputType?.status == 'Maybe-Undefined') {
        node.outputType = {status: 'Maybe-Undefined', value: node.arg?.outputType?.value};
      } else {
        node.outputType = {status: 'Definitely', value: node.arg?.outputType?.value};
      }
    }    

    return errors;
  }
}

// Dictionary of builtin functions that maps a function name to the type of its argument
const builtins : {[name: string]: AST.NodeType} = {
  "isDefined" : 'Function',
  "inverse": 'Number'
}

const checkerMap: Partial<{[K in AST.NodeType]: TypeChecker}> = {
  'Number' : new CheckNumber(),
  'Boolean' : new CheckBoolean(),
  'BinaryOperation' : new CheckBinary(),
  'Function' : new CheckFunction()
}