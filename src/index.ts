import {getTokens} from './lexer';
import {create} from './editor';
import {parse} from './parser';
import {typecheck} from './typechecker';
import {mudCheck} from './mudChecker';
import * as AST from './ast';

const cmContainer = document.createElement('div');
cmContainer.className = 'cm-container';
document.body.appendChild(cmContainer);
const cm = create(cmContainer);

const outputContainer = document.createElement('pre');
outputContainer.className = 'output-container';
document.body.appendChild(outputContainer);

function updateOutput() {

  // adding a variable lookup table
  let varMap: {[key: string]: string} = {};
  let registeredNodes: {[key: string]: AST.Node} = {};
  let dependsMap: {[key: string]: string[]} = {};

  /***** ITERATION: Remove mudErrors *****/
  const ast = parse(cm.getDoc().getValue(), varMap, registeredNodes, dependsMap);
  const mudErrors = mudCheck(ast.nodes, registeredNodes, dependsMap); // add dependsMap
  const typeErrors = typecheck(ast.nodes, registeredNodes);
  const allTypeErrors = mudErrors.concat(typeErrors);

  if (ast.errors.length > 0) {
    cm.setOption('script-errors', ast.errors);
  } else {
    cm.setOption('script-errors', allTypeErrors);
  }

  const tokens = getTokens(cm.getDoc().getValue());
  outputContainer.innerHTML = `\
dependsMap: ${JSON.stringify(dependsMap, null, 2)}
mudErrors: ${JSON.stringify(mudErrors, null, 2)}
typeErrors: ${JSON.stringify(typeErrors, null, 2)}
ast: ${JSON.stringify(ast, null, 2)}
tokens: ${JSON.stringify(tokens, null, 2)}
`;
}

cm.on('change', updateOutput);
updateOutput();
