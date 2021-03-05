import {Position} from './position';
import * as AST from './ast';
import {equals} from './equals';




let duChain : Map<string, string[]> = new Map();


export function darCheck(nodes: AST.Node[],  registeredNodes: {[key: string]: AST.Node}): TypeError[] {
    const errors = nodes.map(n => darCheckNode(n, nodes, registeredNodes));
    return ([] as TypeError[]).concat(...errors);
}

function darCheckNode(node: AST.Node, nodes: AST.Node[], registeredNodes: {[key: string]: AST.Node}): TypeError[] {
    return darCheckerMap[node.nodeType].darCheck(node, nodes, registeredNodes);
}

export class TypeError {
    constructor(public message: string, public position: Position) {}
  }

export interface DarChecker {

    darCheck(node: AST.Node,
            nodes: AST.Node[], 
            registeredNodes: {[key: string]: AST.Node},): TypeError[];
  }

class DarCheckNumber implements DarChecker {
    darCheck(node: AST.NumberNode): TypeError[] {
        return [];
    }
  }


  class DarCheckFunction implements DarChecker{
      darCheck(node: AST.FunctionNode, nodes: AST.Node[], registeredNodes: {[key: string]: AST.Node}) : TypeError[]{
          
        
        if (node.name == "RandomChoice"){
            throw('This is Random Choice')
        }
        
        return []
      }
  }

class DarCheckBinary implements DarChecker {
    isConstantOperation(topNode : AST.Node) : boolean {
        if (topNode == undefined ){
            return false;
        }

        if (topNode.nodeType == 'Number'){
            return false;
        }
        else if (topNode.nodeType == 'BinaryOperation'){
            return this.isConstantOperation(topNode.left) && this.isConstantOperation(topNode.right);
        }
        else if (topNode.nodeType == 'Function'){
            //TODO: false always here is temp, function result not always non-constant
            return false;
        }
        else {
            //throw('Incompatable Node type');
        }
    }
    darCheck(node: AST.BinaryOperationNode, nodes: AST.Node[], registeredNodes: {[key: string]: AST.Node}): TypeError[] {
        const errors: TypeError[] = darCheckNode(node.left, nodes, registeredNodes).concat(darCheckNode(node.right, nodes, registeredNodes));
        

        if (this.isConstantOperation(node)){
        //errors.push(new TypeError("Is Constant Operation!", node.pos));
        } else {
        //errors.push(new TypeError("Non constant operation", node.pos));
        }
        
        return errors;
    }
}

class DarCheckVariable implements DarChecker {
    darCheck(node: AST.VariableAssignmentNode, nodes: AST.Node[], registeredNodes: {[key: string]: AST.Node}): TypeError[] {



        //new assignment, update def-use chain to hold new def
        duChain.set(node.nodeId, []);

        //make sure the identifier is resolved as a use
        darCheckNode(node.assignment, nodes, registeredNodes);


        return [];
    }
}

class DarCheckIdentifier implements DarChecker {
    getOutputType(node: AST.Node, registeredNodes: {[key: string]: AST.Node}) : AST.Possible<AST.ValueType> | undefined{

        if (node?.outputType != undefined && node.outputType.valueType != undefined){
            return node.outputType;
        } else if (node?.nodeType == "Identifier"){
            return this.getOutputType(registeredNodes[node!.assignmentId], registeredNodes);
        } else if (node?.nodeType == "VariableAssignment"){

            return this.getOutputType(node.assignment, registeredNodes);
        }
        else {
            console.log("No output type for node ", node?.nodeType);
            return undefined;
        }
    }
    darCheck(node: AST.IdentifierNode, nodes: AST.Node[], registeredNodes: {[key: string]: AST.Node}): TypeError[] {

        //new use, update def-use chain to hold new use
        let oldChain = duChain.get(node.assignmentId); //assignmentId corresponds to the node id of the identifiers VariableAssignment
        if (oldChain == undefined){
            oldChain = [];
        }
        duChain.set(node.assignmentId, oldChain.concat([node.nodeId]) );
        
        console.log("Output Type:", this.getOutputType(node, registeredNodes));

        return [];
    }
  }



const darCheckerMap: Partial<{[K in AST.NodeType]: DarChecker}> = {
'Number' : new DarCheckNumber(),
//'Boolean' : new CheckBoolean(),
'BinaryOperation' : new DarCheckBinary(),
'Function' : new DarCheckFunction(),
//'Choose': new CheckChoose(),
'VariableAssignment': new DarCheckVariable(),
'Identifier': new DarCheckIdentifier()
}