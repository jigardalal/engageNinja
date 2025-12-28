import React, { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import {
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  LoadingState,
  SkeletonTable,
  Select
} from './ui'
import Checkbox from './ui/Checkbox'
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  X,
  MoreVertical
} from 'lucide-react'

/**
 * Reusable DataTable Component
 *
 * Props:
 * - columns: Array of column definitions (from @tanstack/react-table)
 * - data: Array of data rows
 * - title: Optional table title
 * - description: Optional table description
 * - searchPlaceholder: Placeholder for search input (default: "Search...")
 * - onRowSelect: Optional callback when rows are selected
 * - enableSearch: Show search input (default: true)
 * - enableColumnToggle: Show column visibility toggle (default: true)
 * - enableSelection: Show checkboxes for row selection (default: true)
 * - loading: Show loading state (default: false)
 * - loadingMessage: Custom text for the loading indicator
 * - hidePagination: Remove the built-in pagination controls (default: false)
 * - emptyIcon: Icon component for empty state
 * - emptyTitle: Title for empty state
 * - emptyDescription: Description for empty state
 * - emptyAction: Action button component for empty state
 * - rowActions: Array or callback returning row action buttons { label, icon, onClick, variant, disabled }
 * - bulkActions: Array of bulk action buttons { label, icon, onClick, variant }
 */
export const DataTable = ({
  columns,
  data,
  title,
  description,
  searchPlaceholder = 'Search...',
  onRowSelect,
  enableSearch = true,
  enableColumnToggle = true,
  enableSelection = true,
  loading = false,
  loadingMessage = 'Loading...',
  hidePagination = false,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  rowActions,
  bulkActions,
  customFilterUI
}) => {
  const [sorting, setSorting] = useState([])
  const [columnVisibility, setColumnVisibility] = useState({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState({})
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [showColumnsMenu, setShowColumnsMenu] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [menuPositions, setMenuPositions] = useState({}) // Track position for each menu
  const [columnsMenuPosition, setColumnsMenuPosition] = useState('below')
  const menuRef = useRef(null)
  const rowMenuRefs = useRef({})
  const columnsMenuRef = useRef(null)

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null)
        setShowColumnsMenu(false)
      }
    }

    if (openMenuId || showColumnsMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId, showColumnsMenu])

  // Check menu position and adjust if it goes off-screen
  const checkMenuPosition = (menuElement, itemCount) => {
    if (!menuElement) return 'below'

    // Find the button (previous sibling in the relative container)
    const buttonElement = menuElement.parentElement?.querySelector('button')
    if (!buttonElement) return 'below'

    const buttonRect = buttonElement.getBoundingClientRect()
    const menuRect = menuElement.getBoundingClientRect()
    const menuHeight = menuRect.height
    const buffer = 10 // Safety margin

    // Check if menu fits below
    const spaceBelow = window.innerHeight - (buttonRect.bottom + 8) // 8px for mt-2
    const spaceBelowMenu = spaceBelow - menuHeight - buffer

    // Check if menu fits above
    const spaceAbove = buttonRect.top - 8 // 8px for mb-2
    const spaceAboveMenu = spaceAbove - menuHeight - buffer

    // If fits below, show below. Otherwise if fits above, show above. Otherwise show where more space
    if (spaceBelowMenu >= 0) return 'below'
    if (spaceAboveMenu >= 0) return 'above'

    // If neither fits perfectly, use the one with more space
    return spaceAboveMenu > spaceBelowMenu ? 'above' : 'below'
  }

  const setMenuPosition = (menuId, position) => {
    setMenuPositions(prev => ({ ...prev, [menuId]: position }))
  }

  const selectionColumn = enableSelection
    ? {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        ),
        enableSorting: false,
        enableHiding: false
      }
    : null

  const actionsColumn = rowActions
    ? {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const actionsForRow =
            typeof rowActions === 'function' ? rowActions(row.original) : rowActions
          if (!actionsForRow || actionsForRow.length === 0) {
            return null
          }
          const menuPosition = menuPositions[row.id] || 'below'

          return (
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 hover:bg-white/20 dark:hover:bg-white/10"
                onClick={() => {
                  setOpenMenuId(openMenuId === row.id ? null : row.id)
                }}
              >
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
              {openMenuId === row.id && (
                <>
                  {/* Backdrop portal - allows outside click to close */}
                  {createPortal(
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setOpenMenuId(null)}
                    />,
                    document.body
                  )}
                  {/* Menu - styled like Settings dropdown */}
                  <div
                    ref={(el) => {
                      if (el) {
                        rowMenuRefs.current[row.id] = el
                        // Measure and update position when menu mounts
                        requestAnimationFrame(() => {
                          const pos = checkMenuPosition(el, actionsForRow.length)
                          setMenuPosition(row.id, pos)
                        })
                      }
                    }}
                    className={`absolute right-0 w-48 rounded-2xl border border-[var(--border)] bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-sm p-2 z-50 overflow-hidden ${
                      menuPosition === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
                    }`}
                  >
                    {actionsForRow.map((action, index) => (
                      <button
                        key={`${action.label}-${index}`}
                        onClick={() => {
                          if (action.disabled) return
                          action.onClick(row.original)
                          setOpenMenuId(null)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors rounded-lg ${
                          action.disabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-[var(--border)] cursor-pointer'
                        } ${
                          action.variant === 'destructive' ? 'text-red-600 dark:text-red-400 hover:bg-red-500/10' : ''
                        }`}
                        disabled={action.disabled}
                      >
                        {action.icon && <span>{action.icon}</span>}
                        {action.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        },
        enableSorting: false,
        enableHiding: false
      }
    : null

  const allColumns = useMemo(
    () => [
      ...(selectionColumn ? [selectionColumn] : []),
      ...columns,
      ...(actionsColumn ? [actionsColumn] : [])
    ],
    [columns, selectionColumn, actionsColumn]
  )

  const table = useReactTable({
    data,
    columns: allColumns,
    state: {
      sorting,
      columnVisibility,
      globalFilter,
      rowSelection,
      pagination
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString'
  })

  const selectedCount = Object.keys(rowSelection).filter((key) => rowSelection[key]).length
  const { pageIndex, pageSize } = pagination
  const totalRows = table.getFilteredRowModel().rows.length
  const displayStart = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const displayEnd = Math.min((pageIndex + 1) * pageSize, totalRows)
  const totalPages = Math.max(1, Math.ceil(totalRows / (pageSize || 1)))
  const canPreviousPage = table.getCanPreviousPage()
  const canNextPage = table.getCanNextPage()
  const selectedRows = useMemo(
    () =>
      Object.keys(rowSelection)
        .filter((key) => rowSelection[key])
        .map((key) => data[parseInt(key, 10)]),
    [rowSelection, data]
  )

  React.useEffect(() => {
    if (onRowSelect) {
      onRowSelect(selectedRows)
    }
  }, [selectedRows, onRowSelect])

  const handleClearSelection = () => {
    setRowSelection({})
  }

  return (
    <div className="space-y-4">
      {selectedCount > 0 && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 dark:bg-primary/20 backdrop-blur-xl border border-primary/30 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {selectedCount} {selectedCount === 1 ? 'row' : 'rows'} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          </div>
          {bulkActions && (
            <div className="flex items-center gap-2">
              {bulkActions.map((action, index) => (
                <Button
                  key={`${action.label}-${index}`}
                  variant={action.variant === 'destructive' ? 'destructive' : 'default'}
                  size="sm"
                  onClick={() => action.onClick(selectedRows)}
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      <section
        className="rounded-lg border shadow-lg"
        style={{ borderColor: 'var(--grid-border)', boxShadow: `0 10px 15px -3px var(--grid-glow)` }}
      >
        {(title || description || enableSearch || enableColumnToggle) && (
          <div className="px-6 py-5 space-y-4">
            {(title || description) && (
              <div className="space-y-2">
                {title && <h2 className="text-lg font-semibold">{title}</h2>}
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
              </div>
            )}

            {(enableSearch || enableColumnToggle || customFilterUI) && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 flex-wrap">
                  {enableSearch && (
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="pl-9 pr-4 bg-[var(--background)] border-[var(--border)] rounded-none"
                      />
                    </div>
                  )}
                  {customFilterUI && customFilterUI}
                </div>

                {enableColumnToggle && (
                  <div className="relative" ref={menuRef} data-columns-menu>
                    <Button
                      variant="outline"
                      size="default"
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] bg-gradient-to-br from-primary/10 to-primary/30 border border-primary/40 px-4 py-1.5 rounded-full text-primary hover:from-primary/20 hover:to-primary/40"
                      onClick={() => setShowColumnsMenu(!showColumnsMenu)}
                    >
                      <SlidersHorizontal className="mr-1 h-4 w-4 text-[var(--text-muted)]" />
                      Columns
                    </Button>
                    {showColumnsMenu && (
                      <>
                        {/* Backdrop portal - allows outside click to close */}
                        {createPortal(
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowColumnsMenu(false)}
                          />,
                          document.body
                        )}
                        {/* Menu - styled like Settings dropdown */}
                        <div
                          ref={(el) => {
                            if (el) {
                              columnsMenuRef.current = el
                              // Measure and update position when menu mounts
                              requestAnimationFrame(() => {
                                const visibleColumns = table.getAllColumns().filter((column) => column.getCanHide()).length
                                const pos = checkMenuPosition(el, visibleColumns)
                                setColumnsMenuPosition(pos)
                              })
                            }
                          }}
                          className={`absolute right-0 w-48 rounded-2xl border border-[var(--border)] bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-sm p-2 z-50 overflow-hidden ${
                            columnsMenuPosition === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
                          }`}
                        >
                          {table
                            .getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => (
                              <label
                                key={column.id}
                                className="flex items-center gap-2 px-3 py-2 text-sm capitalize text-[var(--text)] hover:bg-[var(--border)] cursor-pointer transition-colors rounded-lg"
                              >
                                <input
                                  type="checkbox"
                                  checked={column.getIsVisible()}
                                  onChange={(value) => column.toggleVisibility(!!value.target.checked)}
                                  className="rounded border border-[var(--border)]"
                                />
                                {column.id.replace(/_/g, ' ')}
                              </label>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="px-6 py-4">
          {loading ? (
            <SkeletonTable rows={5} columns={columns.length} />
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {emptyIcon && (
                <div className="rounded-full bg-gradient-to-br from-primary/10 to-primary/20 p-4 mb-4 backdrop-blur-sm border border-white/30">
                  {React.createElement(emptyIcon, { className: 'h-8 w-8 text-primary' })}
                </div>
              )}
              {emptyTitle && <h3 className="text-lg font-semibold mb-2">{emptyTitle}</h3>}
              {emptyDescription && (
                <p className="text-muted-foreground max-w-sm mb-4">{emptyDescription}</p>
              )}
              {emptyAction}
            </div>
          ) : (
            <>
              <Table className="min-w-full" style={{ backgroundColor: 'var(--grid-bg)' }}>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow
                      key={headerGroup.id}
                      style={{ backgroundColor: 'var(--grid-header)' }}
                      className="border-blue-300 dark:border-blue-700"
                    >
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                        className="hover-elevate border-blue-200 dark:border-blue-700"
                        style={{
                          backgroundColor: row.getIsSelected() ? 'var(--grid-header)' : 'var(--grid-bg)'
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-3">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={table.getAllColumns().length}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No results found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {!hidePagination && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {totalRows > 0 ? displayStart : 0} to {displayEnd} of {totalRows} results
                  </div>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page</span>
                      <Select
                        value={pageSize}
                        onChange={(e) => table.setPageSize(Number(e.target.value))}
                      >
                        {[10, 25, 50].map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!canPreviousPage}
                        className="bg-[var(--background)] border-[var(--border)] disabled:opacity-50"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => table.previousPage()}
                        disabled={!canPreviousPage}
                        className="bg-[var(--background)] border-[var(--border)] disabled:opacity-50"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1 px-2">
                        <span className="text-sm text-muted-foreground">Page</span>
                        <span className="text-sm font-medium">{totalRows === 0 ? 0 : pageIndex + 1}</span>
                        <span className="text-sm text-muted-foreground">of</span>
                        <span className="text-sm font-medium">{totalPages || 1}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => table.nextPage()}
                        disabled={!canNextPage}
                        className="bg-[var(--background)] border-[var(--border)] disabled:opacity-50"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => table.setPageIndex(totalPages - 1)}
                        disabled={!canNextPage}
                        className="bg-[var(--background)] border-[var(--border)] disabled:opacity-50"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}

export default DataTable
