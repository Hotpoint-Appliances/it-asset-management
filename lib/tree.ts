export interface WithParent {
  id: number;
  parentId: number | null;
  name: string;
}

export interface TreeNode<T extends WithParent> {
  item: T;
  depth: number;
  children: TreeNode<T>[];
}

export function buildTree<T extends WithParent>(items: T[]): TreeNode<T>[] {
  const byParent = new Map<number | null, T[]>();
  for (const item of items) {
    const list = byParent.get(item.parentId);
    if (list) list.push(item);
    else byParent.set(item.parentId, [item]);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  function build(parentId: number | null, depth: number): TreeNode<T>[] {
    const children = byParent.get(parentId) ?? [];
    return children.map((item) => ({
      item,
      depth,
      children: build(item.id, depth + 1),
    }));
  }

  return build(null, 0);
}

export function flattenForSelect<T extends WithParent>(
  nodes: TreeNode<T>[],
): { item: T; depth: number }[] {
  const out: { item: T; depth: number }[] = [];
  function walk(list: TreeNode<T>[]) {
    for (const node of list) {
      out.push({ item: node.item, depth: node.depth });
      walk(node.children);
    }
  }
  walk(nodes);
  return out;
}

/** Ids of `rootId` plus every node transitively parented under it — used to keep a node from
 * being reparented under itself or one of its own descendants (would create a cycle). */
export function collectDescendantIds<T extends WithParent>(
  items: T[],
  rootId: number,
): Set<number> {
  const ids = new Set<number>();
  const stack = [rootId];
  while (stack.length) {
    const current = stack.pop()!;
    for (const item of items) {
      if (item.parentId === current && !ids.has(item.id)) {
        ids.add(item.id);
        stack.push(item.id);
      }
    }
  }
  return ids;
}
