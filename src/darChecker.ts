import {Position} from './position';
import * as AST from './ast';
import {equals} from './equals';



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


class DarCheckBinary implements DarChecker {
    isConstantOperation(topNode : AST.Node) : boolean {
        if (topNode == undefined ){
            return false;
        }

        if (topNode.nodeType == 'Number'){
            return false;
        }
        else if (topNode.nodeType == 'ConstantNumber'){
            return true;
        }
        else if (topNode.nodeType == 'BinaryOperation'){
            return this.isConstantOperation(topNode.left) && this.isConstantOperation(topNode.right);
        }
        else if (topNode.nodeType == 'Function'){
            //TODO: false always here is temp, function result not always non-constant
            return false;
        }
        else {
            throw('Incompatable Node type');
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



const darCheckerMap: Partial<{[K in AST.NodeType]: DarChecker}> = {
'Number' : new DarCheckNumber(),
'ConstantNumber' : new DarCheckNumber(),
//'Boolean' : new CheckBoolean(),
'BinaryOperation' : new DarCheckBinary(),
//'Function' : new DarCheckFunction(),
//'Choose': new CheckChoose(),
//'VariableAssignment': new CheckVariable(),
//'Identifier': new CheckIdentifier()
}