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
    if (node.left?.outputType?.valueType != node.right?.outputType?.valueType) {
      errors.push(new TypeError("incompatible types for binary operator", node.pos));
    }
    // Check if incorrect combination of operator and operands
    else if (node.right?.outputType?.valueType == 'boolean' && node.operator != "^") {
      errors.push(new TypeError("incompatible operation for boolean operands", node.pos));
    }
    else if (node.right?.outputType?.valueType == 'number' && node.operator == "^") {
      errors.push(new TypeError("incompatible operation for number operands", node.pos));
    }

    // If no type errors, update the output type of this node, based on the outputType of its inputs
    if (errors.length == 0) {
      if (node.right?.outputType?.status == 'Maybe-Undefined' || node.left?.outputType?.status == 'Maybe-Undefined') {
        node.outputType = {status: 'Maybe-Undefined', valueType: node.left?.outputType?.valueType};
      } else {
        node.outputType = {status: 'Definitely', valueType: node.left?.outputType?.valueType};
      }
    }

    return errors;
  }
}

class CheckFunction implements TypeChecker {
  check(node: AST.FunctionNode): TypeError[] {
    let errors: TypeError[] = [];

    // First typecheck the argument
    const argErrors = typecheckNode(node.arg);
    errors = errors.concat(argErrors);

    const functionName = node.name
    const argType = builtins[functionName].inputType;
    const returnType = builtins[functionName].resultType;

    // we found a builtin function
    if (argType) {

      // typecheck the argument
      if (argType != 'any' && node.arg?.outputType?.valueType != argType) {
        errors.push(new TypeError("incompatible argument type for " + functionName, node.pos));
      }
    }
  
    // this is not a known, builtin function
    else {
      errors.push(new TypeError("unknown function", node.pos));
    }

    // only show error if in sink "node"
    if (functionName == 'sink') {
      // if sink "node" takes in possibly undefined values, warn the author
      if (node.arg.outputType.status == 'Maybe-Undefined') {
        errors.push(new TypeError("User facing content could be undefined", node.arg.pos));
      }
    }

    // If no type errors, update the output type of this node, based on the outputType of its argument
    if (errors.length == 0) {
      if (node.arg?.outputType?.status == 'Maybe-Undefined' || functionName == 'input') {
        node.outputType.status = 'Maybe-Undefined';
      } else {
        node.outputType.status = 'Definitely';
      }

      node.outputType.valueType = returnType;

    }    

    return errors;
  }
}

class CheckChoose implements TypeChecker {
  check(node: AST.ChooseNode): TypeError[] {
    let errors: TypeError[] = [];

    const predicate = node.case.predicate;
    const consequent = node.case.consequent;
    const otherwise = node.otherwise;

    // First typecheck the inner nodes
    const predErrors = typecheckNode(predicate);
    const consErrors = typecheckNode(consequent);
    const otherErrors = typecheckNode(otherwise);
    errors = errors.concat(predErrors).concat(consErrors).concat(otherErrors);

    // check return types are the same for both cases
    if (consequent.outputType.valueType != otherwise.outputType.valueType) {
      errors.push(new TypeError("Return types are not the same for both cases", consequent.pos));
      errors.push(new TypeError("Return types are not the same for both cases", otherwise.pos));
    } else {
      // if return types are the same, set the return type of the choose node
      node.outputType.valueType = consequent.outputType.valueType;
    }

    // check that the predicate returns a boolean
    if (predicate.outputType.valueType != 'boolean') {
      errors.push(new TypeError("Predicate must return a boolean", predicate.pos));
    }

    // propagate maybe-undefined type, or change to definitely
    if (consequent.outputType.status == 'Maybe-Undefined') {
      if (predicate.nodeType == 'Function') {
        if (predicate.name == 'isDefined') {

          // NEXT: check if predicate.arg and consequent are euqal (simplification)
          node.outputType.status = 'Definitely';
        } else {
          // if the predicate doesn't error check (with isDefined), it can't be Definitely
          node.outputType.status = 'Maybe-Undefined';
        }
      } else {
        // if the predicate isn't a function, no way it's error checked
        node.outputType.status = 'Maybe-Undefined';
      }
    } else if (otherwise.outputType.status == 'Maybe-Undefined') {
      node.outputType.status = 'Maybe-Undefined';
    } else {
      node.outputType.status = 'Definitely';
    }

    return errors;
  }
}

// Dictionary of builtin functions that maps a function name to the type of its argument
const builtins : {[name: string]: {inputType: AST.ValueType, resultType: AST.ValueType} } = {
  "isDefined": {inputType: 'any', resultType: 'boolean'},
  "inverse": {inputType: 'number', resultType: 'number'},
  "input": {inputType: 'number', resultType: 'number'},
  "sink": {inputType: 'any', resultType: 'any'}
}

const checkerMap: Partial<{[K in AST.NodeType]: TypeChecker}> = {
  'Number' : new CheckNumber(),
  'Boolean' : new CheckBoolean(),
  'BinaryOperation' : new CheckBinary(),
  'Function' : new CheckFunction(),
  'Choose': new CheckChoose()
}