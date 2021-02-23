import {Position} from './position';
import * as AST from './ast';
import {equals} from './equals';

export function typecheck(nodes: AST.Node[]): TypeError[] {
  const errors = nodes.map(n => typecheckNode(n, nodes));
  return ([] as TypeError[]).concat(...errors);
}

function typecheckNode(node: AST.Node, nodes: AST.Node[]): TypeError[] {
  return checkerMap[node.nodeType].check(node, nodes);
}

export class TypeError {
  constructor(public message: string, public position: Position) {}
}

export interface TypeChecker {
  check(node: AST.Node, nodes: AST.Node[]): TypeError[];
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
  check(node: AST.BinaryOperationNode, nodes: AST.Node[]): TypeError[] {
    const errors: TypeError[] = typecheckNode(node.left, nodes).concat(typecheckNode(node.right, nodes));
    
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
  check(node: AST.FunctionNode, nodes: AST.Node[]): TypeError[] {
    let errors: TypeError[] = [];

    // First typecheck the argument
    const arg1Errors = typecheckNode(node.args[0], nodes);
    errors = errors.concat(arg1Errors);
    if (node.args.length > 1) {
      const arg2Errors = typecheckNode(node.args[1], nodes);
      errors = errors.concat(arg2Errors);
      if (node.args[0]?.outputType?.valueType != node.args[1]?.outputType?.valueType) {
        errors.push(new TypeError("arguments must have same type", node.args[0].pos));
      }
    }

    const functionName = node.name
    const argType = builtins[functionName].inputType;
    const returnType = builtins[functionName].resultType;

    // we found a builtin function
    if (argType) {

      // typecheck the argument
      // Assume both arguments are the same type (see error produced above)
      if (argType != 'any' && node.args[0]?.outputType?.valueType != argType) {
        errors.push(new TypeError("incompatible argument type for " + functionName, node.pos));
      }
    }
  
    // this is not a known, builtin function
    else {
      errors.push(new TypeError("unknown function", node.pos));
    }

    // only show error if in sink "node"
    if (functionName == 'Sink') {
      // if sink "node" takes in possibly undefined values, warn the author
      // a sink has one argument
      if (node.args[0]?.outputType?.status == 'Maybe-Undefined') {
        errors.push(new TypeError("User facing content could be undefined.", node.args[0].pos));
      }
    }

    // If no type errors, update the output type of this node, based on the outputType of its argument
    if (errors.length == 0) {
      if (node.args[0]?.outputType?.status == 'Maybe-Undefined' || functionName == 'Input') {
        // IsDefined should always output a definitely regardless of argument status
        if (functionName != 'IsDefined') {
          node.outputType.status = 'Maybe-Undefined';
        }
        else {
          node.outputType.status = 'Definitely';
        }
      } else if (node.args.length > 1) {
        if (node.args[1].outputType.status == 'Maybe-Undefined') {
          // Note: IsDefined only has one argument, so we don't need to check for that here
          node.outputType.status = 'Maybe-Undefined';
        } else {
          node.outputType.status = 'Definitely';
        }
      } else {
        node.outputType.status = 'Definitely';
      }

      node.outputType.valueType = returnType;

    }    

    return errors;
  }
}

class CheckChoose implements TypeChecker {
  check(node: AST.ChooseNode, nodes: AST.Node[]): TypeError[] {
    let errors: TypeError[] = [];

    const predicate = node.case.predicate;
    const consequent = node.case.consequent;
    const otherwise = node.otherwise;

    // First typecheck the inner nodes
    const predErrors = typecheckNode(predicate, nodes);
    const consErrors = typecheckNode(consequent, nodes);
    const otherErrors = typecheckNode(otherwise, nodes);
    errors = errors.concat(predErrors).concat(consErrors).concat(otherErrors);

    // check return types are the same for both cases
    if (consequent?.outputType?.valueType != otherwise?.outputType?.valueType) {
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
    // if the predicate is not a function, we cannot error check its type
    if (consequent.outputType.status == 'Maybe-Undefined' && predicate.nodeType == 'Function') {
      // if the function is isDefined we need to make sure the pred and cons are equal
      // IsDefined has only one argument
      if (predicate.name == 'IsDefined' && equals(predicate.args[0], consequent)) {
        node.outputType.status = 'Definitely';
      } else {
        // if the predicate doesn't error check (with isDefined), it can't be Definitely
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

class CheckVariable implements TypeChecker {
  check(node: AST.VariableAssignmentNode, nodes: AST.Node[]): TypeError[] {
    let errors: TypeError[] = [];
    // First typecheck the assignment node
    const assignmentErrors = typecheckNode(node.assignment, nodes);
    errors = errors.concat(assignmentErrors);

    // Set variable assignment node output type to the same as it's assignment
    node.outputType.status = node.assignment.outputType.status;
    node.outputType.valueType = node.assignment.outputType.valueType;

    return errors;
  }
}

class CheckIdentifier implements TypeChecker {
  check(node: AST.IdentifierNode, nodes: AST.Node[]): TypeError[] {
    let errors: TypeError[] = [];

    let valueNode = undefined;

    // console.log("assignmentId: ", node.assignmentId)

    // Traverse AST to find node variable is assigned to
    for (let i=0; i < nodes.length; i++) {
      if (nodes[i].nodeId == node.assignmentId) {
        if (nodes[i].nodeType == "VariableAssignment") {
          valueNode = nodes[i].assignment;
          break;
        }
      }
    }

    // If this assignmentId is not found in the AST, throw an error
    if (valueNode == undefined) {
      errors.push(new TypeError("This variable doesn't have a value", node.pos));
    } else {
      // If we found the assignment node, set the output type of the identifier
      node.outputType.status = valueNode.outputType.status;
      node.outputType.valueType = valueNode.outputType.valueType;
    }

    return errors;
  }
}

// Dictionary of builtin functions that maps a function name to the type of its argument
const builtins : {[name: string]: {inputType: AST.ValueType, resultType: AST.ValueType} } = {
  "IsDefined": {inputType: 'any', resultType: 'boolean'},
  "Inverse": {inputType: 'number', resultType: 'number'},
  "Input": {inputType: 'number', resultType: 'number'},
  "Sink": {inputType: 'any', resultType: 'any'},
  "ParseOrderedPair": {inputType: 'number', resultType: 'pair'},
  "X": {inputType: 'pair', resultType: 'number'},
  "Y": {inputType: 'pair', resultType: 'number'}
}

const checkerMap: Partial<{[K in AST.NodeType]: TypeChecker}> = {
  'Number' : new CheckNumber(),
  'Boolean' : new CheckBoolean(),
  'BinaryOperation' : new CheckBinary(),
  'Function' : new CheckFunction(),
  'Choose': new CheckChoose(),
  'VariableAssignment': new CheckVariable(),
  'Identifier': new CheckIdentifier()
}