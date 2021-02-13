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
  nodeType: 'Number';
  value: number;
  outputType: Definitely<ValueType>;
  pos: Position;
};

export type BooleanNode = {
  nodeType: 'Boolean';
  value: boolean;
  outputType: Definitely<ValueType>;
  pos: Position;
};

export type BinaryOperationNode = {
  nodeType: 'BinaryOperation';
  operator: BinaryOperationTokenType;
  left: Node;
  right: Node;
  outputType: Possible<ValueType> | undefined;
  pos: Position;
};

// Built to support isDefined(test()), isDefined(boolean), and test()
export type FunctionNode = {
  nodeType: 'Function';
  name: string;
  arg: Node;
  outputType: Possible<ValueType>;
  pos: Position;
}
/*
export type ChooseNode = {
  nodeType: 'Choose';
  case: { predicate: Node, consequent: Node };
  otherwise: Node;
  pos: Position
}
*/
export type Node = BooleanNode | NumberNode | BinaryOperationNode | FunctionNode| undefined;

// on to the proof of concept stuff

export type Definitely<ValueType> = {
  status: 'Definitely'; // do we need a status anymore?
  valueType: ValueType; // does this ensure if Definitely<boolean> than value is of type boolean?
}

export type Maybe<ValueType> = {
  status: 'Maybe-Undefined'; // maybe only status here? This way we can "change" status to definitely?
  valueType: ValueType;
  // dependsOn: {varName: boolean}; // This is for when we add variables that could affect the type
}

export type ValueType = 'number' | 'boolean' | 'any' | undefined;

export type Possible<ValueType> = Definitely<ValueType> | Maybe<ValueType>;
