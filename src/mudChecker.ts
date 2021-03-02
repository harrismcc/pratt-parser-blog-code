import {Position} from './position';
import * as AST from './ast';
import {equals} from './equals';
import {findBases} from './findBase';

export function mudCheck(nodes: AST.Node[], 
                        registeredNodes: {[key: string]: AST.Node},
                        dependsMap: {[key: string]: string[]}): TypeError[] {
  const errors = nodes.map(n => mudCheckNode(n, nodes, registeredNodes, dependsMap));
  return ([] as TypeError[]).concat(...errors);
}

function mudCheckNode(node: AST.Node, 
                    nodes: AST.Node[], 
                    registeredNodes: {[key: string]: AST.Node},
                    dependsMap: {[key: string]: string[]}): TypeError[] {
  return mudCheckerMap[node.nodeType].mudCheck(node, nodes, registeredNodes, dependsMap);
}

export class TypeError {
  constructor(public message: string, public position: Position) {}
}

export interface MudChecker {
  mudCheck(node: AST.Node, 
          nodes: AST.Node[], 
          registeredNodes: {[key: string]: AST.Node},
          dependsMap: {[key: string]: string[]}): TypeError[];
}

class MudCheckNumber implements MudChecker {
  mudCheck(node: AST.NumberNode): TypeError[] {
    return [];
  }
}

class MudCheckBoolean implements MudChecker {
    mudCheck(node: AST.BooleanNode): TypeError[] {
    return [];
  }
}

class MudCheckBinary implements MudChecker {
    mudCheck(node: AST.BinaryOperationNode, 
            nodes: AST.Node[], 
            registeredNodes: {[key: string]: AST.Node},
            dependsMap: {[key: string]: string[]}): TypeError[] {
        const errors: TypeError[] = mudCheckNode(node.left, nodes, registeredNodes, dependsMap).concat(mudCheckNode(node.right, nodes, registeredNodes, dependsMap));

        // If no type errors, update the output type of this node, based on the outputType of its inputs
        if (node.right?.outputType?.status == 'Maybe-Undefined' || node.left?.outputType?.status == 'Maybe-Undefined') {
            node.outputType = {status: 'Maybe-Undefined',
                              valueType: node.left?.outputType?.valueType };
        } else {
            node.outputType = {status: 'Definitely',
                            valueType: node.left?.outputType?.valueType };
        }

        return errors;
    }
}

class MudCheckFunction implements MudChecker {
    mudCheck(node: AST.FunctionNode, 
            nodes: AST.Node[], 
            registeredNodes: {[key: string]: AST.Node},
            dependsMap: {[key: string]: string[]}): TypeError[] {
        let errors: TypeError[] = [];

        // First typecheck the argument
        const arg1Errors = mudCheckNode(node.args[0], nodes, registeredNodes, dependsMap);
        errors = errors.concat(arg1Errors);
        if (node.args.length > 1) {
        const arg2Errors = mudCheckNode(node.args[1], nodes, registeredNodes, dependsMap);
        errors = errors.concat(arg2Errors);
        }

        const functionName = node.name
        const argType = builtins[functionName].inputType;
        const returnType = builtins[functionName].resultType;

        // only show error if in sink "node"
        if (functionName == 'Sink') {
        // if sink "node" takes in possibly undefined values, warn the author
        // a sink has one argument
        if (node.args[0]?.outputType?.status == 'Maybe-Undefined') {
            errors.push(new TypeError("User facing content could be undefined.", node.args[0].pos));
        }
        }

        // If no type errors, update the output type of this node, based on the outputType of its argument
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
        for (let i = 0; i < node.args.length; i++) {
            // node.outputType.dependsOn.push(node.args[i].nodeId);
        }

        return errors;
    }
}

class MudCheckChoose implements MudChecker {
    mudCheck(node: AST.ChooseNode, 
            nodes: AST.Node[], 
            registeredNodes: {[key: string]: AST.Node},
            dependsMap: {[key: string]: string[]}): TypeError[] {
        let errors: TypeError[] = [];

        const predicate = node.case.predicate;
        const consequent = node.case.consequent;
        const otherwise = node.otherwise;

        // First typecheck the inner nodes
        const predErrors = mudCheckNode(predicate, nodes, registeredNodes, dependsMap);
        const consErrors = mudCheckNode(consequent, nodes, registeredNodes, dependsMap);
        const otherErrors = mudCheckNode(otherwise, nodes, registeredNodes, dependsMap);
        errors = errors.concat(predErrors).concat(consErrors).concat(otherErrors);

        node.outputType.valueType = consequent.outputType.valueType;

        // propagate maybe-undefined type, or change to definitely
        // if the predicate is not a function, we cannot error check its type
        if (consequent.outputType.status == 'Maybe-Undefined' && predicate.nodeType == 'Function') {
        // we can only errorr check with IsDefined function
        // IsDefined has only one argument
        if (predicate.name == 'IsDefined') {
            // we need to make sure the pred and cons are equal
            // OR make sure all the dependencies of the consequent are in the predicate

            // find bases of consequent
            let consBases = findBases(consequent, dependsMap);
            // look up the bases of the predicate
            let predBases = findBases(predicate, dependsMap);
            // set outputType to Definitely if consBases are contained in predBases

            let contained = true;
            for (let i = 0; i < consBases.length; i++) {
              if (predBases.find(e => e == consBases[i]) == undefined) {
                contained = false;
              }
            }
            if (contained) {
              node.outputType.status = 'Definitely';
            }

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

class MudCheckVariable implements MudChecker {
    mudCheck(node: AST.VariableAssignmentNode, 
            nodes: AST.Node[], 
            registeredNodes: {[key: string]: AST.Node},
            dependsMap: {[key: string]: string[]}): TypeError[] {
    let errors: TypeError[] = [];
    // First typecheck the assignment node
    const assignmentErrors = mudCheckNode(node.assignment, nodes, registeredNodes, dependsMap);
    errors = errors.concat(assignmentErrors);

    // Set variable assignment node output type to the same as it's assignment
    node.outputType.status = node.assignment.outputType.status;
    node.outputType.valueType = node.assignment.outputType.valueType;
    // node.outputType.dependsOn = [node.assignment.nodeId];

    return errors;
  }
}

class MudCheckIdentifier implements MudChecker {
    mudCheck(node: AST.IdentifierNode, 
            nodes: AST.Node[], 
            registeredNodes: {[key: string]: AST.Node},
            dependsMap: {[key: string]: string[]}): TypeError[] {
    let errors: TypeError[] = [];

    // Maybe make assigmentId be valueId?
    let valueNode = registeredNodes[node.assignmentId].assignment;

    // If this assignmentId is not found in the AST, throw an error
    if (valueNode == undefined) {
      errors.push(new TypeError("This variable doesn't have a value", node.pos));
    } else {
      // If we found the assignment node, set the output type of the identifier
      node.outputType.status = valueNode.outputType.status;
      node.outputType.valueType = valueNode.outputType.valueType;
      // node.outputType.dependsOn = [node.assignmentId];
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

const mudCheckerMap: Partial<{[K in AST.NodeType]: MudChecker}> = {
  'Number' : new MudCheckNumber(),
  'Boolean' : new MudCheckBoolean(),
  'BinaryOperation' : new MudCheckBinary(),
  'Function' : new MudCheckFunction(),
  'Choose': new MudCheckChoose(),
  'VariableAssignment': new MudCheckVariable(),
  'Identifier': new MudCheckIdentifier()
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