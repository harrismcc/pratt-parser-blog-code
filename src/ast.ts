import {Position} from './position';
import {BinaryOperationTokenType} from './lexer';

export type NodeType =
  | 'SinkAssignment'
  | 'VariableAssignment'
  | 'Number'
  | 'Boolean'
  | 'BinaryOperation'
  | 'Choose'
  | 'Identifier'
  | 'Function'
  | 'Spam'
  | 'Function'
  | 'ConstantNumber'
  | 'CalculatorReference';

export type NumberNode = {
  type: 'Number';
  value: number;
  outputType: ValueType;
  pos: Position;
};

export type ConstantNumberNode = {
  type: 'ConstantNumber';
  value: number;
  outputType: ValueType;
  pos: Position;
};

export type BooleanNode = {
  type: 'Boolean';
  value: boolean;
  outputType: ValueType;
  pos: Position;
};

export type BinaryOperationNode = {
  type: 'BinaryOperation';
  operator: BinaryOperationTokenType;
  outputType: ValueType | undefined;
  left: Node;
  right: Node;
  pos: Position;
};

// Built to support isDefined(test()), isDefined(boolean), and test()
export type FunctionNode = {
  type: 'Function';
  name: string;
  args: Node[];
  outputType: ValueType | undefined;
  pos: Position;
  //nodeId: string;
}

export type SpamNode = {
  type: 'Spam',
  pos: Position,
  outputType: ValueType
}

export type Node = BooleanNode | NumberNode | BinaryOperationNode | SpamNode | ConstantNumberNode | FunctionNode;


export type ValueType = 'number' | 'boolean' | 'pair' | 'any' | 'string' | undefined;
