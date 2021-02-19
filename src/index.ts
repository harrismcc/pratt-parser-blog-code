import {getTokens} from './lexer';
import {create} from './editor';
import {parse} from './parser';
import {typecheck} from './typechecker';

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

  const ast = parse(cm.getDoc().getValue(), varMap);
  const typeErrors = typecheck(ast.nodes);

  if (ast.errors.length > 0) {
    cm.setOption('script-errors', ast.errors);
  } else {
    cm.setOption('script-errors', typeErrors);
  }

  const tokens = getTokens(cm.getDoc().getValue());
  outputContainer.innerHTML = `\
typeErrors: ${JSON.stringify(typeErrors, null, 2)}
ast: ${JSON.stringify(ast, null, 2)}
tokens: ${JSON.stringify(tokens, null, 2)}
`;
}

cm.on('change', updateOutput);
updateOutput();
