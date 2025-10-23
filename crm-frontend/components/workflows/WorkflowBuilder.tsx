// components/workflows/WorkflowBuilder.tsx
// Builder visuel pour workflows avec ReactFlow

'use client'

import React, { useState, useCallback } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  Connection,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Zap, Mail, Bell, Calendar, User, Tag, Edit2, Plus, Trash2 } from 'lucide-react'

// Types d'actions disponibles
const ACTION_TYPES = [
  { type: 'create_task', label: 'Créer une tâche', icon: Calendar, color: '#8B5CF6' },
  { type: 'send_email', label: 'Envoyer un email', icon: Mail, color: '#3B82F6' },
  { type: 'send_notification', label: 'Notification', icon: Bell, color: '#10B981' },
  { type: 'update_field', label: 'Modifier un champ', icon: Edit2, color: '#F59E0B' },
  { type: 'assign_user', label: 'Assigner utilisateur', icon: User, color: '#EC4899' },
  { type: 'add_tag', label: 'Ajouter tag', icon: Tag, color: '#6366F1' },
]

interface WorkflowBuilderProps {
  initialNodes?: Node[]
  initialEdges?: Edge[]
  onUpdate?: (nodes: Node[], edges: Edge[]) => void
}

// Composant Node personnalisé
function ActionNode({ data }: { data: any }) {
  const actionType = ACTION_TYPES.find(a => a.type === data.type)
  const Icon = actionType?.icon || Zap
  const color = actionType?.color || '#6B7280'

  return (
    <div
      className="px-4 py-3 rounded-lg border-2 shadow-lg bg-white min-w-[200px]"
      style={{ borderColor: color }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="font-semibold text-sm" style={{ color }}>
          {actionType?.label || data.type}
        </span>
      </div>
      {data.config && (
        <div className="text-xs text-gray-600 space-y-1">
          {Object.entries(data.config).slice(0, 3).map(([key, value]) => (
            <div key={key} className="truncate">
              <span className="font-medium">{key}:</span> {String(value)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Composant Trigger Node
function TriggerNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-3 rounded-lg border-2 border-purple-500 shadow-lg bg-purple-50 min-w-[200px]">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-4 h-4 text-purple-600" />
        <span className="font-semibold text-sm text-purple-900">Déclencheur</span>
      </div>
      <div className="text-xs text-purple-700">{data.label}</div>
    </div>
  )
}

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
}

export default function WorkflowBuilder({
  initialNodes = [],
  initialEdges = [],
  onUpdate,
}: WorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Connexion entre nodes
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdges = addEdge(
        {
          ...params,
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
        },
        edges
      )
      setEdges(newEdges)
      if (onUpdate) onUpdate(nodes, newEdges)
    },
    [edges, nodes, onUpdate, setEdges]
  )

  // Ajouter une action
  const addAction = useCallback((actionType: string) => {
    const actionConfig = ACTION_TYPES.find(a => a.type === actionType)

    const newNode: Node = {
      id: `action-${Date.now()}`,
      type: 'action',
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      },
      data: {
        type: actionType,
        label: actionConfig?.label || actionType,
        config: {},
      },
    }

    setNodes((nds) => [...nds, newNode])
    if (onUpdate) onUpdate([...nodes, newNode], edges)
  }, [nodes, edges, onUpdate, setNodes])

  // Supprimer un node
  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter(n => n.id !== nodeId))
    setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId))
    if (onUpdate) {
      const newNodes = nodes.filter(n => n.id !== nodeId)
      const newEdges = edges.filter(e => e.source !== nodeId && e.target !== nodeId)
      onUpdate(newNodes, newEdges)
    }
  }, [nodes, edges, onUpdate, setNodes, setEdges])

  // Sélection d'un node
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'action') {
      setSelectedNodeId(node.id)
      setIsConfigOpen(true)
    }
  }, [])

  return (
    <div className="flex gap-4 h-[600px]">
      {/* Palette d'actions */}
      <div className="w-64 bg-white rounded-lg border border-gray-200 p-4 overflow-y-auto">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Actions disponibles
        </h3>
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
            💡 <strong>Astuce :</strong> Glissez les actions pour les positionner, puis connectez-les en cliquant sur les points de connexion.
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
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />
        </ReactFlow>

        {/* Légende */}
        <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg border border-gray-200 max-w-xs">
          <h4 className="font-semibold text-sm text-gray-900 mb-2">Guide</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Cliquez sur une action pour l'ajouter</li>
            <li>• Déplacez les blocs pour les organiser</li>
            <li>• Connectez les actions entre elles</li>
            <li>• Cliquez sur un bloc pour le configurer</li>
          </ul>
        </div>
      </div>

      {/* Panel de configuration (modal simplifié) */}
      {isConfigOpen && selectedNodeId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Configuration de l'action</h3>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Fonctionnalité de configuration avancée à venir.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    deleteNode(selectedNodeId)
                    setIsConfigOpen(false)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
                <button
                  onClick={() => setIsConfigOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
