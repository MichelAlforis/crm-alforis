// components/workflows/WorkflowBuilder.client.tsx
// Builder visuel FUN pour workflows avec @xyflow/react (CLIENT-SIDE ONLY)

'use client'

import React, { useCallback, useState } from 'react'
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
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Zap,
  Mail,
  Bell,
  Calendar,
  User,
  Tag,
  Edit2,
  Trash2,
  Sparkles,
  Play,
} from 'lucide-react'

// Types d'actions disponibles avec emojis et descriptions fun
const ACTION_TYPES = [
  {
    type: 'create_task',
    label: 'Créer une tâche',
    emoji: '📝',
    icon: Calendar,
    color: '#8B5CF6',
    description: 'Ajoute une tâche au pipeline',
    category: 'Organisation',
  },
  {
    type: 'send_email',
    label: 'Envoyer un email',
    emoji: '📧',
    icon: Mail,
    color: '#3B82F6',
    description: 'Envoie un email automatique',
    category: 'Communication',
  },
  {
    type: 'send_notification',
    label: 'Notification',
    emoji: '🔔',
    icon: Bell,
    color: '#10B981',
    description: 'Notifie les utilisateurs',
    category: 'Communication',
  },
  {
    type: 'update_field',
    label: 'Modifier un champ',
    emoji: '✏️',
    icon: Edit2,
    color: '#F59E0B',
    description: 'Met à jour les données',
    category: 'Modification',
  },
  {
    type: 'assign_user',
    label: 'Assigner utilisateur',
    emoji: '👤',
    icon: User,
    color: '#EC4899',
    description: 'Attribue un responsable',
    category: 'Organisation',
  },
  {
    type: 'add_tag',
    label: 'Ajouter tag',
    emoji: '🏷️',
    icon: Tag,
    color: '#6366F1',
    description: 'Tag les éléments',
    category: 'Organisation',
  },
]

interface WorkflowBuilderClientProps {
  onUpdate?: (nodes: Node[], edges: Edge[]) => void
  initialNodes?: Node[]
  initialEdges?: Edge[]
}

export default function WorkflowBuilderClient({
  onUpdate,
  initialNodes: providedInitialNodes,
  initialEdges: providedInitialEdges,
}: WorkflowBuilderClientProps) {
  const defaultInitialNodes: Node[] = [
    {
      id: 'trigger-1',
      type: 'input',
      position: { x: 400, y: 50 },
      data: { label: '⚡ Déclencheur', actionType: 'trigger' },
      style: {
        background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
        border: '2px solid #8B5CF6',
        borderRadius: '12px',
        padding: '16px 20px',
        fontSize: '14px',
        fontWeight: '600',
        boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.1), 0 2px 4px -1px rgba(139, 92, 246, 0.06)',
      },
    },
  ]

  const [nodes, setNodes, onNodesChange] = useNodesState(
    providedInitialNodes || defaultInitialNodes
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    providedInitialEdges || []
  )
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [hoveredAction, setHoveredAction] = useState<string | null>(null)

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdges = addEdge(
        {
          ...connection,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#8B5CF6', strokeWidth: 2 },
        },
        edges
      )
      setEdges(newEdges)
      if (onUpdate) onUpdate(nodes, newEdges)
    },
    [edges, nodes, onUpdate, setEdges]
  )

  // Ajouter une action avec animation
  const addAction = useCallback(
    (actionType: string) => {
      const actionConfig = ACTION_TYPES.find((a) => a.type === actionType)

      if (!actionConfig) return

      const newNode: Node = {
        id: `action-${Date.now()}`,
        type: 'default',
        position: {
          x: 400 + (nodes.length - 1) * 50,
          y: 200 + (nodes.length - 1) * 100,
        },
        data: {
          label: `${actionConfig.emoji} ${actionConfig.label}`,
          actionType: actionConfig.type,
        },
        style: {
          background: `linear-gradient(135deg, ${actionConfig.color}15 0%, ${actionConfig.color}25 100%)`,
          border: `2px solid ${actionConfig.color}`,
          borderRadius: '12px',
          padding: '16px 20px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: `0 4px 6px -1px ${actionConfig.color}20, 0 2px 4px -1px ${actionConfig.color}10`,
          transition: 'all 0.2s ease-in-out',
        },
      }

      const updatedNodes = [...nodes, newNode]
      setNodes(updatedNodes)
      if (onUpdate) onUpdate(updatedNodes, edges)

      // Animation d'ajout
      setTimeout(() => {
        const element = document.querySelector(`[data-id="${newNode.id}"]`)
        if (element) {
          element.classList.add('animate-pulse')
          setTimeout(() => element.classList.remove('animate-pulse'), 600)
        }
      }, 50)
    },
    [nodes, edges, onUpdate, setNodes]
  )

  // Supprimer un noeud
  const deleteNode = useCallback(
    (nodeId: string) => {
      if (nodeId === 'trigger-1') return // Ne pas supprimer le trigger

      const updatedNodes = nodes.filter((n) => n.id !== nodeId)
      const updatedEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId)

      setNodes(updatedNodes)
      setEdges(updatedEdges)
      setSelectedNode(null)
      if (onUpdate) onUpdate(updatedNodes, updatedEdges)
    },
    [nodes, edges, onUpdate, setNodes, setEdges]
  )

  // Gérer la sélection de noeud
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node)
    },
    []
  )

  // Catégories d'actions
  const categories = [...new Set(ACTION_TYPES.map((a) => a.category))]

  return (
    <div className="flex gap-6 h-[700px]">
      {/* Palette d'actions - Style moderne et fun */}
      <div className="w-80 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 border-purple-200 dark:border-purple-700 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4">
          <h3 className="font-bold text-white flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5" />
            Actions Magiques
          </h3>
          <p className="text-purple-100 text-xs mt-1">Glissez pour créer votre workflow</p>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[600px]">
          {categories.map((category) => (
            <div key={category} className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {category}
              </h4>
              {ACTION_TYPES.filter((a) => a.category === category).map((action) => {
                const Icon = action.icon
                const isHovered = hoveredAction === action.type
                return (
                  <button
                    key={action.type}
                    onClick={() => addAction(action.type)}
                    onMouseEnter={() => setHoveredAction(action.type)}
                    onMouseLeave={() => setHoveredAction(null)}
                    className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      isHovered
                        ? 'border-purple-500 shadow-lg scale-105 bg-white dark:bg-gray-700'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                    }`}
                    style={{
                      borderLeftColor: isHovered ? action.color : undefined,
                      borderLeftWidth: isHovered ? '4px' : '2px',
                    }}
                  >
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        background: `${action.color}20`,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: action.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-lg">{action.emoji}</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {action.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                        {action.description}
                      </p>
                    </div>
                    <Play
                      className={`w-4 h-4 flex-shrink-0 transition-transform ${
                        isHovered ? 'translate-x-1 text-purple-600' : 'text-gray-400'
                      }`}
                    />
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Info bulles animées */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-900 dark:text-white mb-1">
                💡 Astuce Pro
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Connectez les blocs en tirant depuis les points de connexion. Utilisez les
                touches fléchées pour naviguer.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas ReactFlow - Zone principale */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Toolbar au-dessus du canvas */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Zap className="w-4 h-4 text-purple-600" />
            <span className="font-medium">
              {nodes.length - 1} action{nodes.length - 1 !== 1 ? 's' : ''} • {edges.length}{' '}
              connexion{edges.length !== 1 ? 's' : ''}
            </span>
          </div>

          {selectedNode && selectedNode.id !== 'trigger-1' && (
            <button
              onClick={() => deleteNode(selectedNode.id)}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          )}
        </div>

        {/* Canvas ReactFlow avec style moderne */}
        <div className="flex-1 bg-gradient-to-br from-gray-50 to-purple-50/30 dark:from-gray-900 dark:to-purple-900/10 rounded-xl border-2 border-gray-200 dark:border-gray-700 relative overflow-hidden shadow-inner">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#8B5CF6', strokeWidth: 2 },
            }}
            className="rounded-xl"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#8B5CF6"
              className="opacity-30"
            />
            <Controls
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
              showInteractive={false}
            />
            <MiniMap
              nodeColor={(node) => {
                if (node.id === 'trigger-1') return '#8B5CF6'
                const actionType = node.data.actionType as string
                const action = ACTION_TYPES.find((a) => a.type === actionType)
                return action?.color || '#gray'
              }}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
              maskColor="rgba(139, 92, 246, 0.1)"
            />
          </ReactFlow>

          {/* Empty state avec animation */}
          {nodes.length === 1 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center animate-bounce">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  C'est parti ! ✨
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Cliquez sur une action à gauche pour commencer
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
