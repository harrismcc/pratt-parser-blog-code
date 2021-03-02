import * as AST from './ast';

export function findBases(node: AST.Node, dependsMap: {[key: string]: string[]}): string[] {
    return baseMap[node.nodeType].findBase(node, dependsMap); 
}

export interface BaseFinder {
  findBase(node: AST.Node, dependsMap: {[key: string]: string[]}): string[];
}

class BaseNumber implements BaseFinder {
  findBase(node: AST.NumberNode): string[] {
    return []
  }
}

class BaseBoolean implements BaseFinder {
    findBase(node: AST.BooleanNode): string[] {
        return []
    }
}

class BaseBinary implements BaseFinder {
    findBase(node: AST.BinaryOperationNode, dependsMap: {[key: string]: string[]}): string[] {
        let baseList: string[] = [];
        // recursively call findBases on left and right
        let leftList = findBases(node.left, dependsMap);
        baseList = baseList.concat(leftList);
        let rightList = findBases(node.right, dependsMap)
        baseList = baseList.concat(rightList);
        return baseList;
    }
}

// examples: x = Input(3); x = IsDefined(Input(3)); z = Inverse(x)
// need dependsMap for the third example
class BaseFunction implements BaseFinder {
    findBase(node: AST.FunctionNode, dependsMap: {[key: string]: string[]}): string[] {
        console.log("in base function");
        let baseList: string[] = [];
        if (node.name == "Input") {
            // this is a base
            baseList.push(node.nodeId);
        }
        else {
            // recursively call findBases on argument(s)
            for (let i = 0; i < node.args.length; i++) {
                baseList = baseList.concat(findBases(node.args[i], dependsMap));
            }
        }
        return baseList;
    }
}

// assume that choose nodes will never create their own bases
class BaseChoose implements BaseFinder {
    findBase(node: AST.ChooseNode): string[] {
        return []
    }
}

class BaseVariableAssignment implements BaseFinder {
    findBase(node: AST.VariableAssignmentNode): string[] {
        return []
    }
}

class BaseIdentifier implements BaseFinder {
    findBase(node: AST.IdentifierNode, dependsMap: {[key: string]: string[]}): string[] {
        // follow the chain in the dependsMap
        return dependsMap[node.assignmentId];
    }
}


const baseMap: Partial<{[K in AST.NodeType]: BaseFinder}> = {
  'Number' : new BaseNumber(),
  'Boolean' : new BaseBoolean(),
  'BinaryOperation' : new BaseBinary(),
  'Function' : new BaseFunction(),
  'Choose': new BaseChoose(),
  'VariableAssignment': new BaseVariableAssignment(),
  'Identifier': new BaseIdentifier()
}
