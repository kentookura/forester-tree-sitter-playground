import Parser from "web-tree-sitter";
import { Graphviz } from "@hpcc-js/wasm";
import toDot from "jgf-dot";

const base = import.meta.env.BASE_URL;
const graphvizLoaded = Graphviz.load();
const parserLoaded = loadParser();
const graphContainer = document.getElementById("graph");

const textarea = document.getElementById("code");
if (window.location.hash) {
  textarea.value = atob(window.location.hash.slice(1));
} else {
  textarea.value = '\\transclude{foo-0001}';
}

textarea.addEventListener("input", (e) => {
  window.location.hash = btoa(e.target.value);
  renderGraph(e.target.value, graphContainer);
});

function walk(node, branch = [0], parent) {
  let nodes = [];
  let edges = [];
  let label;
  console.log(branch.join("-"))
  if (node.type == "\\") {label = "\\\\"} else {label = node.type}
  const current = { id: branch.join("-"), label: label};
  //const current = { id: "foo", label: node.type };
  nodes.push(current);
  parent && edges.push({ source: parent.id, target: current.id });
  if (node.children.length) {
    node.children.forEach((child, j) => {
      const { nodes: childNodes, edges: childEdges } = walk(
        child,
        branch.concat([j]),
        current
      );
      nodes = nodes.concat(childNodes || []);
      edges = edges.concat(childEdges || []);
    });
  }
  return { nodes, edges };
}

async function renderGraph(code, container) {
  const parser = await parserLoaded;
  const tree = parser.parse(code);
  const { nodes, edges } = walk(tree.rootNode);
  const graphviz = await graphvizLoaded;
  const dot = toDot({
    graph: {
      nodes,
      edges,
    },
  });
  console.log(dot)
  const svg = await graphviz.layout(dot, "svg", "dot");
  container.innerHTML = svg //tree.rootNode.toString();
}

async function loadParser() {
  await Parser.init({
    locateFile(scriptName, scriptDirectory) {
      return `${base}${scriptName}`;
    },
  });
  const parser = new Parser();
  const Lang = await Parser.Language.load(`${base}tree-sitter-forester.wasm`);
  parser.setLanguage(Lang);
  return parser;
}
