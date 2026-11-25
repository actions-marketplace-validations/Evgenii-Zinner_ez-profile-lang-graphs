// src/action.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// src/github.ts
var GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
async function fetchUserLanguages(username, token, includePrivate = false) {
  const privacyFilter = includePrivate ? "" : ", privacy: PUBLIC";
  const query = `
    query ($login: String!) {
      user(login: $login) {
        repositories(
          ownerAffiliations: OWNER
          isFork: false
          isArchived: false
          first: 100
          orderBy: { field: PUSHED_AT, direction: DESC }
          ${privacyFilter}
        ) {
          nodes {
            languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
              edges {
                size
                node {
                  name
                  color
                }
              }
            }
          }
        }
      }
    }
  `;
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "ez-profile-lang-graphs-action"
    },
    body: JSON.stringify({ query, variables: { login: username } })
  });
  if (!response.ok) {
    throw new Error(`GitHub API HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((e) => e.message).join("; "));
  }
  if (!payload.data?.user) {
    throw new Error(`GitHub user "${username}" not found`);
  }
  const totals = new Map;
  for (const repo of payload.data.user.repositories.nodes) {
    for (const edge of repo.languages.edges) {
      const { name, color } = edge.node;
      const existing = totals.get(name);
      if (existing) {
        existing.bytes += edge.size;
      } else {
        totals.set(name, {
          name,
          bytes: edge.size,
          color: color ?? "#6e7681"
        });
      }
    }
  }
  return Array.from(totals.values()).sort((a, b) => b.bytes - a.bytes);
}

// node_modules/d3-hierarchy/dist/d3-hierarchy.mjs
function count(node) {
  var sum = 0, children = node.children, i = children && children.length;
  if (!i)
    sum = 1;
  else
    while (--i >= 0)
      sum += children[i].value;
  node.value = sum;
}
function node_count() {
  return this.eachAfter(count);
}
function node_each(callback, that) {
  let index = -1;
  for (const node of this) {
    callback.call(that, node, ++index, this);
  }
  return this;
}
function node_eachBefore(callback, that) {
  var node = this, nodes = [node], children, i, index = -1;
  while (node = nodes.pop()) {
    callback.call(that, node, ++index, this);
    if (children = node.children) {
      for (i = children.length - 1;i >= 0; --i) {
        nodes.push(children[i]);
      }
    }
  }
  return this;
}
function node_eachAfter(callback, that) {
  var node = this, nodes = [node], next = [], children, i, n, index = -1;
  while (node = nodes.pop()) {
    next.push(node);
    if (children = node.children) {
      for (i = 0, n = children.length;i < n; ++i) {
        nodes.push(children[i]);
      }
    }
  }
  while (node = next.pop()) {
    callback.call(that, node, ++index, this);
  }
  return this;
}
function node_find(callback, that) {
  let index = -1;
  for (const node of this) {
    if (callback.call(that, node, ++index, this)) {
      return node;
    }
  }
}
function node_sum(value) {
  return this.eachAfter(function(node) {
    var sum = +value(node.data) || 0, children = node.children, i = children && children.length;
    while (--i >= 0)
      sum += children[i].value;
    node.value = sum;
  });
}
function node_sort(compare) {
  return this.eachBefore(function(node) {
    if (node.children) {
      node.children.sort(compare);
    }
  });
}
function node_path(end) {
  var start = this, ancestor = leastCommonAncestor(start, end), nodes = [start];
  while (start !== ancestor) {
    start = start.parent;
    nodes.push(start);
  }
  var k = nodes.length;
  while (end !== ancestor) {
    nodes.splice(k, 0, end);
    end = end.parent;
  }
  return nodes;
}
function leastCommonAncestor(a, b) {
  if (a === b)
    return a;
  var aNodes = a.ancestors(), bNodes = b.ancestors(), c = null;
  a = aNodes.pop();
  b = bNodes.pop();
  while (a === b) {
    c = a;
    a = aNodes.pop();
    b = bNodes.pop();
  }
  return c;
}
function node_ancestors() {
  var node = this, nodes = [node];
  while (node = node.parent) {
    nodes.push(node);
  }
  return nodes;
}
function node_descendants() {
  return Array.from(this);
}
function node_leaves() {
  var leaves = [];
  this.eachBefore(function(node) {
    if (!node.children) {
      leaves.push(node);
    }
  });
  return leaves;
}
function node_links() {
  var root = this, links = [];
  root.each(function(node) {
    if (node !== root) {
      links.push({ source: node.parent, target: node });
    }
  });
  return links;
}
function* node_iterator() {
  var node = this, current, next = [node], children, i, n;
  do {
    current = next.reverse(), next = [];
    while (node = current.pop()) {
      yield node;
      if (children = node.children) {
        for (i = 0, n = children.length;i < n; ++i) {
          next.push(children[i]);
        }
      }
    }
  } while (next.length);
}
function hierarchy(data, children) {
  if (data instanceof Map) {
    data = [undefined, data];
    if (children === undefined)
      children = mapChildren;
  } else if (children === undefined) {
    children = objectChildren;
  }
  var root = new Node$1(data), node, nodes = [root], child, childs, i, n;
  while (node = nodes.pop()) {
    if ((childs = children(node.data)) && (n = (childs = Array.from(childs)).length)) {
      node.children = childs;
      for (i = n - 1;i >= 0; --i) {
        nodes.push(child = childs[i] = new Node$1(childs[i]));
        child.parent = node;
        child.depth = node.depth + 1;
      }
    }
  }
  return root.eachBefore(computeHeight);
}
function node_copy() {
  return hierarchy(this).eachBefore(copyData);
}
function objectChildren(d) {
  return d.children;
}
function mapChildren(d) {
  return Array.isArray(d) ? d[1] : null;
}
function copyData(node) {
  if (node.data.value !== undefined)
    node.value = node.data.value;
  node.data = node.data.data;
}
function computeHeight(node) {
  var height = 0;
  do
    node.height = height;
  while ((node = node.parent) && node.height < ++height);
}
function Node$1(data) {
  this.data = data;
  this.depth = this.height = 0;
  this.parent = null;
}
Node$1.prototype = hierarchy.prototype = {
  constructor: Node$1,
  count: node_count,
  each: node_each,
  eachAfter: node_eachAfter,
  eachBefore: node_eachBefore,
  find: node_find,
  sum: node_sum,
  sort: node_sort,
  path: node_path,
  ancestors: node_ancestors,
  descendants: node_descendants,
  leaves: node_leaves,
  links: node_links,
  copy: node_copy,
  [Symbol.iterator]: node_iterator
};
function optional(f) {
  return f == null ? null : required(f);
}
function required(f) {
  if (typeof f !== "function")
    throw new Error;
  return f;
}
function constantZero() {
  return 0;
}
function constant(x) {
  return function() {
    return x;
  };
}
var a = 1664525;
var c = 1013904223;
var m = 4294967296;
function lcg() {
  let s = 1;
  return () => (s = (a * s + c) % m) / m;
}
function array(x) {
  return typeof x === "object" && "length" in x ? x : Array.from(x);
}
function shuffle(array, random) {
  let m = array.length, t, i;
  while (m) {
    i = random() * m-- | 0;
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return array;
}
function packEncloseRandom(circles, random) {
  var i = 0, n = (circles = shuffle(Array.from(circles), random)).length, B = [], p, e;
  while (i < n) {
    p = circles[i];
    if (e && enclosesWeak(e, p))
      ++i;
    else
      e = encloseBasis(B = extendBasis(B, p)), i = 0;
  }
  return e;
}
function extendBasis(B, p) {
  var i, j;
  if (enclosesWeakAll(p, B))
    return [p];
  for (i = 0;i < B.length; ++i) {
    if (enclosesNot(p, B[i]) && enclosesWeakAll(encloseBasis2(B[i], p), B)) {
      return [B[i], p];
    }
  }
  for (i = 0;i < B.length - 1; ++i) {
    for (j = i + 1;j < B.length; ++j) {
      if (enclosesNot(encloseBasis2(B[i], B[j]), p) && enclosesNot(encloseBasis2(B[i], p), B[j]) && enclosesNot(encloseBasis2(B[j], p), B[i]) && enclosesWeakAll(encloseBasis3(B[i], B[j], p), B)) {
        return [B[i], B[j], p];
      }
    }
  }
  throw new Error;
}
function enclosesNot(a, b) {
  var dr = a.r - b.r, dx = b.x - a.x, dy = b.y - a.y;
  return dr < 0 || dr * dr < dx * dx + dy * dy;
}
function enclosesWeak(a, b) {
  var dr = a.r - b.r + Math.max(a.r, b.r, 1) * 0.000000001, dx = b.x - a.x, dy = b.y - a.y;
  return dr > 0 && dr * dr > dx * dx + dy * dy;
}
function enclosesWeakAll(a, B) {
  for (var i = 0;i < B.length; ++i) {
    if (!enclosesWeak(a, B[i])) {
      return false;
    }
  }
  return true;
}
function encloseBasis(B) {
  switch (B.length) {
    case 1:
      return encloseBasis1(B[0]);
    case 2:
      return encloseBasis2(B[0], B[1]);
    case 3:
      return encloseBasis3(B[0], B[1], B[2]);
  }
}
function encloseBasis1(a) {
  return {
    x: a.x,
    y: a.y,
    r: a.r
  };
}
function encloseBasis2(a, b) {
  var { x: x1, y: y1, r: r1 } = a, { x: x2, y: y2, r: r2 } = b, x21 = x2 - x1, y21 = y2 - y1, r21 = r2 - r1, l = Math.sqrt(x21 * x21 + y21 * y21);
  return {
    x: (x1 + x2 + x21 / l * r21) / 2,
    y: (y1 + y2 + y21 / l * r21) / 2,
    r: (l + r1 + r2) / 2
  };
}
function encloseBasis3(a, b, c) {
  var { x: x1, y: y1, r: r1 } = a, { x: x2, y: y2, r: r2 } = b, { x: x3, y: y3, r: r3 } = c, a2 = x1 - x2, a3 = x1 - x3, b2 = y1 - y2, b3 = y1 - y3, c2 = r2 - r1, c3 = r3 - r1, d1 = x1 * x1 + y1 * y1 - r1 * r1, d2 = d1 - x2 * x2 - y2 * y2 + r2 * r2, d3 = d1 - x3 * x3 - y3 * y3 + r3 * r3, ab = a3 * b2 - a2 * b3, xa = (b2 * d3 - b3 * d2) / (ab * 2) - x1, xb = (b3 * c2 - b2 * c3) / ab, ya = (a3 * d2 - a2 * d3) / (ab * 2) - y1, yb = (a2 * c3 - a3 * c2) / ab, A = xb * xb + yb * yb - 1, B = 2 * (r1 + xa * xb + ya * yb), C = xa * xa + ya * ya - r1 * r1, r = -(Math.abs(A) > 0.000001 ? (B + Math.sqrt(B * B - 4 * A * C)) / (2 * A) : C / B);
  return {
    x: x1 + xa + xb * r,
    y: y1 + ya + yb * r,
    r
  };
}
function place(b, a, c) {
  var dx = b.x - a.x, x, a2, dy = b.y - a.y, y, b2, d2 = dx * dx + dy * dy;
  if (d2) {
    a2 = a.r + c.r, a2 *= a2;
    b2 = b.r + c.r, b2 *= b2;
    if (a2 > b2) {
      x = (d2 + b2 - a2) / (2 * d2);
      y = Math.sqrt(Math.max(0, b2 / d2 - x * x));
      c.x = b.x - x * dx - y * dy;
      c.y = b.y - x * dy + y * dx;
    } else {
      x = (d2 + a2 - b2) / (2 * d2);
      y = Math.sqrt(Math.max(0, a2 / d2 - x * x));
      c.x = a.x + x * dx - y * dy;
      c.y = a.y + x * dy + y * dx;
    }
  } else {
    c.x = a.x + c.r;
    c.y = a.y;
  }
}
function intersects(a, b) {
  var dr = a.r + b.r - 0.000001, dx = b.x - a.x, dy = b.y - a.y;
  return dr > 0 && dr * dr > dx * dx + dy * dy;
}
function score(node) {
  var a = node._, b = node.next._, ab = a.r + b.r, dx = (a.x * b.r + b.x * a.r) / ab, dy = (a.y * b.r + b.y * a.r) / ab;
  return dx * dx + dy * dy;
}
function Node(circle) {
  this._ = circle;
  this.next = null;
  this.previous = null;
}
function packSiblingsRandom(circles, random) {
  if (!(n = (circles = array(circles)).length))
    return 0;
  var a, b, c, n, aa, ca, i, j, k, sj, sk;
  a = circles[0], a.x = 0, a.y = 0;
  if (!(n > 1))
    return a.r;
  b = circles[1], a.x = -b.r, b.x = a.r, b.y = 0;
  if (!(n > 2))
    return a.r + b.r;
  place(b, a, c = circles[2]);
  a = new Node(a), b = new Node(b), c = new Node(c);
  a.next = c.previous = b;
  b.next = a.previous = c;
  c.next = b.previous = a;
  pack:
    for (i = 3;i < n; ++i) {
      place(a._, b._, c = circles[i]), c = new Node(c);
      j = b.next, k = a.previous, sj = b._.r, sk = a._.r;
      do {
        if (sj <= sk) {
          if (intersects(j._, c._)) {
            b = j, a.next = b, b.previous = a, --i;
            continue pack;
          }
          sj += j._.r, j = j.next;
        } else {
          if (intersects(k._, c._)) {
            a = k, a.next = b, b.previous = a, --i;
            continue pack;
          }
          sk += k._.r, k = k.previous;
        }
      } while (j !== k.next);
      c.previous = a, c.next = b, a.next = b.previous = b = c;
      aa = score(a);
      while ((c = c.next) !== b) {
        if ((ca = score(c)) < aa) {
          a = c, aa = ca;
        }
      }
      b = a.next;
    }
  a = [b._], c = b;
  while ((c = c.next) !== b)
    a.push(c._);
  c = packEncloseRandom(a, random);
  for (i = 0;i < n; ++i)
    a = circles[i], a.x -= c.x, a.y -= c.y;
  return c.r;
}
function defaultRadius(d) {
  return Math.sqrt(d.value);
}
function index$1() {
  var radius = null, dx = 1, dy = 1, padding = constantZero;
  function pack(root) {
    const random = lcg();
    root.x = dx / 2, root.y = dy / 2;
    if (radius) {
      root.eachBefore(radiusLeaf(radius)).eachAfter(packChildrenRandom(padding, 0.5, random)).eachBefore(translateChild(1));
    } else {
      root.eachBefore(radiusLeaf(defaultRadius)).eachAfter(packChildrenRandom(constantZero, 1, random)).eachAfter(packChildrenRandom(padding, root.r / Math.min(dx, dy), random)).eachBefore(translateChild(Math.min(dx, dy) / (2 * root.r)));
    }
    return root;
  }
  pack.radius = function(x) {
    return arguments.length ? (radius = optional(x), pack) : radius;
  };
  pack.size = function(x) {
    return arguments.length ? (dx = +x[0], dy = +x[1], pack) : [dx, dy];
  };
  pack.padding = function(x) {
    return arguments.length ? (padding = typeof x === "function" ? x : constant(+x), pack) : padding;
  };
  return pack;
}
function radiusLeaf(radius) {
  return function(node) {
    if (!node.children) {
      node.r = Math.max(0, +radius(node) || 0);
    }
  };
}
function packChildrenRandom(padding, k, random) {
  return function(node) {
    if (children = node.children) {
      var children, i, n = children.length, r = padding(node) * k || 0, e;
      if (r)
        for (i = 0;i < n; ++i)
          children[i].r += r;
      e = packSiblingsRandom(children, random);
      if (r)
        for (i = 0;i < n; ++i)
          children[i].r -= r;
      node.r = e + r;
    }
  };
}
function translateChild(k) {
  return function(node) {
    var parent = node.parent;
    node.r *= k;
    if (parent) {
      node.x = parent.x + k * node.x;
      node.y = parent.y + k * node.y;
    }
  };
}
function roundNode(node) {
  node.x0 = Math.round(node.x0);
  node.y0 = Math.round(node.y0);
  node.x1 = Math.round(node.x1);
  node.y1 = Math.round(node.y1);
}
function treemapDice(parent, x0, y0, x1, y1) {
  var nodes = parent.children, node, i = -1, n = nodes.length, k = parent.value && (x1 - x0) / parent.value;
  while (++i < n) {
    node = nodes[i], node.y0 = y0, node.y1 = y1;
    node.x0 = x0, node.x1 = x0 += node.value * k;
  }
}
function TreeNode(node, i) {
  this._ = node;
  this.parent = null;
  this.children = null;
  this.A = null;
  this.a = this;
  this.z = 0;
  this.m = 0;
  this.c = 0;
  this.s = 0;
  this.t = null;
  this.i = i;
}
TreeNode.prototype = Object.create(Node$1.prototype);
function treemapSlice(parent, x0, y0, x1, y1) {
  var nodes = parent.children, node, i = -1, n = nodes.length, k = parent.value && (y1 - y0) / parent.value;
  while (++i < n) {
    node = nodes[i], node.x0 = x0, node.x1 = x1;
    node.y0 = y0, node.y1 = y0 += node.value * k;
  }
}
var phi = (1 + Math.sqrt(5)) / 2;
function squarifyRatio(ratio, parent, x0, y0, x1, y1) {
  var rows = [], nodes = parent.children, row, nodeValue, i0 = 0, i1 = 0, n = nodes.length, dx, dy, value = parent.value, sumValue, minValue, maxValue, newRatio, minRatio, alpha, beta;
  while (i0 < n) {
    dx = x1 - x0, dy = y1 - y0;
    do
      sumValue = nodes[i1++].value;
    while (!sumValue && i1 < n);
    minValue = maxValue = sumValue;
    alpha = Math.max(dy / dx, dx / dy) / (value * ratio);
    beta = sumValue * sumValue * alpha;
    minRatio = Math.max(maxValue / beta, beta / minValue);
    for (;i1 < n; ++i1) {
      sumValue += nodeValue = nodes[i1].value;
      if (nodeValue < minValue)
        minValue = nodeValue;
      if (nodeValue > maxValue)
        maxValue = nodeValue;
      beta = sumValue * sumValue * alpha;
      newRatio = Math.max(maxValue / beta, beta / minValue);
      if (newRatio > minRatio) {
        sumValue -= nodeValue;
        break;
      }
      minRatio = newRatio;
    }
    rows.push(row = { value: sumValue, dice: dx < dy, children: nodes.slice(i0, i1) });
    if (row.dice)
      treemapDice(row, x0, y0, x1, value ? y0 += dy * sumValue / value : y1);
    else
      treemapSlice(row, x0, y0, value ? x0 += dx * sumValue / value : x1, y1);
    value -= sumValue, i0 = i1;
  }
  return rows;
}
var squarify = function custom(ratio) {
  function squarify(parent, x0, y0, x1, y1) {
    squarifyRatio(ratio, parent, x0, y0, x1, y1);
  }
  squarify.ratio = function(x) {
    return custom((x = +x) > 1 ? x : 1);
  };
  return squarify;
}(phi);
function index() {
  var tile = squarify, round = false, dx = 1, dy = 1, paddingStack = [0], paddingInner = constantZero, paddingTop = constantZero, paddingRight = constantZero, paddingBottom = constantZero, paddingLeft = constantZero;
  function treemap(root) {
    root.x0 = root.y0 = 0;
    root.x1 = dx;
    root.y1 = dy;
    root.eachBefore(positionNode);
    paddingStack = [0];
    if (round)
      root.eachBefore(roundNode);
    return root;
  }
  function positionNode(node) {
    var p = paddingStack[node.depth], x0 = node.x0 + p, y0 = node.y0 + p, x1 = node.x1 - p, y1 = node.y1 - p;
    if (x1 < x0)
      x0 = x1 = (x0 + x1) / 2;
    if (y1 < y0)
      y0 = y1 = (y0 + y1) / 2;
    node.x0 = x0;
    node.y0 = y0;
    node.x1 = x1;
    node.y1 = y1;
    if (node.children) {
      p = paddingStack[node.depth + 1] = paddingInner(node) / 2;
      x0 += paddingLeft(node) - p;
      y0 += paddingTop(node) - p;
      x1 -= paddingRight(node) - p;
      y1 -= paddingBottom(node) - p;
      if (x1 < x0)
        x0 = x1 = (x0 + x1) / 2;
      if (y1 < y0)
        y0 = y1 = (y0 + y1) / 2;
      tile(node, x0, y0, x1, y1);
    }
  }
  treemap.round = function(x) {
    return arguments.length ? (round = !!x, treemap) : round;
  };
  treemap.size = function(x) {
    return arguments.length ? (dx = +x[0], dy = +x[1], treemap) : [dx, dy];
  };
  treemap.tile = function(x) {
    return arguments.length ? (tile = required(x), treemap) : tile;
  };
  treemap.padding = function(x) {
    return arguments.length ? treemap.paddingInner(x).paddingOuter(x) : treemap.paddingInner();
  };
  treemap.paddingInner = function(x) {
    return arguments.length ? (paddingInner = typeof x === "function" ? x : constant(+x), treemap) : paddingInner;
  };
  treemap.paddingOuter = function(x) {
    return arguments.length ? treemap.paddingTop(x).paddingRight(x).paddingBottom(x).paddingLeft(x) : treemap.paddingTop();
  };
  treemap.paddingTop = function(x) {
    return arguments.length ? (paddingTop = typeof x === "function" ? x : constant(+x), treemap) : paddingTop;
  };
  treemap.paddingRight = function(x) {
    return arguments.length ? (paddingRight = typeof x === "function" ? x : constant(+x), treemap) : paddingRight;
  };
  treemap.paddingBottom = function(x) {
    return arguments.length ? (paddingBottom = typeof x === "function" ? x : constant(+x), treemap) : paddingBottom;
  };
  treemap.paddingLeft = function(x) {
    return arguments.length ? (paddingLeft = typeof x === "function" ? x : constant(+x), treemap) : paddingLeft;
  };
  return treemap;
}
var resquarify = function custom(ratio) {
  function resquarify(parent, x0, y0, x1, y1) {
    if ((rows = parent._squarify) && rows.ratio === ratio) {
      var rows, row, nodes, i, j = -1, n, m = rows.length, value = parent.value;
      while (++j < m) {
        row = rows[j], nodes = row.children;
        for (i = row.value = 0, n = nodes.length;i < n; ++i)
          row.value += nodes[i].value;
        if (row.dice)
          treemapDice(row, x0, y0, x1, value ? y0 += (y1 - y0) * row.value / value : y1);
        else
          treemapSlice(row, x0, y0, value ? x0 += (x1 - x0) * row.value / value : x1, y1);
        value -= row.value;
      }
    } else {
      parent._squarify = rows = squarifyRatio(ratio, parent, x0, y0, x1, y1);
      rows.ratio = ratio;
    }
  }
  resquarify.ratio = function(x) {
    return custom((x = +x) > 1 ? x : 1);
  };
  return resquarify;
}(phi);

// node_modules/d3-path/dist/d3-path.mjs
var pi = Math.PI;
var tau = 2 * pi;
var epsilon = 0.000001;
var tauEpsilon = tau - epsilon;
function append(strings) {
  this._ += strings[0];
  for (let i = 1, n = strings.length;i < n; ++i) {
    this._ += arguments[i] + strings[i];
  }
}
function appendRound(digits) {
  let d = Math.floor(digits);
  if (!(d >= 0))
    throw new Error(`invalid digits: ${digits}`);
  if (d > 15)
    return append;
  const k = 10 ** d;
  return function(strings) {
    this._ += strings[0];
    for (let i = 1, n = strings.length;i < n; ++i) {
      this._ += Math.round(arguments[i] * k) / k + strings[i];
    }
  };
}
function equal(x0, y0, x1, y1) {
  return x0 === x1 && y0 === y1;
}
function equalRound(digits) {
  const d = Math.floor(digits);
  if (!(d <= 15))
    return equal;
  const k = 10 ** d;
  const r = function(value) {
    return Math.round(value * k);
  };
  return function(x0, y0, x1, y1) {
    return r(x0) === r(x1) && r(y0) === r(y1);
  };
}

class Path {
  constructor(digits) {
    this._x0 = this._y0 = this._x1 = this._y1 = null;
    this._ = "";
    this._append = digits == null ? append : appendRound(digits);
    this._equal = digits == null ? equal : equalRound(digits);
  }
  moveTo(x, y) {
    this._append`M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}`;
  }
  closePath() {
    if (this._x1 !== null) {
      this._x1 = this._x0, this._y1 = this._y0;
      this._append`Z`;
    }
  }
  lineTo(x, y) {
    this._append`L${this._x1 = +x},${this._y1 = +y}`;
  }
  quadraticCurveTo(x1, y1, x, y) {
    this._append`Q${+x1},${+y1},${this._x1 = +x},${this._y1 = +y}`;
  }
  bezierCurveTo(x1, y1, x2, y2, x, y) {
    this._append`C${+x1},${+y1},${+x2},${+y2},${this._x1 = +x},${this._y1 = +y}`;
  }
  arcTo(x1, y1, x2, y2, r) {
    x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
    if (r < 0)
      throw new Error(`negative radius: ${r}`);
    let x0 = this._x1, y0 = this._y1, x21 = x2 - x1, y21 = y2 - y1, x01 = x0 - x1, y01 = y0 - y1, l01_2 = x01 * x01 + y01 * y01;
    if (this._x1 === null) {
      this._append`M${this._x1 = x1},${this._y1 = y1}`;
    } else if (!(l01_2 > epsilon))
      ;
    else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
      this._append`L${this._x1 = x1},${this._y1 = y1}`;
    } else {
      let x20 = x2 - x0, y20 = y2 - y0, l21_2 = x21 * x21 + y21 * y21, l20_2 = x20 * x20 + y20 * y20, l21 = Math.sqrt(l21_2), l01 = Math.sqrt(l01_2), l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2), t01 = l / l01, t21 = l / l21;
      if (Math.abs(t01 - 1) > epsilon) {
        this._append`L${x1 + t01 * x01},${y1 + t01 * y01}`;
      }
      this._append`A${r},${r},0,0,${+(y01 * x20 > x01 * y20)},${this._x1 = x1 + t21 * x21},${this._y1 = y1 + t21 * y21}`;
    }
  }
  arc(x, y, r, a0, a1, ccw) {
    x = +x, y = +y, r = +r, ccw = !!ccw;
    if (r < 0)
      throw new Error(`negative radius: ${r}`);
    let dx = r * Math.cos(a0), dy = r * Math.sin(a0), x0 = x + dx, y0 = y + dy, cw = 1 ^ ccw, da = ccw ? a0 - a1 : a1 - a0;
    if (this._x1 === null) {
      this._append`M${x0},${y0}`;
    } else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
      this._append`L${x0},${y0}`;
    }
    if (!r)
      return;
    if (da < 0)
      da = da % tau + tau;
    if (da > tauEpsilon) {
      this._append`A${r},${r},0,1,${cw},${x - dx},${y - dy}A${r},${r},0,1,${cw},${this._x1 = x0},${this._y1 = y0}`;
    } else if (da > epsilon) {
      const x1 = x + r * Math.cos(a1);
      const y1 = y + r * Math.sin(a1);
      if (da >= pi && this._equal(x0, y0, x1, y1)) {
        da /= 2;
        let a00 = a0 + da;
        this._append`A${r},${r},0,${+(da >= pi)},${cw},${x + r * Math.cos(a00)},${y + r * Math.sin(a00)}`;
      }
      this._append`A${r},${r},0,${+(da >= pi)},${cw},${this._x1 = x1},${this._y1 = y1}`;
    }
  }
  rect(x, y, w, h) {
    this._append`M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}h${w = +w}v${+h}h${-w}Z`;
  }
  toString() {
    return this._;
  }
}
function path() {
  return new Path;
}
path.prototype = Path.prototype;

// node_modules/d3-shape/dist/d3-shape.mjs
function constant2(x) {
  return function constant() {
    return x;
  };
}
var abs = Math.abs;
var atan2 = Math.atan2;
var cos = Math.cos;
var max = Math.max;
var min = Math.min;
var sin = Math.sin;
var sqrt = Math.sqrt;
var epsilon2 = 0.000000000001;
var pi2 = Math.PI;
var halfPi = pi2 / 2;
var tau2 = 2 * pi2;
function acos(x) {
  return x > 1 ? 0 : x < -1 ? pi2 : Math.acos(x);
}
function asin(x) {
  return x >= 1 ? halfPi : x <= -1 ? -halfPi : Math.asin(x);
}
function withPath(shape) {
  let digits = 3;
  shape.digits = function(_) {
    if (!arguments.length)
      return digits;
    if (_ == null) {
      digits = null;
    } else {
      const d = Math.floor(_);
      if (!(d >= 0))
        throw new RangeError(`invalid digits: ${_}`);
      digits = d;
    }
    return shape;
  };
  return () => new Path(digits);
}
function arcInnerRadius(d) {
  return d.innerRadius;
}
function arcOuterRadius(d) {
  return d.outerRadius;
}
function arcStartAngle(d) {
  return d.startAngle;
}
function arcEndAngle(d) {
  return d.endAngle;
}
function arcPadAngle(d) {
  return d && d.padAngle;
}
function intersect(x0, y0, x1, y1, x2, y2, x3, y3) {
  var x10 = x1 - x0, y10 = y1 - y0, x32 = x3 - x2, y32 = y3 - y2, t = y32 * x10 - x32 * y10;
  if (t * t < epsilon2)
    return;
  t = (x32 * (y0 - y2) - y32 * (x0 - x2)) / t;
  return [x0 + t * x10, y0 + t * y10];
}
function cornerTangents(x0, y0, x1, y1, r1, rc, cw) {
  var x01 = x0 - x1, y01 = y0 - y1, lo = (cw ? rc : -rc) / sqrt(x01 * x01 + y01 * y01), ox = lo * y01, oy = -lo * x01, x11 = x0 + ox, y11 = y0 + oy, x10 = x1 + ox, y10 = y1 + oy, x00 = (x11 + x10) / 2, y00 = (y11 + y10) / 2, dx = x10 - x11, dy = y10 - y11, d2 = dx * dx + dy * dy, r = r1 - rc, D = x11 * y10 - x10 * y11, d = (dy < 0 ? -1 : 1) * sqrt(max(0, r * r * d2 - D * D)), cx0 = (D * dy - dx * d) / d2, cy0 = (-D * dx - dy * d) / d2, cx1 = (D * dy + dx * d) / d2, cy1 = (-D * dx + dy * d) / d2, dx0 = cx0 - x00, dy0 = cy0 - y00, dx1 = cx1 - x00, dy1 = cy1 - y00;
  if (dx0 * dx0 + dy0 * dy0 > dx1 * dx1 + dy1 * dy1)
    cx0 = cx1, cy0 = cy1;
  return {
    cx: cx0,
    cy: cy0,
    x01: -ox,
    y01: -oy,
    x11: cx0 * (r1 / r - 1),
    y11: cy0 * (r1 / r - 1)
  };
}
function arc() {
  var innerRadius = arcInnerRadius, outerRadius = arcOuterRadius, cornerRadius = constant2(0), padRadius = null, startAngle = arcStartAngle, endAngle = arcEndAngle, padAngle = arcPadAngle, context = null, path = withPath(arc);
  function arc() {
    var buffer, r, r0 = +innerRadius.apply(this, arguments), r1 = +outerRadius.apply(this, arguments), a0 = startAngle.apply(this, arguments) - halfPi, a1 = endAngle.apply(this, arguments) - halfPi, da = abs(a1 - a0), cw = a1 > a0;
    if (!context)
      context = buffer = path();
    if (r1 < r0)
      r = r1, r1 = r0, r0 = r;
    if (!(r1 > epsilon2))
      context.moveTo(0, 0);
    else if (da > tau2 - epsilon2) {
      context.moveTo(r1 * cos(a0), r1 * sin(a0));
      context.arc(0, 0, r1, a0, a1, !cw);
      if (r0 > epsilon2) {
        context.moveTo(r0 * cos(a1), r0 * sin(a1));
        context.arc(0, 0, r0, a1, a0, cw);
      }
    } else {
      var a01 = a0, a11 = a1, a00 = a0, a10 = a1, da0 = da, da1 = da, ap = padAngle.apply(this, arguments) / 2, rp = ap > epsilon2 && (padRadius ? +padRadius.apply(this, arguments) : sqrt(r0 * r0 + r1 * r1)), rc = min(abs(r1 - r0) / 2, +cornerRadius.apply(this, arguments)), rc0 = rc, rc1 = rc, t0, t1;
      if (rp > epsilon2) {
        var p0 = asin(rp / r0 * sin(ap)), p1 = asin(rp / r1 * sin(ap));
        if ((da0 -= p0 * 2) > epsilon2)
          p0 *= cw ? 1 : -1, a00 += p0, a10 -= p0;
        else
          da0 = 0, a00 = a10 = (a0 + a1) / 2;
        if ((da1 -= p1 * 2) > epsilon2)
          p1 *= cw ? 1 : -1, a01 += p1, a11 -= p1;
        else
          da1 = 0, a01 = a11 = (a0 + a1) / 2;
      }
      var x01 = r1 * cos(a01), y01 = r1 * sin(a01), x10 = r0 * cos(a10), y10 = r0 * sin(a10);
      if (rc > epsilon2) {
        var x11 = r1 * cos(a11), y11 = r1 * sin(a11), x00 = r0 * cos(a00), y00 = r0 * sin(a00), oc;
        if (da < pi2) {
          if (oc = intersect(x01, y01, x00, y00, x11, y11, x10, y10)) {
            var ax = x01 - oc[0], ay = y01 - oc[1], bx = x11 - oc[0], by = y11 - oc[1], kc = 1 / sin(acos((ax * bx + ay * by) / (sqrt(ax * ax + ay * ay) * sqrt(bx * bx + by * by))) / 2), lc = sqrt(oc[0] * oc[0] + oc[1] * oc[1]);
            rc0 = min(rc, (r0 - lc) / (kc - 1));
            rc1 = min(rc, (r1 - lc) / (kc + 1));
          } else {
            rc0 = rc1 = 0;
          }
        }
      }
      if (!(da1 > epsilon2))
        context.moveTo(x01, y01);
      else if (rc1 > epsilon2) {
        t0 = cornerTangents(x00, y00, x01, y01, r1, rc1, cw);
        t1 = cornerTangents(x11, y11, x10, y10, r1, rc1, cw);
        context.moveTo(t0.cx + t0.x01, t0.cy + t0.y01);
        if (rc1 < rc)
          context.arc(t0.cx, t0.cy, rc1, atan2(t0.y01, t0.x01), atan2(t1.y01, t1.x01), !cw);
        else {
          context.arc(t0.cx, t0.cy, rc1, atan2(t0.y01, t0.x01), atan2(t0.y11, t0.x11), !cw);
          context.arc(0, 0, r1, atan2(t0.cy + t0.y11, t0.cx + t0.x11), atan2(t1.cy + t1.y11, t1.cx + t1.x11), !cw);
          context.arc(t1.cx, t1.cy, rc1, atan2(t1.y11, t1.x11), atan2(t1.y01, t1.x01), !cw);
        }
      } else
        context.moveTo(x01, y01), context.arc(0, 0, r1, a01, a11, !cw);
      if (!(r0 > epsilon2) || !(da0 > epsilon2))
        context.lineTo(x10, y10);
      else if (rc0 > epsilon2) {
        t0 = cornerTangents(x10, y10, x11, y11, r0, -rc0, cw);
        t1 = cornerTangents(x01, y01, x00, y00, r0, -rc0, cw);
        context.lineTo(t0.cx + t0.x01, t0.cy + t0.y01);
        if (rc0 < rc)
          context.arc(t0.cx, t0.cy, rc0, atan2(t0.y01, t0.x01), atan2(t1.y01, t1.x01), !cw);
        else {
          context.arc(t0.cx, t0.cy, rc0, atan2(t0.y01, t0.x01), atan2(t0.y11, t0.x11), !cw);
          context.arc(0, 0, r0, atan2(t0.cy + t0.y11, t0.cx + t0.x11), atan2(t1.cy + t1.y11, t1.cx + t1.x11), cw);
          context.arc(t1.cx, t1.cy, rc0, atan2(t1.y11, t1.x11), atan2(t1.y01, t1.x01), !cw);
        }
      } else
        context.arc(0, 0, r0, a10, a00, cw);
    }
    context.closePath();
    if (buffer)
      return context = null, buffer + "" || null;
  }
  arc.centroid = function() {
    var r = (+innerRadius.apply(this, arguments) + +outerRadius.apply(this, arguments)) / 2, a = (+startAngle.apply(this, arguments) + +endAngle.apply(this, arguments)) / 2 - pi2 / 2;
    return [cos(a) * r, sin(a) * r];
  };
  arc.innerRadius = function(_) {
    return arguments.length ? (innerRadius = typeof _ === "function" ? _ : constant2(+_), arc) : innerRadius;
  };
  arc.outerRadius = function(_) {
    return arguments.length ? (outerRadius = typeof _ === "function" ? _ : constant2(+_), arc) : outerRadius;
  };
  arc.cornerRadius = function(_) {
    return arguments.length ? (cornerRadius = typeof _ === "function" ? _ : constant2(+_), arc) : cornerRadius;
  };
  arc.padRadius = function(_) {
    return arguments.length ? (padRadius = _ == null ? null : typeof _ === "function" ? _ : constant2(+_), arc) : padRadius;
  };
  arc.startAngle = function(_) {
    return arguments.length ? (startAngle = typeof _ === "function" ? _ : constant2(+_), arc) : startAngle;
  };
  arc.endAngle = function(_) {
    return arguments.length ? (endAngle = typeof _ === "function" ? _ : constant2(+_), arc) : endAngle;
  };
  arc.padAngle = function(_) {
    return arguments.length ? (padAngle = typeof _ === "function" ? _ : constant2(+_), arc) : padAngle;
  };
  arc.context = function(_) {
    return arguments.length ? (context = _ == null ? null : _, arc) : context;
  };
  return arc;
}
var slice = Array.prototype.slice;
function Linear(context) {
  this._context = context;
}
Linear.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._point = 0;
  },
  lineEnd: function() {
    if (this._line || this._line !== 0 && this._point === 1)
      this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y);
        break;
      case 1:
        this._point = 2;
      default:
        this._context.lineTo(x, y);
        break;
    }
  }
};
function curveLinear(context) {
  return new Linear(context);
}
var curveRadialLinear = curveRadial(curveLinear);
function Radial(curve) {
  this._curve = curve;
}
Radial.prototype = {
  areaStart: function() {
    this._curve.areaStart();
  },
  areaEnd: function() {
    this._curve.areaEnd();
  },
  lineStart: function() {
    this._curve.lineStart();
  },
  lineEnd: function() {
    this._curve.lineEnd();
  },
  point: function(a, r) {
    this._curve.point(r * Math.sin(a), r * -Math.cos(a));
  }
};
function curveRadial(curve) {
  function radial(context) {
    return new Radial(curve(context));
  }
  radial._curve = curve;
  return radial;
}
var sqrt3$2 = sqrt(3);
var tan30 = sqrt(1 / 3);
var tan30_2 = tan30 * 2;
var kr = sin(pi2 / 10) / sin(7 * pi2 / 10);
var kx = sin(tau2 / 10) * kr;
var ky = -cos(tau2 / 10) * kr;
var sqrt3$1 = sqrt(3);
var sqrt3 = sqrt(3);
var s = sqrt(3) / 2;
var k = 1 / sqrt(12);
var a2 = (k / 2 + 1) * 3;
function noop() {}
function point$3(that, x, y) {
  that._context.bezierCurveTo((2 * that._x0 + that._x1) / 3, (2 * that._y0 + that._y1) / 3, (that._x0 + 2 * that._x1) / 3, (that._y0 + 2 * that._y1) / 3, (that._x0 + 4 * that._x1 + x) / 6, (that._y0 + 4 * that._y1 + y) / 6);
}
function Basis(context) {
  this._context = context;
}
Basis.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._y0 = this._y1 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 3:
        point$3(this, this._x1, this._y1);
      case 2:
        this._context.lineTo(this._x1, this._y1);
        break;
    }
    if (this._line || this._line !== 0 && this._point === 1)
      this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y);
        break;
      case 1:
        this._point = 2;
        break;
      case 2:
        this._point = 3;
        this._context.lineTo((5 * this._x0 + this._x1) / 6, (5 * this._y0 + this._y1) / 6);
      default:
        point$3(this, x, y);
        break;
    }
    this._x0 = this._x1, this._x1 = x;
    this._y0 = this._y1, this._y1 = y;
  }
};
function BasisClosed(context) {
  this._context = context;
}
BasisClosed.prototype = {
  areaStart: noop,
  areaEnd: noop,
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 1: {
        this._context.moveTo(this._x2, this._y2);
        this._context.closePath();
        break;
      }
      case 2: {
        this._context.moveTo((this._x2 + 2 * this._x3) / 3, (this._y2 + 2 * this._y3) / 3);
        this._context.lineTo((this._x3 + 2 * this._x2) / 3, (this._y3 + 2 * this._y2) / 3);
        this._context.closePath();
        break;
      }
      case 3: {
        this.point(this._x2, this._y2);
        this.point(this._x3, this._y3);
        this.point(this._x4, this._y4);
        break;
      }
    }
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._x2 = x, this._y2 = y;
        break;
      case 1:
        this._point = 2;
        this._x3 = x, this._y3 = y;
        break;
      case 2:
        this._point = 3;
        this._x4 = x, this._y4 = y;
        this._context.moveTo((this._x0 + 4 * this._x1 + x) / 6, (this._y0 + 4 * this._y1 + y) / 6);
        break;
      default:
        point$3(this, x, y);
        break;
    }
    this._x0 = this._x1, this._x1 = x;
    this._y0 = this._y1, this._y1 = y;
  }
};
function BasisOpen(context) {
  this._context = context;
}
BasisOpen.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._y0 = this._y1 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    if (this._line || this._line !== 0 && this._point === 3)
      this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0:
        this._point = 1;
        break;
      case 1:
        this._point = 2;
        break;
      case 2:
        this._point = 3;
        var x0 = (this._x0 + 4 * this._x1 + x) / 6, y0 = (this._y0 + 4 * this._y1 + y) / 6;
        this._line ? this._context.lineTo(x0, y0) : this._context.moveTo(x0, y0);
        break;
      case 3:
        this._point = 4;
      default:
        point$3(this, x, y);
        break;
    }
    this._x0 = this._x1, this._x1 = x;
    this._y0 = this._y1, this._y1 = y;
  }
};
function Bundle(context, beta) {
  this._basis = new Basis(context);
  this._beta = beta;
}
Bundle.prototype = {
  lineStart: function() {
    this._x = [];
    this._y = [];
    this._basis.lineStart();
  },
  lineEnd: function() {
    var x = this._x, y = this._y, j = x.length - 1;
    if (j > 0) {
      var x0 = x[0], y0 = y[0], dx = x[j] - x0, dy = y[j] - y0, i = -1, t;
      while (++i <= j) {
        t = i / j;
        this._basis.point(this._beta * x[i] + (1 - this._beta) * (x0 + t * dx), this._beta * y[i] + (1 - this._beta) * (y0 + t * dy));
      }
    }
    this._x = this._y = null;
    this._basis.lineEnd();
  },
  point: function(x, y) {
    this._x.push(+x);
    this._y.push(+y);
  }
};
var bundle = function custom(beta) {
  function bundle(context) {
    return beta === 1 ? new Basis(context) : new Bundle(context, beta);
  }
  bundle.beta = function(beta) {
    return custom(+beta);
  };
  return bundle;
}(0.85);
function point$2(that, x, y) {
  that._context.bezierCurveTo(that._x1 + that._k * (that._x2 - that._x0), that._y1 + that._k * (that._y2 - that._y0), that._x2 + that._k * (that._x1 - x), that._y2 + that._k * (that._y1 - y), that._x2, that._y2);
}
function Cardinal(context, tension) {
  this._context = context;
  this._k = (1 - tension) / 6;
}
Cardinal.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._y0 = this._y1 = this._y2 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 2:
        this._context.lineTo(this._x2, this._y2);
        break;
      case 3:
        point$2(this, this._x1, this._y1);
        break;
    }
    if (this._line || this._line !== 0 && this._point === 1)
      this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y);
        break;
      case 1:
        this._point = 2;
        this._x1 = x, this._y1 = y;
        break;
      case 2:
        this._point = 3;
      default:
        point$2(this, x, y);
        break;
    }
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
  }
};
var cardinal = function custom(tension) {
  function cardinal(context) {
    return new Cardinal(context, tension);
  }
  cardinal.tension = function(tension) {
    return custom(+tension);
  };
  return cardinal;
}(0);
function CardinalClosed(context, tension) {
  this._context = context;
  this._k = (1 - tension) / 6;
}
CardinalClosed.prototype = {
  areaStart: noop,
  areaEnd: noop,
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._x5 = this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = this._y5 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 1: {
        this._context.moveTo(this._x3, this._y3);
        this._context.closePath();
        break;
      }
      case 2: {
        this._context.lineTo(this._x3, this._y3);
        this._context.closePath();
        break;
      }
      case 3: {
        this.point(this._x3, this._y3);
        this.point(this._x4, this._y4);
        this.point(this._x5, this._y5);
        break;
      }
    }
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._x3 = x, this._y3 = y;
        break;
      case 1:
        this._point = 2;
        this._context.moveTo(this._x4 = x, this._y4 = y);
        break;
      case 2:
        this._point = 3;
        this._x5 = x, this._y5 = y;
        break;
      default:
        point$2(this, x, y);
        break;
    }
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
  }
};
var cardinalClosed = function custom(tension) {
  function cardinal(context) {
    return new CardinalClosed(context, tension);
  }
  cardinal.tension = function(tension) {
    return custom(+tension);
  };
  return cardinal;
}(0);
function CardinalOpen(context, tension) {
  this._context = context;
  this._k = (1 - tension) / 6;
}
CardinalOpen.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._y0 = this._y1 = this._y2 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    if (this._line || this._line !== 0 && this._point === 3)
      this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0:
        this._point = 1;
        break;
      case 1:
        this._point = 2;
        break;
      case 2:
        this._point = 3;
        this._line ? this._context.lineTo(this._x2, this._y2) : this._context.moveTo(this._x2, this._y2);
        break;
      case 3:
        this._point = 4;
      default:
        point$2(this, x, y);
        break;
    }
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
  }
};
var cardinalOpen = function custom(tension) {
  function cardinal(context) {
    return new CardinalOpen(context, tension);
  }
  cardinal.tension = function(tension) {
    return custom(+tension);
  };
  return cardinal;
}(0);
function point$1(that, x, y) {
  var { _x1: x1, _y1: y1, _x2: x2, _y2: y2 } = that;
  if (that._l01_a > epsilon2) {
    var a = 2 * that._l01_2a + 3 * that._l01_a * that._l12_a + that._l12_2a, n = 3 * that._l01_a * (that._l01_a + that._l12_a);
    x1 = (x1 * a - that._x0 * that._l12_2a + that._x2 * that._l01_2a) / n;
    y1 = (y1 * a - that._y0 * that._l12_2a + that._y2 * that._l01_2a) / n;
  }
  if (that._l23_a > epsilon2) {
    var b = 2 * that._l23_2a + 3 * that._l23_a * that._l12_a + that._l12_2a, m = 3 * that._l23_a * (that._l23_a + that._l12_a);
    x2 = (x2 * b + that._x1 * that._l23_2a - x * that._l12_2a) / m;
    y2 = (y2 * b + that._y1 * that._l23_2a - y * that._l12_2a) / m;
  }
  that._context.bezierCurveTo(x1, y1, x2, y2, that._x2, that._y2);
}
function CatmullRom(context, alpha) {
  this._context = context;
  this._alpha = alpha;
}
CatmullRom.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._y0 = this._y1 = this._y2 = NaN;
    this._l01_a = this._l12_a = this._l23_a = this._l01_2a = this._l12_2a = this._l23_2a = this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 2:
        this._context.lineTo(this._x2, this._y2);
        break;
      case 3:
        this.point(this._x2, this._y2);
        break;
    }
    if (this._line || this._line !== 0 && this._point === 1)
      this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    if (this._point) {
      var x23 = this._x2 - x, y23 = this._y2 - y;
      this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
    }
    switch (this._point) {
      case 0:
        this._point = 1;
        this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y);
        break;
      case 1:
        this._point = 2;
        break;
      case 2:
        this._point = 3;
      default:
        point$1(this, x, y);
        break;
    }
    this._l01_a = this._l12_a, this._l12_a = this._l23_a;
    this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
  }
};
var catmullRom = function custom(alpha) {
  function catmullRom(context) {
    return alpha ? new CatmullRom(context, alpha) : new Cardinal(context, 0);
  }
  catmullRom.alpha = function(alpha) {
    return custom(+alpha);
  };
  return catmullRom;
}(0.5);
function CatmullRomClosed(context, alpha) {
  this._context = context;
  this._alpha = alpha;
}
CatmullRomClosed.prototype = {
  areaStart: noop,
  areaEnd: noop,
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._x3 = this._x4 = this._x5 = this._y0 = this._y1 = this._y2 = this._y3 = this._y4 = this._y5 = NaN;
    this._l01_a = this._l12_a = this._l23_a = this._l01_2a = this._l12_2a = this._l23_2a = this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 1: {
        this._context.moveTo(this._x3, this._y3);
        this._context.closePath();
        break;
      }
      case 2: {
        this._context.lineTo(this._x3, this._y3);
        this._context.closePath();
        break;
      }
      case 3: {
        this.point(this._x3, this._y3);
        this.point(this._x4, this._y4);
        this.point(this._x5, this._y5);
        break;
      }
    }
  },
  point: function(x, y) {
    x = +x, y = +y;
    if (this._point) {
      var x23 = this._x2 - x, y23 = this._y2 - y;
      this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
    }
    switch (this._point) {
      case 0:
        this._point = 1;
        this._x3 = x, this._y3 = y;
        break;
      case 1:
        this._point = 2;
        this._context.moveTo(this._x4 = x, this._y4 = y);
        break;
      case 2:
        this._point = 3;
        this._x5 = x, this._y5 = y;
        break;
      default:
        point$1(this, x, y);
        break;
    }
    this._l01_a = this._l12_a, this._l12_a = this._l23_a;
    this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
  }
};
var catmullRomClosed = function custom(alpha) {
  function catmullRom(context) {
    return alpha ? new CatmullRomClosed(context, alpha) : new CardinalClosed(context, 0);
  }
  catmullRom.alpha = function(alpha) {
    return custom(+alpha);
  };
  return catmullRom;
}(0.5);
function CatmullRomOpen(context, alpha) {
  this._context = context;
  this._alpha = alpha;
}
CatmullRomOpen.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._x2 = this._y0 = this._y1 = this._y2 = NaN;
    this._l01_a = this._l12_a = this._l23_a = this._l01_2a = this._l12_2a = this._l23_2a = this._point = 0;
  },
  lineEnd: function() {
    if (this._line || this._line !== 0 && this._point === 3)
      this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    if (this._point) {
      var x23 = this._x2 - x, y23 = this._y2 - y;
      this._l23_a = Math.sqrt(this._l23_2a = Math.pow(x23 * x23 + y23 * y23, this._alpha));
    }
    switch (this._point) {
      case 0:
        this._point = 1;
        break;
      case 1:
        this._point = 2;
        break;
      case 2:
        this._point = 3;
        this._line ? this._context.lineTo(this._x2, this._y2) : this._context.moveTo(this._x2, this._y2);
        break;
      case 3:
        this._point = 4;
      default:
        point$1(this, x, y);
        break;
    }
    this._l01_a = this._l12_a, this._l12_a = this._l23_a;
    this._l01_2a = this._l12_2a, this._l12_2a = this._l23_2a;
    this._x0 = this._x1, this._x1 = this._x2, this._x2 = x;
    this._y0 = this._y1, this._y1 = this._y2, this._y2 = y;
  }
};
var catmullRomOpen = function custom(alpha) {
  function catmullRom(context) {
    return alpha ? new CatmullRomOpen(context, alpha) : new CardinalOpen(context, 0);
  }
  catmullRom.alpha = function(alpha) {
    return custom(+alpha);
  };
  return catmullRom;
}(0.5);
function LinearClosed(context) {
  this._context = context;
}
LinearClosed.prototype = {
  areaStart: noop,
  areaEnd: noop,
  lineStart: function() {
    this._point = 0;
  },
  lineEnd: function() {
    if (this._point)
      this._context.closePath();
  },
  point: function(x, y) {
    x = +x, y = +y;
    if (this._point)
      this._context.lineTo(x, y);
    else
      this._point = 1, this._context.moveTo(x, y);
  }
};
function sign(x) {
  return x < 0 ? -1 : 1;
}
function slope3(that, x2, y2) {
  var h0 = that._x1 - that._x0, h1 = x2 - that._x1, s0 = (that._y1 - that._y0) / (h0 || h1 < 0 && -0), s1 = (y2 - that._y1) / (h1 || h0 < 0 && -0), p = (s0 * h1 + s1 * h0) / (h0 + h1);
  return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
}
function slope2(that, t) {
  var h = that._x1 - that._x0;
  return h ? (3 * (that._y1 - that._y0) / h - t) / 2 : t;
}
function point(that, t0, t1) {
  var { _x0: x0, _y0: y0, _x1: x1, _y1: y1 } = that, dx = (x1 - x0) / 3;
  that._context.bezierCurveTo(x0 + dx, y0 + dx * t0, x1 - dx, y1 - dx * t1, x1, y1);
}
function MonotoneX(context) {
  this._context = context;
}
MonotoneX.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x0 = this._x1 = this._y0 = this._y1 = this._t0 = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    switch (this._point) {
      case 2:
        this._context.lineTo(this._x1, this._y1);
        break;
      case 3:
        point(this, this._t0, slope2(this, this._t0));
        break;
    }
    if (this._line || this._line !== 0 && this._point === 1)
      this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x, y) {
    var t1 = NaN;
    x = +x, y = +y;
    if (x === this._x1 && y === this._y1)
      return;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y);
        break;
      case 1:
        this._point = 2;
        break;
      case 2:
        this._point = 3;
        point(this, slope2(this, t1 = slope3(this, x, y)), t1);
        break;
      default:
        point(this, this._t0, t1 = slope3(this, x, y));
        break;
    }
    this._x0 = this._x1, this._x1 = x;
    this._y0 = this._y1, this._y1 = y;
    this._t0 = t1;
  }
};
function MonotoneY(context) {
  this._context = new ReflectContext(context);
}
(MonotoneY.prototype = Object.create(MonotoneX.prototype)).point = function(x, y) {
  MonotoneX.prototype.point.call(this, y, x);
};
function ReflectContext(context) {
  this._context = context;
}
ReflectContext.prototype = {
  moveTo: function(x, y) {
    this._context.moveTo(y, x);
  },
  closePath: function() {
    this._context.closePath();
  },
  lineTo: function(x, y) {
    this._context.lineTo(y, x);
  },
  bezierCurveTo: function(x1, y1, x2, y2, x, y) {
    this._context.bezierCurveTo(y1, x1, y2, x2, y, x);
  }
};
function Natural(context) {
  this._context = context;
}
Natural.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x = [];
    this._y = [];
  },
  lineEnd: function() {
    var x = this._x, y = this._y, n = x.length;
    if (n) {
      this._line ? this._context.lineTo(x[0], y[0]) : this._context.moveTo(x[0], y[0]);
      if (n === 2) {
        this._context.lineTo(x[1], y[1]);
      } else {
        var px = controlPoints(x), py = controlPoints(y);
        for (var i0 = 0, i1 = 1;i1 < n; ++i0, ++i1) {
          this._context.bezierCurveTo(px[0][i0], py[0][i0], px[1][i0], py[1][i0], x[i1], y[i1]);
        }
      }
    }
    if (this._line || this._line !== 0 && n === 1)
      this._context.closePath();
    this._line = 1 - this._line;
    this._x = this._y = null;
  },
  point: function(x, y) {
    this._x.push(+x);
    this._y.push(+y);
  }
};
function controlPoints(x) {
  var i, n = x.length - 1, m, a = new Array(n), b = new Array(n), r = new Array(n);
  a[0] = 0, b[0] = 2, r[0] = x[0] + 2 * x[1];
  for (i = 1;i < n - 1; ++i)
    a[i] = 1, b[i] = 4, r[i] = 4 * x[i] + 2 * x[i + 1];
  a[n - 1] = 2, b[n - 1] = 7, r[n - 1] = 8 * x[n - 1] + x[n];
  for (i = 1;i < n; ++i)
    m = a[i] / b[i - 1], b[i] -= m, r[i] -= m * r[i - 1];
  a[n - 1] = r[n - 1] / b[n - 1];
  for (i = n - 2;i >= 0; --i)
    a[i] = (r[i] - a[i + 1]) / b[i];
  b[n - 1] = (x[n] + a[n - 1]) / 2;
  for (i = 0;i < n - 1; ++i)
    b[i] = 2 * x[i + 1] - a[i + 1];
  return [a, b];
}
function Step(context, t) {
  this._context = context;
  this._t = t;
}
Step.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._x = this._y = NaN;
    this._point = 0;
  },
  lineEnd: function() {
    if (0 < this._t && this._t < 1 && this._point === 2)
      this._context.lineTo(this._x, this._y);
    if (this._line || this._line !== 0 && this._point === 1)
      this._context.closePath();
    if (this._line >= 0)
      this._t = 1 - this._t, this._line = 1 - this._line;
  },
  point: function(x, y) {
    x = +x, y = +y;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y);
        break;
      case 1:
        this._point = 2;
      default: {
        if (this._t <= 0) {
          this._context.lineTo(this._x, y);
          this._context.lineTo(x, y);
        } else {
          var x1 = this._x * (1 - this._t) + x * this._t;
          this._context.lineTo(x1, this._y);
          this._context.lineTo(x1, y);
        }
        break;
      }
    }
    this._x = x, this._y = y;
  }
};

// src/taxonomy.ts
var DOMAINS = ["Web", "Mobile", "Systems", "Backend", "Data & Ops"];
var DOMAIN_COLORS = {
  Web: "#3178c6",
  Mobile: "#00b4ab",
  Systems: "#f74c00",
  Backend: "#a371f7",
  "Data & Ops": "#3fb950",
  Other: "#6e7681"
};
var LANGUAGE_DOMAIN = {
  TypeScript: "Web",
  TSX: "Web",
  JavaScript: "Web",
  JSX: "Web",
  CoffeeScript: "Web",
  HTML: "Web",
  CSS: "Web",
  SCSS: "Web",
  Sass: "Web",
  Less: "Web",
  Astro: "Web",
  Vue: "Web",
  Svelte: "Web",
  MDX: "Web",
  WebAssembly: "Web",
  Dart: "Mobile",
  Swift: "Mobile",
  Kotlin: "Mobile",
  "Objective-C": "Mobile",
  "Objective-C++": "Mobile",
  Rust: "Systems",
  C: "Systems",
  "C++": "Systems",
  Zig: "Systems",
  Assembly: "Systems",
  CMake: "Systems",
  Makefile: "Systems",
  GLSL: "Systems",
  HLSL: "Systems",
  WGSL: "Systems",
  ShaderLab: "Systems",
  CUDA: "Systems",
  Go: "Backend",
  Java: "Backend",
  Scala: "Backend",
  "C#": "Backend",
  "F#": "Backend",
  Ruby: "Backend",
  PHP: "Backend",
  Elixir: "Backend",
  Erlang: "Backend",
  SQL: "Backend",
  PLpgSQL: "Backend",
  Haskell: "Backend",
  Clojure: "Backend",
  Python: "Data & Ops",
  "Jupyter Notebook": "Data & Ops",
  R: "Data & Ops",
  Julia: "Data & Ops",
  Shell: "Data & Ops",
  PowerShell: "Data & Ops",
  Dockerfile: "Data & Ops",
  HCL: "Data & Ops",
  Nix: "Data & Ops",
  YAML: "Data & Ops",
  TOML: "Data & Ops",
  JSON: "Data & Ops",
  JSONC: "Data & Ops",
  JSON5: "Data & Ops",
  Markdown: "Data & Ops"
};
function filterLanguagesByDomains(stats, includedDomains = DOMAINS) {
  const included = new Set(includedDomains);
  return stats.filter((stat) => {
    if (stat.bytes <= 0)
      return false;
    const domain = LANGUAGE_DOMAIN[stat.name] ?? "Other";
    return included.has(domain);
  });
}
function buildLanguageHierarchy(stats, includedDomains = DOMAINS) {
  const domains = new Map;
  const included = new Set(includedDomains);
  for (const stat of stats) {
    if (stat.bytes <= 0)
      continue;
    const domainName = LANGUAGE_DOMAIN[stat.name] ?? "Other";
    if (!included.has(domainName))
      continue;
    let items = domains.get(domainName);
    if (!items) {
      items = [];
      domains.set(domainName, items);
    }
    items.push(stat);
  }
  const domainChildren = [];
  for (const [domainName, items] of domains) {
    const domainColor = DOMAIN_COLORS[domainName] ?? DOMAIN_COLORS.Other;
    domainChildren.push({
      name: domainName,
      color: domainColor,
      children: items.map((item) => ({
        name: item.name,
        color: item.color || domainColor,
        value: item.bytes
      }))
    });
  }
  return {
    name: "Languages",
    children: domainChildren
  };
}
function computeDomainScores(stats, includedDomains = DOMAINS) {
  const domainBytes = new Map;
  for (const domain of includedDomains) {
    domainBytes.set(domain, 0);
  }
  let totalBytes = 0;
  for (const stat of stats) {
    if (stat.bytes <= 0)
      continue;
    totalBytes += stat.bytes;
    const domain = LANGUAGE_DOMAIN[stat.name];
    if (domain) {
      domainBytes.set(domain, (domainBytes.get(domain) ?? 0) + stat.bytes);
    }
  }
  const rawEntries = includedDomains.map((domain) => {
    const bytes = domainBytes.get(domain) ?? 0;
    const share = totalBytes > 0 ? bytes / totalBytes : 0;
    const raw = share > 0 ? share ** 0.35 : 0;
    return { domain, bytes, share, raw };
  });
  const maxRaw = rawEntries.reduce((max, entry) => Math.max(max, entry.raw), 0);
  return rawEntries.map((entry) => ({
    domain: entry.domain,
    color: DOMAIN_COLORS[entry.domain],
    bytes: entry.bytes,
    share: entry.share,
    score: maxRaw > 0 ? entry.raw / maxRaw : 0
  }));
}

// src/render.ts
var THEMES = {
  dark: {
    bg: "#0d1117",
    border: "#30363d",
    title: "#e6edf3",
    text: "#c9d1d9",
    muted: "#8b949e",
    stroke: "#0d1117",
    track: "#21262d",
    accent: "#58a6ff"
  },
  light: {
    bg: "#ffffff",
    border: "#d0d7de",
    title: "#1f2328",
    text: "#24292f",
    muted: "#656d76",
    stroke: "#ffffff",
    track: "#eaeef2",
    accent: "#0969da"
  }
};
function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function getDomainSubtext(domainNode) {
  const langs = domainNode.leaves().sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 4).map((l) => l.data.name);
  const text = langs.join(" · ");
  return text.length > 34 ? `${text.slice(0, 33)}…` : text;
}
function contrastTextColor(hex) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6)
    return "#ffffff";
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#0d1117" : "#ffffff";
}
function renderEmptySvg(theme, hideBorder) {
  const stroke = hideBorder ? "none" : theme.border;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="240" viewBox="0 0 540 240">
  <rect x="0.5" y="0.5" width="539" height="239" rx="10" fill="${theme.bg}" stroke="${stroke}"/>
  <text x="270" y="124" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="13" fill="${theme.muted}">No language data found.</text>
</svg>`;
}
function renderDomainLegend(domains, totalBytes, theme, height) {
  const topDomains = domains.slice(0, 5);
  const legendStartY = Math.max(32, Math.round((height - topDomains.length * 38) / 2) + 18);
  return topDomains.map((d, i) => {
    const y = legendStartY + i * 38;
    const pct = ((d.value ?? 0) / totalBytes * 100).toFixed(1);
    const delay = (0.15 + i * 0.09).toFixed(2);
    const sub = getDomainSubtext(d);
    return `<g transform="translate(274, ${y})"><g class="row" style="animation-delay:${delay}s">
      <rect width="10" height="10" rx="3" y="-9" fill="${d.data.color ?? "#6e7681"}"/>
      <text x="18" y="0" font-size="12.5" font-weight="600" fill="${theme.text}">${escapeXml(d.data.name)}</text>
      <text x="242" y="0" text-anchor="end" font-size="12.5" font-weight="600" fill="${theme.title}">${pct}%</text>
      <text x="18" y="14" font-size="10.5" fill="${theme.muted}">${escapeXml(sub)}</text>
    </g></g>`;
  }).join(`
  `);
}
function renderLanguageLegend(languages, totalBytes, theme, height) {
  const topLanguages = languages.slice(0, 6);
  const legendStartY = Math.max(32, Math.round((height - topLanguages.length * 38) / 2) + 18);
  return topLanguages.map((language, i) => {
    const y = legendStartY + i * 38;
    const pct = (language.bytes / totalBytes * 100).toFixed(1);
    const delay = (0.15 + i * 0.09).toFixed(2);
    return `<g transform="translate(274, ${y})"><g class="row" style="animation-delay:${delay}s">
      <rect width="10" height="10" rx="3" y="-9" fill="${language.color || "#6e7681"}"/>
      <text x="18" y="0" font-size="12.5" font-weight="600" fill="${theme.text}">${escapeXml(language.name)}</text>
      <text x="242" y="0" text-anchor="end" font-size="12.5" font-weight="600" fill="${theme.title}">${pct}%</text>
    </g></g>`;
  }).join(`
  `);
}
function renderRadarSvg(rawStats, theme, hideBorder, legend = "languages", domains = DOMAINS) {
  const totalBytes = rawStats.reduce((sum, s) => sum + Math.max(0, s.bytes), 0);
  if (totalBytes === 0) {
    return renderEmptySvg(theme, hideBorder);
  }
  const width = 540;
  const height = 240;
  const cx = 160;
  const cy = 126;
  const R = 72;
  const stroke = hideBorder ? "none" : theme.border;
  const scores = computeDomainScores(rawStats, domains);
  const axisAngles = scores.map((_, i) => -Math.PI / 2 + i * 2 * Math.PI / 5);
  const webRings = [0.25, 0.5, 0.75, 1].map((scale) => {
    const pts = axisAngles.map((a) => `${(Math.cos(a) * R * scale).toFixed(1)},${(Math.sin(a) * R * scale).toFixed(1)}`).join(" ");
    return `<polygon points="${pts}" fill="none" stroke="${theme.border}" stroke-width="0.9"/>`;
  }).join(`
    `);
  const spokes = axisAngles.map((a) => {
    const x2 = (Math.cos(a) * R).toFixed(1);
    const y2 = (Math.sin(a) * R).toFixed(1);
    return `<line x1="0" y1="0" x2="${x2}" y2="${y2}" stroke="${theme.border}" stroke-opacity="0.6" stroke-width="0.9"/>`;
  }).join(`
    `);
  const axisLabels = scores.map((s, i) => {
    const a = axisAngles[i];
    let x = 0;
    let y = 0;
    let anchor = "middle";
    if (i === 0) {
      x = 0;
      y = -(R + 12);
      anchor = "middle";
    } else if (i === 1) {
      x = Math.cos(a) * R + 8;
      y = Math.sin(a) * R + 3;
      anchor = "start";
    } else if (i === 2) {
      x = Math.cos(a) * R + 8;
      y = Math.sin(a) * R + 12;
      anchor = "start";
    } else if (i === 3) {
      x = Math.cos(a) * R - 8;
      y = Math.sin(a) * R + 12;
      anchor = "end";
    } else {
      x = Math.cos(a) * R - 8;
      y = Math.sin(a) * R + 3;
      anchor = "end";
    }
    return `<text class="axis-label" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" font-size="11" font-weight="600" fill="${theme.text}">${escapeXml(s.domain)}</text>`;
  }).join(`
    `);
  const vertices = scores.map((s, i) => {
    const a = axisAngles[i];
    const r = (s.score > 0 ? Math.max(s.score, 0.12) : 0.06) * R;
    return {
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      stat: s
    };
  });
  const polyPoints = vertices.map((v) => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(" ");
  const dots = vertices.map((v, i) => {
    const pct = (v.stat.share * 100).toFixed(1);
    const delay = (0.28 + i * 0.06).toFixed(2);
    return `<circle class="dot" style="animation-delay:${delay}s" cx="${v.x.toFixed(1)}" cy="${v.y.toFixed(1)}" r="4" fill="${v.stat.color}" stroke="${theme.bg}" stroke-width="1.5"><title>${escapeXml(v.stat.domain)}: ${pct}%</title></circle>`;
  }).join(`
    `);
  const legendEntries = legend === "domains" ? [...scores].filter((score) => score.bytes > 0).sort((a, b) => b.bytes - a.bytes).slice(0, 6).map((score) => ({
    name: score.domain,
    bytes: score.bytes,
    color: score.color
  })) : [...rawStats].filter((stat) => stat.bytes > 0).sort((a, b) => b.bytes - a.bytes).slice(0, 6).map((stat) => ({
    name: stat.name,
    bytes: stat.bytes,
    color: stat.color || "#6e7681"
  }));
  const startY = Math.round((height - (legendEntries.length - 1) * 28) / 2) + 4;
  const langRows = legendEntries.map((entry, i) => {
    const y = startY + i * 28;
    const pct = (entry.bytes / totalBytes * 100).toFixed(1);
    const delay = (0.14 + i * 0.07).toFixed(2);
    return `<g transform="translate(304, ${y})"><g class="row" style="animation-delay:${delay}s">
      <circle cx="5" cy="-4" r="4.5" fill="${entry.color}"/>
      <text x="17" y="0" font-size="12" font-weight="600" fill="${theme.text}">${escapeXml(entry.name)}</text>
      <text x="212" y="0" text-anchor="end" font-size="12" font-weight="600" fill="${theme.title}">${pct}%</text>
    </g></g>`;
  }).join(`
  `);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    text { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
    @keyframes fadein {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes radarpop {
      from { opacity: 0; transform: scale(0.15); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes dotpop {
      from { opacity: 0; transform: scale(0.2); }
      to { opacity: 1; transform: scale(1); }
    }
    .row { opacity: 0; animation: fadein 0.45s ease forwards; }
    .axis-label { opacity: 0; animation: fadein 0.5s ease 0.1s forwards; }
    .radar-poly { opacity: 0; transform-origin: 0px 0px; animation: radarpop 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.12s forwards; }
    .dot { opacity: 0; transform-box: fill-box; transform-origin: center; animation: dotpop 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  </style>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" fill="${theme.bg}" stroke="${stroke}"/>
  <g transform="translate(${cx}, ${cy})">
    ${webRings}
    ${spokes}
    <polygon class="radar-poly" points="${polyPoints}" fill="${theme.accent}" fill-opacity="0.26" stroke="${theme.accent}" stroke-width="2" stroke-linejoin="round"/>
    ${dots}
    ${axisLabels}
  </g>
  ${langRows}
</svg>`;
}
function renderBubblesSvg(rootData, rawStats, theme, hideBorder, legend) {
  const width = 540;
  const height = 240;
  const stroke = hideBorder ? "none" : theme.border;
  const root = hierarchy(rootData).sum((d) => d.value ?? 0).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const totalBytes = root.value ?? 0;
  if (totalBytes === 0) {
    return renderEmptySvg(theme, hideBorder);
  }
  const packed = index$1().size([212, 212]).padding(4)(root);
  const domainCircles = (packed.children ?? []).map((d, i) => {
    const color = d.data.color ?? "#6e7681";
    const pct = ((d.value ?? 0) / totalBytes * 100).toFixed(1);
    const delay = (0.08 + i * 0.06).toFixed(2);
    return `<circle class="bubble" style="animation-delay:${delay}s" cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${d.r.toFixed(1)}" fill="${color}" fill-opacity="0.13" stroke="${color}" stroke-opacity="0.48" stroke-width="1.2"><title>${escapeXml(d.data.name)}: ${pct}%</title></circle>`;
  }).join(`
    `);
  const leafBubbles = packed.leaves().map((d, i) => {
    if (d.r < 1.5)
      return "";
    const color = d.data.color ?? "#6e7681";
    const pct = ((d.value ?? 0) / totalBytes * 100).toFixed(1);
    const delay = (0.16 + Math.min(i * 0.03, 0.35)).toFixed(2);
    const fg = contrastTextColor(color);
    const showName = d.r >= 17;
    const showPct = d.r >= 26;
    const fontSize = d.r >= 34 ? 11 : 9.5;
    const maxChars = Math.max(3, Math.floor(d.r * 1.65 / (fontSize * 0.6)));
    const label = d.data.name.length > maxChars ? `${d.data.name.slice(0, maxChars - 1)}…` : d.data.name;
    const nameY = showPct ? -3 : 3.5;
    return `<g transform="translate(${d.x.toFixed(1)}, ${d.y.toFixed(1)})"><g class="bubble" style="animation-delay:${delay}s">
      <title>${escapeXml(d.data.name)}: ${pct}%</title>
      <circle cx="0" cy="0" r="${d.r.toFixed(1)}" fill="${color}" fill-opacity="0.92"/>
      ${showName ? `<text x="0" y="${nameY}" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="${fg}">${escapeXml(label)}</text>` : ""}
      ${showPct ? `<text x="0" y="10" text-anchor="middle" font-size="9" font-weight="600" fill="${fg}" fill-opacity="0.84">${pct}%</text>` : ""}
    </g></g>`;
  }).join(`
    `);
  const legendMarkup = legend === "languages" ? renderLanguageLegend([...rawStats].filter((stat) => stat.bytes > 0).sort((a, b) => b.bytes - a.bytes).map((stat) => ({
    name: stat.name,
    bytes: stat.bytes,
    color: stat.color || "#6e7681"
  })), totalBytes, theme, height) : renderDomainLegend(packed.children ?? [], totalBytes, theme, height);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    text { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
    @keyframes fadein {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes bubblepop {
      from { opacity: 0; transform: scale(0.5); }
      to { opacity: 1; transform: scale(1); }
    }
    .row { opacity: 0; animation: fadein 0.5s ease forwards; }
    .bubble { opacity: 0; transform-box: fill-box; transform-origin: center; animation: bubblepop 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  </style>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" fill="${theme.bg}" stroke="${stroke}"/>
  <g transform="translate(24, 14)">
    ${domainCircles}
    ${leafBubbles}
  </g>
  ${legendMarkup}
</svg>`;
}
function renderTreemapSvg(rootData, theme, hideBorder) {
  const width = 540;
  const height = 240;
  const padX = 18;
  const padY = 18;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const stroke = hideBorder ? "none" : theme.border;
  const rawRoot = hierarchy(rootData);
  const totalRawBytes = rawRoot.leaves().reduce((sum, leaf) => sum + Math.max(0, leaf.data.value ?? 0), 0);
  if (totalRawBytes === 0) {
    return renderEmptySvg(theme, hideBorder);
  }
  const root = rawRoot.sum((d) => !d.children && d.value && d.value > 0 ? d.value ** 0.72 : 0).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const laidOut = index().size([innerW, innerH]).paddingLeft(4).paddingRight(4).paddingBottom(4).paddingInner(3).paddingTop((d) => d.depth === 1 ? d.y1 - d.y0 >= 36 ? 19 : 4 : 0).round(true)(root);
  const domainBoxes = (laidOut.children ?? []).map((d, i) => {
    const w = d.x1 - d.x0;
    const h = d.y1 - d.y0;
    if (w < 12 || h < 18)
      return "";
    const domainRawBytes = d.leaves().reduce((sum, leaf) => sum + Math.max(0, leaf.data.value ?? 0), 0);
    const pct = (domainRawBytes / totalRawBytes * 100).toFixed(1);
    const delay = (0.08 + i * 0.06).toFixed(2);
    const showHeader = h >= 36 && w >= 42;
    let headerLabel = "";
    if (showHeader) {
      if (w >= 104) {
        headerLabel = `${d.data.name} ${pct}%`;
      } else {
        const maxChars = Math.max(3, Math.floor((w - 20) / 6.2));
        headerLabel = d.data.name.length > maxChars ? `${d.data.name.slice(0, maxChars - 1)}…` : d.data.name;
      }
    }
    const dotColor = d.data.color ?? "#6e7681";
    return `<g class="tile" style="animation-delay:${delay}s">
      <rect x="${d.x0}" y="${d.y0}" width="${w}" height="${h}" rx="6" fill="${theme.track}" stroke="${theme.border}" stroke-width="0.8"/>
      ${showHeader ? `<circle cx="${d.x0 + 9}" cy="${d.y0 + 10}" r="3" fill="${dotColor}"/><text x="${d.x0 + 16}" y="${d.y0 + 13.5}" font-size="10.5" font-weight="700" fill="${theme.muted}">${escapeXml(headerLabel)}</text>` : ""}
    </g>`;
  }).join(`
    `);
  const leafBoxes = laidOut.leaves().map((d, i) => {
    const w = d.x1 - d.x0;
    const h = d.y1 - d.y0;
    if (w < 2 || h < 2)
      return "";
    const color = d.data.color ?? "#6e7681";
    const pct = ((d.data.value ?? 0) / totalRawBytes * 100).toFixed(1);
    const delay = (0.14 + Math.min(i * 0.03, 0.35)).toFixed(2);
    const fg = contrastTextColor(color);
    const showName = w >= 32 && h >= 18;
    const showPct = w >= 38 && h >= 30;
    const fontSize = w >= 72 ? 11 : 9.5;
    const maxChars = Math.max(2, Math.floor((w - 8) / (fontSize * 0.56)));
    const name = d.data.name.length > maxChars ? `${d.data.name.slice(0, maxChars - 1)}…` : d.data.name;
    const nameY = d.y0 + (fontSize === 11 ? 15 : 13);
    return `<g class="tile" style="animation-delay:${delay}s">
      <title>${escapeXml(d.data.name)}: ${pct}%</title>
      <rect x="${d.x0}" y="${d.y0}" width="${w}" height="${h}" rx="4" fill="${color}" fill-opacity="0.92"/>
      ${showName ? `<text x="${d.x0 + 5}" y="${nameY}" font-size="${fontSize}" font-weight="700" fill="${fg}">${escapeXml(name)}</text>` : ""}
      ${showPct ? `<text x="${d.x0 + 5}" y="${d.y0 + 27}" font-size="10" font-weight="600" fill="${fg}" fill-opacity="0.82">${pct}%</text>` : ""}
    </g>`;
  }).join(`
    `);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    text { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
    @keyframes tilepop {
      from { opacity: 0; transform: scale(0.94); }
      to { opacity: 1; transform: scale(1); }
    }
    .tile { opacity: 0; transform-box: fill-box; transform-origin: center; animation: tilepop 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  </style>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" fill="${theme.bg}" stroke="${stroke}"/>
  <g transform="translate(${padX}, ${padY})">
    ${domainBoxes}
    ${leafBoxes}
  </g>
</svg>`;
}
function renderLanguageChartSvg(rootData, rawStats, options = {}) {
  const theme = THEMES[options.theme ?? "dark"] ?? THEMES.dark;
  const hideBorder = options.hideBorder ?? false;
  const layout = options.layout ?? "sunburst";
  const legend = options.legend ?? "languages";
  const domains = options.domains ?? DOMAINS;
  if (layout === "radar") {
    return renderRadarSvg(rawStats, theme, hideBorder, legend, domains);
  }
  if (layout === "bubbles") {
    return renderBubblesSvg(rootData, rawStats, theme, hideBorder, legend);
  }
  if (layout === "treemap") {
    return renderTreemapSvg(rootData, theme, hideBorder);
  }
  const root = hierarchy(rootData).sum((d) => d.value ?? 0);
  const totalBytes = root.value ?? 0;
  if (totalBytes === 0) {
    return renderEmptySvg(theme, hideBorder);
  }
  const domainOrder = [...DOMAINS, "Other"];
  const domainMap = new Map((root.children ?? []).map((node) => [node.data.name, node]));
  const activeDomains = domainOrder.map((name) => domainMap.get(name)).filter((node) => Boolean(node && (node.value ?? 0) > 0));
  if (activeDomains.length === 0) {
    return renderEmptySvg(theme, hideBorder);
  }
  const maxDomainPower = Math.max(...activeDomains.map((d) => ((d.value ?? 0) / totalBytes) ** 0.35));
  const allLeaves = activeDomains.flatMap((d) => (d.children ?? []).filter((leaf) => (leaf.value ?? 0) > 0));
  const maxLangPower = allLeaves.length > 0 ? Math.max(...allLeaves.map((l) => ((l.value ?? 0) / totalBytes) ** 0.35)) : 0;
  const width = 540;
  const height = 240;
  const cx = 136;
  const cy = 120;
  const rHub = 20;
  const stroke = hideBorder ? "none" : theme.border;
  const sectorSpan = 2 * Math.PI / activeDomains.length;
  const domainGap = activeDomains.length > 1 ? 0.045 : 0;
  const arcGen = arc().cornerRadius(3);
  const guideCircles = [54, 82, 110].map((r) => `<circle cx="0" cy="0" r="${r}" fill="none" stroke="${theme.border}" stroke-opacity="0.4" stroke-dasharray="2 3" stroke-width="0.9"/>`).join(`
    `);
  const dividerLines = activeDomains.length > 1 ? activeDomains.map((_, idx) => {
    const a = idx * sectorSpan;
    const x1 = (Math.sin(a) * rHub).toFixed(1);
    const y1 = (-Math.cos(a) * rHub).toFixed(1);
    const x2 = (Math.sin(a) * 110).toFixed(1);
    const y2 = (-Math.cos(a) * 110).toFixed(1);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${theme.border}" stroke-opacity="0.45" stroke-width="0.9"/>`;
  }).join(`
    `) : "";
  const domainPaths = [];
  const petalPaths = [];
  for (let domainIdx = 0;domainIdx < activeDomains.length; domainIdx++) {
    const d = activeDomains[domainIdx];
    const startAngle = domainIdx * sectorSpan + domainGap / 2;
    const endAngle = (domainIdx + 1) * sectorSpan - domainGap / 2;
    const domainColor = d.data.color ?? "#6e7681";
    const domainValue = d.value ?? 0;
    const domainShare = domainValue / totalBytes;
    const domainNorm = maxDomainPower > 0 ? domainShare ** 0.35 / maxDomainPower : 0;
    const rDomain = 34 + domainNorm * 18;
    const domainArc = arcGen({
      startAngle,
      endAngle,
      innerRadius: rHub,
      outerRadius: rDomain
    });
    if (domainArc) {
      const pct = (domainShare * 100).toFixed(1);
      const delay = (0.08 + domainIdx * 0.06).toFixed(2);
      domainPaths.push(`<path class="arc" style="animation-delay:${delay}s" d="${domainArc}" fill="${domainColor}" fill-opacity="0.9" stroke="${theme.stroke}" stroke-width="1.2"><title>${escapeXml(d.data.name)}: ${pct}%</title></path>`);
    }
    const sortedLeaves = (d.children ?? []).filter((leaf) => (leaf.value ?? 0) > 0).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    const subItems = sortedLeaves.length > 6 ? [
      ...sortedLeaves.slice(0, 5).map((leaf) => ({
        name: leaf.data.name,
        color: leaf.data.color ?? domainColor,
        value: leaf.value ?? 0
      })),
      {
        name: "Other",
        color: domainColor,
        value: sortedLeaves.slice(5).reduce((sum, leaf) => sum + (leaf.value ?? 0), 0)
      }
    ] : sortedLeaves.map((leaf) => ({
      name: leaf.data.name,
      color: leaf.data.color ?? domainColor,
      value: leaf.value ?? 0
    }));
    if (subItems.length === 0)
      continue;
    const subSpan = (endAngle - startAngle) / subItems.length;
    const langGap = subItems.length > 1 ? Math.min(0.018, subSpan * 0.14) : 0;
    for (let langIdx = 0;langIdx < subItems.length; langIdx++) {
      const item = subItems[langIdx];
      const lStart = startAngle + langIdx * subSpan + langGap / 2;
      const lEnd = startAngle + (langIdx + 1) * subSpan - langGap / 2;
      const rLangInner = rDomain + 2;
      const langShare = item.value / totalBytes;
      const langNorm = Math.min(1, maxLangPower > 0 ? langShare ** 0.35 / maxLangPower : 0);
      const rLangOuter = rLangInner + 8 + langNorm * 48;
      const petalArc = arcGen({
        startAngle: lStart,
        endAngle: lEnd,
        innerRadius: rLangInner,
        outerRadius: rLangOuter
      });
      if (petalArc) {
        const pct = (langShare * 100).toFixed(1);
        const delay = (0.22 + domainIdx * 0.06 + langIdx * 0.03).toFixed(2);
        petalPaths.push(`<path class="petal" style="animation-delay:${delay}s" d="${petalArc}" fill="${item.color}" fill-opacity="0.95" stroke="${theme.stroke}" stroke-width="1.1"><title>${escapeXml(item.name)}: ${pct}%</title></path>`);
      }
    }
  }
  const sortedLegendDomains = [...activeDomains].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const legendMarkup = legend === "languages" ? renderLanguageLegend([...rawStats].filter((stat) => stat.bytes > 0).sort((a, b) => b.bytes - a.bytes).map((stat) => ({
    name: stat.name,
    bytes: stat.bytes,
    color: stat.color || "#6e7681"
  })), totalBytes, theme, height) : renderDomainLegend(sortedLegendDomains, totalBytes, theme, height);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    text { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
    @keyframes fadein {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes arcpop {
      from { opacity: 0; transform: scale(0.25); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes petalpop {
      from { opacity: 0; transform: scale(0.45); }
      to { opacity: 1; transform: scale(1); }
    }
    .row { opacity: 0; animation: fadein 0.5s ease forwards; }
    .arc { opacity: 0; transform-origin: 0px 0px; animation: arcpop 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
    .petal { opacity: 0; transform-origin: 0px 0px; animation: petalpop 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  </style>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" fill="${theme.bg}" stroke="${stroke}"/>
  <g transform="translate(${cx}, ${cy})">
    ${guideCircles}
    ${dividerLines}
    ${domainPaths.join(`
    `)}
    ${petalPaths.join(`
    `)}
  </g>
  ${legendMarkup}
</svg>`;
}

// src/action.ts
function getInput(name, fallback = "") {
  const key = `INPUT_${name.toUpperCase()}`;
  return (process.env[key] ?? "").trim() || fallback;
}
function parseLayout(raw) {
  const val = raw.toLowerCase();
  if (val === "radar" || val === "spider")
    return "radar";
  if (val === "bubbles")
    return "bubbles";
  if (val === "treemap")
    return "treemap";
  return "sunburst";
}
function parseTheme(raw) {
  return raw.toLowerCase() === "light" ? "light" : "dark";
}
function parseDomains(raw) {
  if (!raw.trim())
    return [...DOMAINS];
  const byName = new Map([
    ...DOMAINS.map((domain) => [domain.toLowerCase(), domain]),
    ["other", "Other"]
  ]);
  const parsed = raw.split(/[,;\n]/).map((value) => byName.get(value.trim().toLowerCase())).filter((value) => Boolean(value));
  return parsed.length > 0 ? [...new Set(parsed)] : [...DOMAINS];
}
function parseLegend(raw) {
  return raw.toLowerCase() === "domains" ? "domains" : "languages";
}
async function main() {
  const username = getInput("username", process.env.GITHUB_USERNAME?.trim() || process.env.GITHUB_REPOSITORY_OWNER?.trim() || "");
  const token = getInput("token", process.env.GITHUB_TOKEN?.trim() || "");
  const layout = parseLayout(getInput("layout", "sunburst"));
  const theme = parseTheme(getInput("theme", "dark"));
  const hideBorder = getInput("hide_border", "true").toLowerCase() !== "false";
  const includePrivate = getInput("include_private", "false").toLowerCase() === "true";
  const includedDomains = parseDomains(getInput("domains", ""));
  const legend = parseLegend(getInput("legend", "languages"));
  const output = getInput("output", "top-langs.svg");
  if (!username) {
    throw new Error("Missing GitHub username (set `username` input or GITHUB_REPOSITORY_OWNER).");
  }
  if (!token) {
    throw new Error("Missing GitHub token (set `token` input or GITHUB_TOKEN env var).");
  }
  const stats = await fetchUserLanguages(username, token, includePrivate);
  const filteredStats = filterLanguagesByDomains(stats, includedDomains);
  const tree = buildLanguageHierarchy(filteredStats, includedDomains);
  const canonicalDomains = includedDomains.filter((domain) => domain !== "Other");
  const svg = renderLanguageChartSvg(tree, filteredStats, {
    theme,
    hideBorder,
    layout,
    legend,
    domains: canonicalDomains
  });
  const outPath = resolve(output);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, svg, "utf8");
  console.log(`Generated ${outPath} (username=${username}, layout=${layout}, theme=${theme}, include_private=${includePrivate}, domains=${includedDomains.join(",")}, legend=${legend}, languages=${filteredStats.length})`);
}
main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
