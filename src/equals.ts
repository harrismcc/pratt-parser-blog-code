import * as AST from './ast';

export function equals(left: AST.Node, right: AST.Node): Boolean {
  if (left.nodeType != right.nodeType) {
    return false;
  } else {
    return equalsMap[left.nodeType].eq(left, right);
  }
    
}

export interface Equalizer {
  eq(left: AST.Node, right: AST.Node): Boolean;
}

class EqNumber implements Equalizer {
  eq(left: AST.Node, right: AST.Node): Boolean {
    if (left.value == right.value) {
        return true;
    } else {
        return false;
    }
  }
}

class EqBoolean implements Equalizer {
    eq(left: AST.Node, right: AST.Node): Boolean {
        if (left.value == right.value) {
            return true;
        } else {
            return false;
        }
    }
}

class EqBinary implements Equalizer {
    eq(left: AST.Node, right: AST.Node): Boolean {
        if (left.operator == right.operator && 
            equals(left.left, right.left) && equals(left.right, right.right) ) {
            return true;
        } else {
            return false;
        }
    }
}

class EqFunction implements Equalizer {
    eq(left: AST.Node, right: AST.Node): Boolean {
        if (left.name == right.name && 
            equals(left.arg, right.arg) ) {
            return true;
        } else {
            return false;
        }
    }
}

// THIS IS LEFT AS AN EXERCISE TO THE READER
class EqChoose implements Equalizer {
    eq(left: AST.Node, right: AST.Node): Boolean {
        return false;
    }
}


const equalsMap: Partial<{[K in AST.NodeType]: Equalizer}> = {
  'Number' : new EqNumber(),
  'Boolean' : new EqBoolean(),
  'BinaryOperation' : new EqBinary(),
  'Function' : new EqFunction(),
  'Choose': new EqChoose()
}