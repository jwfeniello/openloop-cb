"use client"

import { useRef, useEffect, useState } from "react"
import { ColumnDef, createColumnHelper } from "@tanstack/react-table"
import Image from 'next/image'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { IoPlayOutline, IoPlay, IoAddOutline } from "react-icons/io5";
import { ImLoop } from "react-icons/im";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Pack = {
  id: number
  type: string
  name: string
  author: string
  cover: string
  tags: Array<string>
}

export type Sample = {
  id: number
  file: string
  name: string
  pack: Pack
  category: string
  duration: number
  tags: Array<string>
  peaks?: Array<number>
  key?: string | null
  bpm?: number | null
}

const columnHelper = createColumnHelper<Sample>()

export function getTags(row) {
  var tags = row.getValue("tags").toString()
  var tagsfield = tags.split(",").map(function(item) {
    return item.trim();
  });
  return tagsfield
}

function TagsList({ tags }: { tags: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(tags.length)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const checkOverflow = () => {
      const children = Array.from(container.children) as HTMLElement[]
      if (children.length === 0) return

      const containerWidth = container.getBoundingClientRect().width
      let totalWidth = 0
      let count = 0

      for (let i = 0; i < children.length; i++) {
        const gap = i > 0 ? 4 : 0 // gap-1 is 4px
        const childWidth = children[i].getBoundingClientRect().width
        
        if (totalWidth + childWidth + gap <= containerWidth) {
          totalWidth += childWidth + gap
          count++
        } else {
          break
        }
      }
      setVisibleCount(count)
    }

    checkOverflow()

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(checkOverflow)
      observer.observe(container)
      return () => observer.disconnect()
    }
  }, [tags])

  return (
    <div ref={containerRef} className="flex flex-row gap-1 w-full overflow-hidden whitespace-nowrap items-center">
      {tags.map((tag, idx) => (
        <Link
          key={tag}
          href={`/samples?tags=${encodeURIComponent(tag)}`}
          className="inline-flex items-center rounded bg-sky-950/60 px-1.5 py-0.5 text-[10px] font-medium text-sky-300 ring-1 ring-inset ring-sky-800/60 hover:bg-sky-900/80 hover:text-sky-100 transition-colors whitespace-nowrap"
          style={{
            visibility: idx < visibleCount ? 'visible' : 'hidden',
          }}
        >
          #{tag}
        </Link>
      ))}
    </div>
  )
}

const ScrollableTableName = ({ 
    name, 
    replaceUnderscores, 
    scrollLongNames
}: { 
    name: string; 
    replaceUnderscores: boolean; 
    scrollLongNames: boolean; 
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [scrollAmount, setScrollAmount] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    let displayName = name ? name.replace(/\.[^/.]+$/, "") : "";
    if (replaceUnderscores) {
        displayName = displayName.replace(/_/g, " ");
    }

    useEffect(() => {
        const checkScroll = () => {
            if (containerRef.current && textRef.current) {
                const containerWidth = containerRef.current.getBoundingClientRect().width;
                const textWidth = textRef.current.scrollWidth;
                if (textWidth > containerWidth) {
                    setScrollAmount(textWidth - containerWidth + 12); // padding offset
                } else {
                    setScrollAmount(0);
                }
            }
        };

        checkScroll();

        if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
            const observer = new ResizeObserver(checkScroll);
            observer.observe(containerRef.current);
            return () => observer.disconnect();
        }
    }, [name, replaceUnderscores, scrollLongNames]);

    const style = (scrollLongNames && scrollAmount > 0) ? {
        transform: isHovered ? `translateX(-${scrollAmount}px)` : "translateX(0px)",
        transition: "transform 3s ease-in-out",
    } : {};

    return (
        <div 
            ref={containerRef} 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="w-full overflow-hidden whitespace-nowrap cursor-default"
        >
            <span 
                ref={textRef}
                style={style}
                className={`font-bold text-[13.5px] inline-block ${
                    (scrollLongNames && scrollAmount > 0 && isHovered)
                        ? "overflow-visible max-w-none"
                        : "truncate max-w-full"
                }`}
            >
                {displayName}
            </span>
        </div>
    );
};

export const columns: ColumnDef<Sample>[] = [
  // Display Column
  columnHelper.display({
    id: 'image',
    header: "",
    cell: props => {
      const image = props.row.original.pack.cover;
      const bpm = props.row.original.bpm;
      const duration = props.row.original.duration;
      const isLoop = bpm !== null && bpm !== undefined && bpm > 0 && duration > 4;

      const getMediaBaseUrl = () => {
        const url = process.env.NEXT_PUBLIC_MEDIA_URL || "";
        if (url.includes("localhost") || url.includes("127.0.0.1") || url.includes("192.168") || url.includes("10.0.") || url.includes("172.")) {
          return "";
        }
        return url;
      };
      const mediaBaseUrl = getMediaBaseUrl();
      const coverfix = `${mediaBaseUrl}/media/uploads/` + props.row.original.pack.name + "/Artworks/" + image.split('/').pop()

      return (
        <div className="relative size-8 shrink-0">
          <button className="transition relative group flex py-0 px-0 rounded-full size-8 overflow-clip hover:shadow-sm hover:ring-1 hover:ring-black">
            <IoAddOutline className="absolute top-0 z-10 transition rounded-full scale-0 size-8 group-hover:scale-100 text-black bg-slate-50" />
            <img
             className="absolute top-0 z-0 rounded-full transition size-8 group-hover:scale-70"
              alt="cover"
              src={ coverfix }
              width={32}
              height={32}
            />
          </button>
          {isLoop && (
            <div 
              className="absolute -bottom-0.5 -right-0.5 z-20 bg-sky-950 text-sky-400 p-0.5 rounded-full ring-1 ring-sky-500/30 flex items-center justify-center pointer-events-none select-none size-3.5 shadow-md"
              title="Loop"
            >
              <ImLoop className="size-[8px]" />
            </div>
          )}
        </div>
      )
    },
  }),
  {
    accessorKey: "file",
    header: "",
    cell: ({row}) => {
      return <button className="relative group transition flex size-7 rounded-full p-1 hover:ring-1 hover:ring-black">
        <IoPlayOutline className="transition absolute top-0 left-0 m-1 translate-x-[1px] size-5 scale-90 group-hover:opacity-0"/>
        <IoPlay className="transition absolute top-0 left-0 m-1 translate-x-[1px] scale-0 size-5 group-hover:scale-100"/>
      </button>
    }
  },
  {
    accessorKey: "name",
    header: () => <div className="flex text-xs font-semibold uppercase tracking-wider text-gray-200 my-auto">Name</div>,
    cell: ({ row, table }) => {
      const name = row.getValue("name") as string;
      const meta = table.options.meta as any;
      const replaceUnderscores = meta?.replaceUnderscores;
      const scrollLongNames = meta?.scrollLongNames;

      return (
        <ScrollableTableName
          name={name}
          replaceUnderscores={replaceUnderscores}
          scrollLongNames={scrollLongNames}
        />
      );
    }
  },
  {
    id: "waveform",
    header: () => <div className="flex text-xs font-semibold uppercase tracking-wider text-gray-200 my-auto">Waveform</div>,
    cell: ({ row, table }) => {
      const meta = table.options.meta as any;
      const currentAudioDbId = meta?.currentAudioDbId;
      const progress = meta?.progress || 0;
      const isCurrent = currentAudioDbId === row.original.id;

      const peaks = row.original.peaks;
      if (!peaks || !Array.isArray(peaks) || peaks.length === 0) {
        return (
          <div className="w-24 h-6 flex items-center">
            <div className="w-full h-[2px] bg-gray-700/50 rounded" />
          </div>
        );
      }

      const barCount = 24;
      const step = Math.max(1, Math.floor(peaks.length / barCount));
      const bars: number[] = [];
      for (let i = 0; i < barCount; i++) {
        const peakIndex = i * step;
        if (peakIndex < peaks.length) {
          bars.push(peaks[peakIndex]);
        }
      }

      return (
        <div className="flex items-center h-6 w-24 pr-2">
          <svg className="w-full h-full text-zinc-700/50" viewBox="0 0 100 30" preserveAspectRatio="none">
            {bars.map((bar, idx) => {
              const barHeight = Math.max(2, (bar / 100) * 26);
              const y = (30 - barHeight) / 2;
              const x = (idx / barCount) * 100;
              const width = 100 / barCount - 1.5;
              
              const isPlayed = isCurrent && (idx / barCount) <= progress;
              const barColorClass = isPlayed 
                ? "text-sky-400 drop-shadow-[0_0_2px_rgba(56,189,248,0.5)]" 
                : "text-zinc-500 hover:text-zinc-300";

              return (
                <rect
                  key={idx}
                  x={x}
                  y={y}
                  width={Math.max(1.5, width)}
                  height={barHeight}
                  rx={1}
                  className={`fill-current transition-colors duration-150 ${barColorClass}`}
                />
              );
            })}
          </svg>
        </div>
      );
    }
  },
  {
    accessorKey: "tags",
    header: () => <div className="flex text-xs font-semibold uppercase tracking-wider text-gray-200 my-auto">Tags</div>,
    cell: ({ row }) => {
      const tagsVal = row.getValue("tags");
      const tagsStr = tagsVal ? tagsVal.toString() : "";
      if (!tagsStr) return null;

      const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
      const primaryTags = ['kick', 'snare', 'cymbal', 'percussion'];

      tags.sort((a, b) => {
        const aIndex = primaryTags.indexOf(a);
        const bIndex = primaryTags.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return 0;
      });

      return <TagsList tags={tags} />;
    }
  },
  {
    accessorKey: "duration",
    header: () => <div className="flex text-xs font-semibold uppercase tracking-wider text-gray-200 my-auto">Time</div>,
    cell: ({row}) => {
      const time = parseInt(row.getValue("duration"))
      if (time) {
        const minutes = Math.floor(time / 60)
        const seconds = time % 60
        const ftime = minutes + ":" + seconds.toString().padStart(2, "0")
        return <span className="items-center self-center px-1 py-0.5">{ftime}</span>
      }
      else {
        return
      }
    }
  },
  {
    accessorKey: "key",
    header: () => <div className="flex text-xs font-semibold uppercase tracking-wider text-gray-200 my-auto">Key</div>,
    cell: ({row}) => {
      const val = row.original.key;
      return val ? (
        <span className="items-center self-center px-1 py-0.5 text-gray-300 font-medium">{val}</span>
      ) : (
        <span className="items-center self-center px-1 py-0.5 text-gray-500">—</span>
      );
    }
  },
  {
    accessorKey: "bpm",
    header: () => <div className="flex text-xs font-semibold uppercase tracking-wider text-gray-200 my-auto">Bpm</div>,
    cell: ({row}) => {
      const val = row.original.bpm;
      return val ? (
        <span className="items-center self-center px-1 py-0.5 text-gray-300 font-medium">{val}</span>
      ) : (
        <span className="items-center self-center px-1 py-0.5 text-gray-500">—</span>
      );
    }
  },
  {
    accessorKey: "category",
    header: () => <div className="flex text-xs font-semibold uppercase tracking-wider text-gray-200 my-auto">Category</div>,
    cell: ({ row }) => <span className="text-[13px] text-gray-300 capitalize">{row.original.category}</span>
  },
  {
    accessorKey: "pack",
    header: () => <div className="flex text-xs font-semibold uppercase tracking-wider text-gray-200 my-auto">Pack</div>,
    cell: ({row}) => <span className="text-[13px] text-gray-300">{row.original.pack?.name || ""}</span>
  },
  columnHelper.display({
    id: 'actions',
    header: "",
    cell: props => {
      const data = props.row.original
      const params = new URLSearchParams()
      params.set('file', data.name)
      params.set('pack', data.pack.name)
      params.set('category', data.category)
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="justify-self-end h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              className="hover:bg-gray-300"
              onClick={() => navigator.clipboard.writeText(data.file)}
            >
              Copy url
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem >
              <a href={"/samples/download?" + params.toString()}>Download Sample</a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  }),
]
