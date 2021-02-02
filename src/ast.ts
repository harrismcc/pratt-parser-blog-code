import {Position} from './position';
import {BinaryOperationTokenType} from './lexer';

export type NodeType =
  | 'SinkAssignment'
  | 'VariableAssignment'
  | 'Number'
  | 'Boolean'
  | 'String'
  | 'BinaryOperation'
  | 'Choose'
  | 'Identifier'
  | 'Function'
  | 'CalculatorReference';

export type NumberNode = {
  type: 'Number';
  value: number;
  pos: Position;
};

export type BooleanNode = {
  type: 'Boolean';
  value: boolean;
  pos: Position;
};

export type BinaryOperationNode = {
  type: 'BinaryOperation';
  operator: BinaryOperationTokenType;
  left: Node;
  right: Node;
  pos: Position;
};

export type FunctionNode = {
  type: 'Function';
  outputType: Maybe;
  pos: Position;
}

export type Node = BooleanNode | NumberNode | BinaryOperationNode | FunctionNode;

// on to the proof of concept stuff

export type MaybeDef = {
  status: 'Definitely';
  value: boolean;
}

export type MaybeUnd = {
  status: 'Maybe-Undefined';
  value: boolean;
  // dependsOn: {varName: boolean};
}

export type Maybe = MaybeDef | MaybeUnd;



