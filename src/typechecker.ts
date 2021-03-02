import {Position} from './position';
import * as AST from './ast';

export function typecheck(nodes: AST.Node[]): TypeError[] {
  const errors = nodes.map(n => typecheckNode(n, nodes));
  return ([] as TypeError[]).concat(...errors);
}

function typecheckNode(node: AST.Node, nodes: AST.Node[]): TypeError[] {
  return checkerMap[node.type]!.check(node, nodes);
}

export class TypeError {
  constructor(public message: string, public position: Position) {}
}

export interface TypeChecker {
  check(node: AST.Node, nodes: AST.Node[]): TypeError[];
}

class CheckNumber implements TypeChecker {
  check(node: AST.ConstantNumberNode): TypeError[] {
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

    
    if (isConstantOperation(node)){
      //errors.push(new TypeError("Is Constant Operation!", node.pos));
    } else {
      errors.push(new TypeError("Non constant operation", node.pos));
    }
    

    if (node.left.type != node.right.type) {

      //temporary fix to allow nested binary operations
      if (node.left.type != "BinaryOperation" && node.right.type != "BinaryOperation"){

        //errors.push(new TypeError("incompatible types for binary operator", node.pos));
      }
    }
    return errors;
  }
}


class CheckSpam implements TypeChecker {
  check(node: AST.SpamNode, nodes: AST.Node[]): TypeError[] {
    return [];
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
      if (node.args[0]?.outputType != node.args[1]?.outputType) {
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
      if (argType != 'any' && node.args[0]?.outputType != argType) {
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

    }

    // If no type errors, update the output type of this node, based on the outputType of its argument
    if (errors.length == 0) {
      node.outputType = returnType;
    }    

    return errors;
  }
}

const checkerMap: Partial<{[K in AST.NodeType]: TypeChecker}> = {
  'ConstantNumber' : new CheckNumber(),
  'Number' : new CheckNumber(),
  'Boolean' : new CheckBoolean(),
  'BinaryOperation' : new CheckBinary(),
  'Spam' : new CheckSpam(),
  'Function' : new CheckFunction(),
};



function isConstantOperation(topNode : AST.Node) : boolean {

  if (topNode.type == 'Number'){
    return false;
  }
  else if (topNode.type == 'ConstantNumber'){
    return true;
  }
  else if (topNode.type == 'BinaryOperation'){
    return isConstantOperation(topNode.left) && isConstantOperation(topNode.right);
  }
  else if (topNode.type == 'Function'){
    //TODO: false always here is temp, function result not always non-constant
    return false;
  }
  else {
    throw('Incompatable Node type');
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