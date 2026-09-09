/**
 * Utility functions for transforming GraphRAG API payloads into
 * force-directed graph structures ({ nodes: [], links: [] }).
 */

export function transformRagContextToGraph(ragContext) {
  if (!ragContext || !Array.isArray(ragContext) || ragContext.length === 0) {
    return { nodes: [], links: [] };
  }

  const nodesMap = new Map();
  const links = [];
  const linkKeys = new Set();

  ragContext.forEach((item, index) => {
    const primaryId = item.id || `activity_${index}`;
    if (!nodesMap.has(primaryId)) {
      nodesMap.set(primaryId, {
        id: primaryId,
        label: 'Activity',
        name: item.name || primaryId,
        score: item.score,
        isPrimary: true,
        properties: { id: primaryId, name: item.name, score: item.score },
      });
    }

    if (Array.isArray(item.context_neighborhood)) {
      item.context_neighborhood.forEach((neighbor) => {
        if (!neighbor.node_id) return;
        if (!nodesMap.has(neighbor.node_id)) {
          nodesMap.set(neighbor.node_id, {
            id: neighbor.node_id,
            label: neighbor.node_label || 'Entity',
            name: neighbor.node_name || neighbor.node_id,
            properties: { id: neighbor.node_id, name: neighbor.node_name },
          });
        }

        const linkKey = `${primaryId}->${neighbor.node_id}:${neighbor.relationship}`;
        if (!linkKeys.has(linkKey)) {
          linkKeys.add(linkKey);
          links.push({
            source: primaryId,
            target: neighbor.node_id,
            type: neighbor.relationship || 'RELATED_TO',
          });
        }
      });
    }
  });

  return {
    nodes: Array.from(nodesMap.values()),
    links,
  };
}

export function transformNicQueryToGraph(queryResult) {
  if (!queryResult) return { nodes: [], links: [] };
  if (queryResult.graph && Array.isArray(queryResult.graph.nodes)) {
    return queryResult.graph;
  }

  const activity = queryResult.activity || {};
  const rels = queryResult.relationships || [];
  const actId = activity.id || `activity_${queryResult.nic_code}`;

  const nodes = [{
    id: actId,
    label: 'Activity',
    name: activity.name || `NIC ${queryResult.nic_code}`,
    properties: activity,
  }];

  const links = [];
  rels.forEach((r) => {
    if (!r.target_id) return;
    nodes.push({
      id: r.target_id,
      label: r.target_label || 'Entity',
      name: r.target_name || r.target_id,
      properties: { id: r.target_id, name: r.target_name },
    });
    links.push({
      source: actId,
      target: r.target_id,
      type: r.rel_type || 'RELATED_TO',
    });
  });

  return { nodes, links };
}
