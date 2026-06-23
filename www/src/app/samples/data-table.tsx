"use client"

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApiPage } from "./page"
import {Sample, columns} from "./columns"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import { IoChevronDown, IoPlay, IoPlayOutline, IoPause, IoPauseOutline } from "react-icons/io5"

export type Props = {
  columns: typeof columns;
  paginate: any;
  currentAudioDbId?: number;
  isPlaying: boolean;
  progress: number;

  playSong: (id: number) => void;
  setPlaying: (playing: boolean) => void;
  onDataUpdate: (data: ApiPage) => void;
  replaceUnderscores: boolean;
  scrollLongNames: boolean;
}

export function DataTable({
  columns,
  paginate,
  currentAudioDbId,
  isPlaying,
  progress,
  playSong,
  setPlaying,
  onDataUpdate,
  replaceUnderscores,
  scrollLongNames,
}:Props) {
  
  const searchParams = useSearchParams()
  const [data, setData] = useState(Array<Sample>)
  const router = useRouter()
  const pathname = usePathname()

  const [packs, setPacks] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')

  useEffect(() => {
    fetch('/samples/packs')
      .then(res => res.json())
      .then(data => setPacks(data || []))
      .catch(err => console.error("Error fetching packs:", err))
  }, [])

  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '')
  }, [searchParams])

  // Debounce search input updates (searches automatically after 700ms of inactivity)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const currentSearch = searchParams.get('search') || ''
      if (searchQuery !== currentSearch) {
        updateFilter({ search: searchQuery })
      }
    }, 700)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  const updateFilter = (filters: { [key: string]: string | null }) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(filters).forEach(([key, val]) => {
      if (val === null || val === '') {
        params.delete(key)
      } else {
        params.set(key, val)
      }
    })
    params.delete('page')
    router.push(pathname + '?' + params.toString())
  }

  const [state, setState] = useState({
    pagination: {
      pageIndex: 0,
      pageSize: 50,
    }
  })
  const [sorting, setSorting] = useState('name')

  const table = useReactTable<Sample>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: Math.ceil((paginate?.count || 0) / 50),
    autoResetPageIndex: false,
    state,
    onStateChange: setState,
    meta: {
      currentAudioDbId,
      isPlaying,
      progress,
      replaceUnderscores,
      scrollLongNames,
    }
  })

  function getCellClass(id: string, isheader: boolean) {
    /**
     * get extra style classes dinamically
     * id: name of the header
     */
    var classname = ''
    // add dimension and flex properties to all cols
    switch (id){
      case 'image':
        classname = 'basis-12 shrink-0 grow-0'
        break;
      case 'file':
        classname = 'basis-12 shrink-0 grow-0'
        break;
      case 'name':
        classname = 'w-48 grow shrink-0 truncate pr-5'
        break;
      case 'tags':
        classname = 'flex-row gap-1.5 w-36 shrink-0'
        break;
      case 'waveform':
        classname = 'w-24 shrink-0 grow-0 flex items-center pl-2 pr-2'
        break;
      case 'duration':
        classname = 'basis-[70px] shrink-0'
        break;
      case 'key':
        classname = 'w-16 shrink-0 transition hidden sm:flex items-center justify-center'
        break;
      case 'bpm':
        classname = 'w-16 shrink-0 transition hidden sm:flex items-center justify-center'
        break;
      case 'category':
        classname = 'w-36 shrink truncate transition hidden sm:flex'
        break;
      case 'pack':
        classname = 'w-48 shrink truncate transition hidden sm:flex grow'
        break;
      case 'actions':
        classname = 'basis-12 items-end'
        break;
    }

    // add header specific rules for pointer events 
    if (isheader == true) {
      switch (id){
        case 'image':
          classname = classname + ' pointer-events-none'
          break;
        case 'file':
          classname = classname + ' pointer-events-none'
          break;
        case 'name':
          classname = classname + ' pointer-events-auto'
          break;
        case 'tags':
          classname = classname + ' pointer-events-auto'
          break;
        case 'waveform':
          classname = classname + ' pointer-events-none'
          break;
        case 'duration':
          classname = classname + ' pointer-events-auto'
          break;
        case 'key':
          classname = classname + ' pointer-events-auto'
          break;
        case 'bpm':
          classname = classname + ' pointer-events-auto'
          break;
        case 'category':
          classname = classname + ' pointer-events-auto'
          break;
        case 'pack':
          classname = classname + ' pointer-events-auto'
          break;
        case 'actions':
          classname = classname + ' pointer-events-none'
        break;
      }
    }

    return classname
  }


  
  function changePage(index = 0) {
    const params = new URLSearchParams(searchParams.toString())
    if (index > 1) {
      params.set('page', index.toString())
    } else {
      params.delete('page')
    }
    router.push(pathname + '?' + params.toString())
  }

  function getOrderingParams(order: string) {
    /**
     * get URLSearchParams of the ordering requested
     * add '-' to reverse order if param is already present
     * keeps other params, if present
     * @param order ordering requested as string
     * @returns string with params without the leading '?'
     */
    const params = new URLSearchParams(searchParams.toString())
    if (params.has('ordering', order)) {
      order = "-" + order
      
    }
    params.set('ordering', order)
    return params.toString()
  }

  function getNewSamplesQuery(params: URLSearchParams) {
    // fetch samples and updates data state
    // TODO Handle errors in request
    const page = fetch('/samples/api?' + params.toString())
      .then((res) => res.json())
      .then((data) => {
        setData(data.results)
        onDataUpdate(data)
        // scroll table to top
        var myDiv = document.getElementById('scrollarea');
        myDiv.scroll({ top: 0, behavior: 'smooth' });
      })
  }

  function getHeaderIconClass(id: string) {
    if (sorting.includes(id,1)) { //we only need to invert the icon so this only works if there is '-' before the ordering id and the id matches
      return "rotate-180"
    } else if (sorting == id) {
      return "inline-block"
    } else {
      return "hidden"
    }
  }
  
  function clickPlay(idStr: string) {
    const index = parseInt(idStr);
    const sample = data[index];
    if (sample && currentAudioDbId === sample.id) {
      if (isPlaying) {
        setPlaying(false);
      } else {
        if (progress === 1) {
          playSong(index);
        } else {
          setPlaying(true);
        }
      }
    } else {
      playSong(index);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    getNewSamplesQuery(params)
    if (params.has('ordering')) {
      setSorting(params.get('ordering'))
    }
    const pageVal = params.get('page')
    const pageIndex = pageVal ? parseInt(pageVal) - 1 : 0
    setState(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        pageIndex
      }
    }))
  }, [searchParams])
  
  return (
  <div className="flex relative w-full h-full">
    {/* Filter and Search Toolbar - Positioned inside Header */}
    <div className="fixed top-4 right-4 z-50 flex items-center justify-between text-white bg-transparent w-[calc(100%-2rem)] sm:w-[calc(80%-2rem)]">
      {/* Search Input & Active Tag Badge */}
      <div className="flex items-center gap-1.5 sm:gap-2 max-w-xs sm:max-w-lg">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateFilter({ search: searchQuery })
              }
            }}
            className="w-28 sm:w-48 bg-gray-800/90 text-white rounded-md pl-8 pr-7 py-1 text-xs sm:text-sm border border-gray-700 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all focus:w-36 sm:focus:w-56"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); updateFilter({ search: '' }) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs">
              ✕
            </button>
          )}
        </div>

        {searchParams.get('tags') && (
          <div className="hidden xs:flex items-center gap-1 bg-sky-950/80 border border-sky-800 text-sky-300 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold shrink-0">
            <span>#{searchParams.get('tags')}</span>
            <button onClick={() => updateFilter({ tags: null })} className="hover:text-white ml-0.5 font-bold">✕</button>
          </div>
        )}

        {searchParams.get('category') && (
          <div className="hidden xs:flex items-center gap-1 bg-slate-800/80 border border-slate-700 text-slate-200 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold shrink-0 capitalize">
            <span>{searchParams.get('category')}</span>
            <button onClick={() => updateFilter({ category: null })} className="hover:text-white ml-0.5 font-bold">✕</button>
          </div>
        )}
      </div>

      {/* Pack Selector Dropdown */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <span className="text-xs text-gray-400 font-medium hidden md:inline">Pack:</span>
        <select
          value={searchParams.get('pack') || ''}
          onChange={(e) => updateFilter({ pack: e.target.value })}
          className="bg-gray-800/90 text-white rounded-md px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border border-gray-700 focus:outline-none focus:ring-1 focus:ring-sky-500 max-w-[100px] sm:max-w-[200px]"
        >
          <option value="">All Packs</option>
          {packs.map((p: any) => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>
    </div>

      <Table className="flex">
        <TableHeader className="transition-all flex fixed right-0 top-16 z-10 rounded-md w-full sm:w-4/5 p-2 bg-gray-900 border-b border-gray-800">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow className="transition-all flex flex-row items-center justify-start w-full border bg-slate-500 hover:bg-slate-500 border-black rounded-md shadow-lg overflow-clip pointer-events-none" key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead className={ "transition flex flex-col self-center px-2 text-white hover:bg-slate-600 hover:shadow-md rounded-md cursor-pointer " + getCellClass(header.id, true) } 
                    key={header.id} 
                    onClick={() => {router.push(pathname + '?' + getOrderingParams(header.id))}}>
                    <div className="flex my-auto flex-row">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    <IoChevronDown className={"size-4 self-end ml-1 mb-[1px] " + getHeaderIconClass(header.id)}/>
                    </div>
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody id="scrollarea" className="flex flex-col z-0 w-full h-screen pt-16 overflow-auto px-2">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                tabIndex={0}
                className="flex flex-row min-h-[44px] py-1 items-center"
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={ "p-2 flex flex-col " + getCellClass(cell.column.id, false) }>
                    { cell.column.id == 'file' 
                    ? (
                      <button className="relative group transition flex size-7 rounded-full p-1 hover:ring-1 hover:ring-black" onClick={() => clickPlay(row.id)}>
                        {currentAudioDbId === row.original.id && isPlaying ? (
                          <>
                            <IoPauseOutline className="transition absolute top-0 left-0 m-1 translate-x-[1px] size-5 scale-90 group-hover:opacity-0"/>
                            <IoPause className="transition absolute top-0 left-0 m-1 translate-x-[1px] scale-0 size-5 group-hover:scale-100"/>
                          </>
                        ) : (
                          <>
                            <IoPlayOutline className="transition absolute top-0 left-0 m-1 translate-x-[1px] size-5 scale-90 group-hover:opacity-0"/>
                            <IoPlay className="transition absolute top-0 left-0 m-1 translate-x-[1px] scale-0 size-5 group-hover:scale-100"/>
                          </>
                        )}
                      </button>
                      )
                    : flexRender(cell.column.columnDef.cell, cell.getContext())
                    }
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

    <div className="transition absolute bottom-0 right-0 items-center justify-start space-x-2 py-4 pr-10">
      <Button
        variant="outline"
        size="sm"
        onClick={() => changePage((state.pagination.pageIndex + 1) - 1)}
        disabled={!table.getCanPreviousPage()}
      >
        Previous
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => changePage((state.pagination.pageIndex + 1) + 1)}
        disabled={!table.getCanNextPage()}
      >
        Next
      </Button>
    </div>
  </div>
  )
}
