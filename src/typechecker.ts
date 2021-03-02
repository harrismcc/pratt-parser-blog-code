import {Position} from './position';
import * as AST from './ast';
import {equals} from './equals';

/***** ITERATION: change all outputType.valueType to simply outputType *****/

export function typecheck(nodes: AST.Node[], registeredNodes: {[key: string]: AST.Node}): TypeError[] {
  const errors = nodes.map(n => typecheckNode(n, registeredNodes));
  return ([] as TypeError[]).concat(...errors);
}

function typecheckNode(node: AST.Node, registeredNodes: {[key: string]: AST.Node}): TypeError[] {
  return checkerMap[node.nodeType].check(node, registeredNodes);
}

export class TypeError {
  constructor(public message: string, public position: Position) {}
}

export interface TypeChecker {
  check(node: AST.Node, registeredNodes: {[key: string]: AST.Node}): TypeError[];
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
  check(node: AST.BinaryOperationNode, registeredNodes: {[key: string]: AST.Node}): TypeError[] {
    const errors: TypeError[] = typecheckNode(node.left, registeredNodes).concat(typecheckNode(node.right, registeredNodes));
    
    // Check if same operand type (both numbers, both booleans)
    if (node.left?.outputType?.valueType != node.right?.outputType?.valueType) {
      errors.push(new TypeError("incompatible types for binary operator", node.pos));
    }
    // Check if incorrect combination of operator and operands
    else if (node.right?.outputType?.valueType == 'boolean' && (node.operator != "|" && node.operator != '&')) {
      errors.push(new TypeError("incompatible operation for boolean operands", node.pos));
    }
    else if (node.right?.outputType?.valueType == 'number' && (node.operator == "|" || node.operator == '&')) {
      errors.push(new TypeError("incompatible operation for number operands", node.pos));
    }

    return errors;
  }
}

class CheckFunction implements TypeChecker {
  check(node: AST.FunctionNode, registeredNodes: {[key: string]: AST.Node}): TypeError[] {
    let errors: TypeError[] = [];

    // First typecheck the argument
    const arg1Errors = typecheckNode(node.args[0], registeredNodes);
    errors = errors.concat(arg1Errors);
    if (node.args.length > 1) {
      const arg2Errors = typecheckNode(node.args[1], registeredNodes);
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
  check(node: AST.ChooseNode, registeredNodes: {[key: string]: AST.Node}): TypeError[] {
    let errors: TypeError[] = [];

    const predicate = node.case.predicate;
    const consequent = node.case.consequent;
    const otherwise = node.otherwise;

    // First typecheck the inner nodes
    const predErrors = typecheckNode(predicate, registeredNodes);
    const consErrors = typecheckNode(consequent, registeredNodes);
    const otherErrors = typecheckNode(otherwise, registeredNodes);
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
  check(node: AST.VariableAssignmentNode, registeredNodes: {[key: string]: AST.Node}): TypeError[] {
    let errors: TypeError[] = [];
    // First typecheck the assignment node
    const assignmentErrors = typecheckNode(node.assignment, registeredNodes);
    errors = errors.concat(assignmentErrors);

    return errors;
  }
}

class CheckIdentifier implements TypeChecker {
  check(node: AST.IdentifierNode, registeredNodes: {[key: string]: AST.Node}): TypeError[] {
    let errors: TypeError[] = [];

    // Maybe make assigmentId be valueId?
    let valueNode = registeredNodes[node.assignmentId].assignment;

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
  "Y": {inputType: 'pair', resultType: 'number'},
  "RandomChoice" : {inputType : 'number', resultType: 'number'}
}

const checkerMap: Partial<{[K in AST.NodeType]: TypeChecker}> = {
  'Number' : new CheckNumber(),
  'ConstantNumber' : new CheckNumber(),
  'Boolean' : new CheckBoolean(),
  'BinaryOperation' : new CheckBinary(),
  'Function' : new CheckFunction(),
  'Choose': new CheckChoose(),
  'VariableAssignment': new CheckVariable(),
  'Identifier': new CheckIdentifier(),
  
}