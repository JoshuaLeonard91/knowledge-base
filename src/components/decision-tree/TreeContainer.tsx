'use client';

import { useState, useCallback } from 'react';
import { TreeNode as TreeNodeType } from '@/types';
import { TreeNodeComponent } from './TreeNode';
import { TreeProgress } from './TreeProgress';

interface TreeContainerProps {
  nodes: TreeNodeType[];
  rootId?: string;
}

export function TreeContainer({ nodes, rootId = 'root' }: TreeContainerProps) {
  const [path, setPath] = useState<TreeNodeType[]>(() => {
    const rootNode = nodes.find(n => n.id === rootId);
    return rootNode ? [rootNode] : [];
  });

  const currentNode = path[path.length - 1];

  const getNode = useCallback((id: string) => {
    return nodes.find(n => n.id === id);
  }, [nodes]);

  const handleSelect = useCallback((nextId: string) => {
    const nextNode = getNode(nextId);
    if (nextNode) {
      setPath(prev => [...prev, nextNode]);
    }
  }, [getNode]);

  const handleBack = useCallback(() => {
    if (path.length > 1) {
      setPath(prev => prev.slice(0, -1));
    }
  }, [path.length]);

  const handleNavigate = useCallback((index: number) => {
    if (index < path.length - 1) {
      setPath(prev => prev.slice(0, index + 1));
    }
  }, [path.length]);

  const handleReset = useCallback(() => {
    const rootNode = getNode(rootId);
    if (rootNode) {
      setPath([rootNode]);
    }
  }, [getNode, rootId]);

  if (!currentNode) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-secondary)]">Something went wrong. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <div>
      <TreeProgress
        path={path}
        onNavigate={handleNavigate}
        onReset={handleReset}
      />
      <TreeNodeComponent
        node={currentNode}
        onSelect={handleSelect}
        onBack={handleBack}
        canGoBack={path.length > 1}
      />
    </div>
  );
}
