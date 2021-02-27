import * as AST from './ast';

export function findBases(node: AST.Node): string[] {
    return baseMap[node.nodeType].findBase(node); 
}

export interface BaseFinder {
  findBase(node: AST.Node): string[];
}

class BaseNumber implements BaseFinder {
  findBase(node: AST.Node): string[] {
    return []
  }
}

class BaseBoolean implements BaseFinder {
    findBase(node: AST.Node): string[] {
        return []
    }
}

class BaseBinary implements BaseFinder {
    findBase(node: AST.Node): string[] {
        return []
    }
}

class BaseFunction implements BaseFinder {
    findBase(node: AST.Node): string[] {
        return []
    }
}

// THIS IS LEFT AS AN EXERCISE TO THE READER
class BaseChoose implements BaseFinder {
    findBase(node: AST.Node): string[] {
        return []
    }
}

// THIS IS LEFT AS AN EXERCISE TO THE READER
class BaseVariableAssignment implements BaseFinder {
    findBase(node: AST.Node): string[] {
        return []
    }
}

class BaseIdentifier implements BaseFinder {
    findBase(node: AST.Node): string[] {
        return []
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
