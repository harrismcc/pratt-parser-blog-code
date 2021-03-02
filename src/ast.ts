import {Position} from './position';
import {BinaryOperationTokenType} from './lexer';

export type NodeType =
  | 'SinkAssignment'
  | 'VariableAssignment'
  | 'Number'
  | 'ConstantNumber'
  | 'Boolean'
  | 'String'
  | 'BinaryOperation'
  | 'Choose'
  | 'Identifier'
  | 'Function'
  | 'Pair'
  | 'CalculatorReference';

export type NumberNode = {
  nodeType: 'Number';
  value: number;
  outputType: Definitely<ValueType>;
  pos: Position;
  nodeId: string;
};

export type ConstantNumberNode = {
  nodeType: 'ConstantNumber';
  value: number;
  outputType: Definitely<ValueType>;
  pos: Position;
  nodeId: string;
};

export type BooleanNode = {
  nodeType: 'Boolean';
  value: boolean;
  outputType: Definitely<ValueType>;
  pos: Position;
  nodeId: string;
};

export type BinaryOperationNode = {
  nodeType: 'BinaryOperation';
  operator: BinaryOperationTokenType;
  left: Node;
  right: Node;
  outputType: Possible<ValueType> | undefined;
  pos: Position;
  nodeId: string;
};

// Built to support isDefined(test()), isDefined(boolean), and test()
export type FunctionNode = {
  nodeType: 'Function';
  name: string;
  args: Node[];
  outputType: Possible<ValueType>;
  pos: Position;
  nodeId: string;
}

export type ChooseNode = {
  nodeType: 'Choose';
  case: { predicate: Node, consequent: Node };
  otherwise: Node;
  outputType: Possible<ValueType>;
  pos: Position
  nodeId: string;
}

export type VariableAssignmentNode = {
  nodeType: 'VariableAssignment';
  name: string;
  assignment: Node;
  outputType: Possible<ValueType>;
  pos: Position;
  nodeId: string;
}

export type IdentifierNode = {
  nodeType: 'Identifier';
  name: string;
  assignmentId: string;
  outputType: Possible<ValueType>;
  pos: Position;
  nodeId: string;
}

export type Node = 
  | BooleanNode 
  | NumberNode 
  | ConstantNumberNode
  | BinaryOperationNode 
  | FunctionNode 
  | ChooseNode 
  | VariableAssignmentNode 
  | IdentifierNode
  | undefined;

// on to the proof of concept stuff

export type Definitely<ValueType> = {
  status: 'Definitely'; // do we need a status anymore?
  valueType: ValueType; // does this ensure if Definitely<boolean> than value is of type boolean?
}

export type Maybe<ValueType> = {
  status: 'Maybe-Undefined'; // maybe only status here? This way we can "change" status to definitely?
  valueType: ValueType;
}

export type ValueType = 'number' | 'boolean' | 'pair' | 'any' | undefined;

export type Possible<ValueType> = Definitely<ValueType> | Maybe<ValueType>;


