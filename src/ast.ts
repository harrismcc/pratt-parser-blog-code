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

// Built to support isDefined(test()), isDefined(boolean), and test()
export type FunctionNode = {
  type: 'Function';
  name: string;
  arg: ArgumentNode;
  outputType: MaybeUnd;
  pos: Position;
}

export type ArgumentNode = FunctionNode | BooleanNode | undefined;

export type Node = BooleanNode | NumberNode | BinaryOperationNode | FunctionNode;

// on to the proof of concept stuff

export type MaybeDef = {
  status: 'Definitely';
  value: boolean;
}

export type MaybeUnd = {
  status: 'Maybe-Undefined';
  value: boolean;
  // dependsOn: {varName: boolean}; // This is for when we add variables that could affect the type
}

export type Maybe = MaybeDef | MaybeUnd;



