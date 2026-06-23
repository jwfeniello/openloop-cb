'use client'

import { Player, AudioFile } from "@/components/player"
import { Sample, columns } from "./columns"
import { DataTable } from "./data-table"
import { useEffect, Suspense, useState } from "react"

export type ApiPage = {
  count: number;
  next;
  previuos;
  results: Array<Sample>;
}


export default function Samples() {
  const [data, setData] = useState<ApiPage>()
  const [audio, setAudio] = useState<AudioFile>()
  const [playing, setPlaying] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)

  const [replaceUnderscores, setReplaceUnderscores] = useState<boolean>(false)
  const [scrollLongNames, setScrollLongNames] = useState<boolean>(false)

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setReplaceUnderscores(localStorage.getItem('replaceUnderscores') === 'true')
      setScrollLongNames(localStorage.getItem('scrollLongNames') === 'true')
    }
  }, [])

  const handleToggleReplaceUnderscores = (val: boolean) => {
    setReplaceUnderscores(val)
    localStorage.setItem('replaceUnderscores', String(val))
  }

  const handleToggleScrollLongNames = (val: boolean) => {
    setScrollLongNames(val)
    localStorage.setItem('scrollLongNames', String(val))
  }

  function getData() {
    const page = fetch('/samples/api')
    .then((res) => res.json())
    .then((data) => {setData(data)})
  }

  const playSong = (id:number) => {
    const file = data.results[id]
    if (!file) return;
    const getMediaBaseUrl = () => {
      const url = process.env.NEXT_PUBLIC_MEDIA_URL || "";
      if (url.includes("localhost") || url.includes("127.0.0.1") || url.includes("192.168") || url.includes("10.0.") || url.includes("172.")) {
        return "";
      }
      return url;
    };
    const mediaBaseUrl = getMediaBaseUrl();
    const urlfix = `${mediaBaseUrl}/media/uploads/` + file.pack.name + "/Sounds/" + file.category + "/" + file.file.split('/').pop()
    const coverfix = `${mediaBaseUrl}/media/uploads/` + file.pack.name + "/Artworks/" + file.pack.cover.split('/').pop()
    const audiofile: AudioFile = {
      id: id,
      dbId: file.id,
      title: file.name ? file.name.replace(/\.[^/.]+$/, "") : "",
      url: urlfix,
      author: file.pack.name,
      thumbnail: coverfix,
      category: file.category,
      packName: file.pack.name,
      fileName: file.name,
    }
    setAudio(audiofile)
    setPlaying(true)
    setProgress(0)
  }

  const updateData = (data: ApiPage) => {
    setData(data)
  }

  const skipForward = () => {
    if (audio.id + 1 < data.results.length) {
      playSong(audio.id + 1)
    } else {
      console.log('end of array')
    }
  }
  const skipBackward = () => {
    if (audio.id > 0) {
      playSong(audio.id - 1)
    } else {
      console.log('start of array')
    }
  }

  useEffect(() => {
    getData()
  },[])
  
  return (
    <>
    <div className={"flex transition pt-16 overflow-hidden w-full h-screen " + (audio ? "pb-24" : "")}>
      <Suspense>
        <DataTable 
          columns={columns}
          paginate={data}
          currentAudioDbId={audio?.dbId}
          isPlaying={playing}
          progress={progress}
          playSong={playSong}
          setPlaying={setPlaying}
          onDataUpdate={updateData}
          replaceUnderscores={replaceUnderscores}
          scrollLongNames={scrollLongNames}
        />
      </Suspense>
    </div>
    <div className={"transition fixed bottom-0 sm:w-4/5 w-full p-2 " + (audio ? "" : "translate-y-24")}>
      {audio 
        ? (
          <Player
            audio={audio}
            playing={playing}
            setPlaying={setPlaying}
            progress={progress}
            setProgress={setProgress}
            onFwd={skipForward}
            onBwd={skipBackward}
            replaceUnderscores={replaceUnderscores}
            setReplaceUnderscores={handleToggleReplaceUnderscores}
            scrollLongNames={scrollLongNames}
            setScrollLongNames={handleToggleScrollLongNames}
          />
          )
        : <></>
      }
    </div>
    </>
    
  )
}
