// components/workflows/WorkflowBuilder.client.tsx
// Builder visuel pour workflows avec ReactFlow (CLIENT-SIDE ONLY)

'use client'

import React, { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Zap, Mail, Bell, Calendar, User, Tag, Edit2 } from 'lucide-react'

// Types d'actions disponibles
const ACTION_TYPES = [
  { type: 'create_task', label: 'Créer une tâche', icon: Calendar, color: '#8B5CF6' },
  { type: 'send_email', label: 'Envoyer un email', icon: Mail, color: '#3B82F6' },
  { type: 'send_notification', label: 'Notification', icon: Bell, color: '#10B981' },
  { type: 'update_field', label: 'Modifier un champ', icon: Edit2, color: '#F59E0B' },
  { type: 'assign_user', label: 'Assigner utilisateur', icon: User, color: '#EC4899' },
  { type: 'add_tag', label: 'Ajouter tag', icon: Tag, color: '#6366F1' },
]

const initialNodes: Node[] = [
  {
    id: 'trigger-1',
    type: 'input',
    position: { x: 250, y: 50 },
    data: { label: '⚡ Déclencheur' },
    style: { background: '#F3E8FF', border: '2px solid #8B5CF6', borderRadius: '8px', padding: '10px' },
  },
]

const initialEdges: Edge[] = []

interface WorkflowBuilderClientProps {
  onUpdate?: (nodes: Node[], edges: Edge[]) => void
}

export default function WorkflowBuilderClient({ onUpdate }: WorkflowBuilderClientProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdges = addEdge(
        {
          ...connection,
          type: 'smoothstep',
          animated: true,
        },
        edges
      )
      setEdges(newEdges)
      if (onUpdate) onUpdate(nodes, newEdges)
    },
    [edges, nodes, onUpdate, setEdges]
  )

  // Ajouter une action
  const addAction = useCallback(
    (actionType: string) => {
      const actionConfig = ACTION_TYPES.find((a) => a.type === actionType)

      const newNode: Node = {
        id: `action-${Date.now()}`,
        type: 'default',
        position: {
          x: Math.random() * 400 + 100,
          y: Math.random() * 300 + 150,
        },
        data: {
          label: actionConfig?.label || actionType,
        },
        style: {
          background: actionConfig?.color ? `${actionConfig.color}20` : '#f0f0f0',
          border: `2px solid ${actionConfig?.color || '#ccc'}`,
          borderRadius: '8px',
          padding: '10px',
        },
      }

      const updatedNodes = [...nodes, newNode]
      setNodes(updatedNodes)
      if (onUpdate) onUpdate(updatedNodes, edges)
    },
    [nodes, edges, onUpdate, setNodes]
  )

  return (
    <div className="flex gap-4 h-[600px]">
      {/* Palette d'actions */}
      <div className="w-64 bg-white rounded-lg border border-gray-200 p-4 overflow-y-auto">
        <h3 className="font-semibold text-gray-900 mb-3">Actions disponibles</h3>
        <div className="space-y-2">
          {ACTION_TYPES.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.type}
                onClick={() => addAction(action.type)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
                style={{ borderColor: `${action.color}40` }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" style={{ color: action.color }} />
                <span className="text-sm font-medium text-gray-900">{action.label}</span>
              </button>
            )
          })}
        </div>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            Cliquez sur une action pour l'ajouter au workflow, puis connectez les blocs entre eux.
          </p>
        </div>
      </div>

      {/* Canvas ReactFlow */}
      <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  )
}
