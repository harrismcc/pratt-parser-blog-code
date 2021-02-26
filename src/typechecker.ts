import {Position} from './position';
import * as AST from './ast';
import {equals} from './equals';

/***** ITERATION: change all outputType.valueType to simply outputType *****/

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
    }

    // check that the predicate returns a boolean
    if (predicate.outputType.valueType != 'boolean') {
      errors.push(new TypeError("Predicate must return a boolean", predicate.pos));
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

    return errors;
  }
}

class CheckIdentifier implements TypeChecker {
  check(node: AST.IdentifierNode, nodes: AST.Node[]): TypeError[] {
    let errors: TypeError[] = [];

    let valueNode = undefined;

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

/********** MOVE TO CmfChecker **********/
/* function checkDependencies(pred: AST.Node, cons: AST.Node, nodes: AST.Node[]): boolean {
  const depends = cons.outputType.dependsOn;
  // Our only way to error check is with the IsDefined function
  // IsDefined can only take one input
  // If our consequent node depends on more than one other node, then we can't error check both
  if (depends.length > 1) {
    return false;
  } else if (equals(pred, findNode(nodes, depends[0]))) {
    return true;
  } else {
    return false;
  }
}

function findNode(nodes: AST.Node[], nodeId: string): AST.Node {
  for (let i = 0; i < nodes.length; i++) {
    findNode2(nodes[i], nodeId);
  }
}

function findNode2(node: AST.Node, nodeId: string): AST.Node {
  if (node.nodeType == "Number" || node.nodeType == "Boolean") {
    if (nodeId = node.nodeId) {
      return node;
    } else {
      return undefined;
    }
  } else if (node.nodeType == "BinaryOperation") {
    const left = findNode2(node.left, nodeId);
    const right = findNode2(node.right, nodeId);
    if (left) {
      return left;
    } else {
      return right
    }
  } else if (node.nodeType == "Function") {
    const arg1 = findNode2(node.args[0], nodeId);
    if (node.args.length == 1) {
      return arg1;
    } else {
      const arg2 = findNode2(node.args[1], nodeId);
      if (arg1) {
        return arg1;
      } else {
        return arg2;
      }
    }
  } else if (node.nodeType == "Choose") {
    const pred = 
  } else if (node.nodeType == "Identifier") {

  } else if (node.nodeType == "VariableAssignment") {

  }
} */