// components/shared/Table.tsx
// ============= TABLE COMPONENT - RÉUTILISABLE =============

interface TableProps {
  columns: {
    header: string
    accessor: string
    render?: (value: any, row: any) => React.ReactNode
  }[]
  data: any[]
  isLoading?: boolean
  isEmpty?: boolean
}

export function Table({ columns, data, isLoading, isEmpty }: TableProps) {
  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Chargement...</div>
  }

  if (isEmpty || data.length === 0) {
    return <div className="p-6 text-center text-gray-500">Aucune donnée</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {columns.map((col) => (
              <th key={col.accessor} className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.accessor} className="px-4 py-3 text-sm">
                  {col.render ? col.render(row[col.accessor], row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}