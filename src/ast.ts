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
  | 'ConstantNumberNode'
  | 'CalculatorReference';

export type NumberNode = {
  type: 'Number';
  value: number;
  pos: Position;
  isRuntime: boolean;
};

export type ConstantNumberNode = NumberNode;

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

export type SpamNode = {
  type: 'Spam',
  pos: Position
}

export type Node = BooleanNode | NumberNode | BinaryOperationNode | SpamNode;
