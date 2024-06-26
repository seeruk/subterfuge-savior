import { useCallback, useEffect, useState } from "react"
import { useLocalStorage } from "@uidotdev/usehooks"
import { twMerge } from "tailwind-merge"

import { ArrowInput } from "~/components/ArrowInput"
import { ProgressBar } from "~/components/ProgressBar"
import { highScoreKey } from "~/consts"
import { asPercentage } from "~/lib/utils"
import { Stratagem } from "~/stratagems"
import { bgmSound } from "~/sounds"
import { GameMode } from "~/types"

const timerIncrementMax = 1000
const timerIncrementBase = 500 // Calculated from my personal average response time...
const timerIncrementFactor = (timerIncrementMax - timerIncrementBase) / 9

export type RoundProps = {
  mode: GameMode
  round: number
  roundLength: number
  score: number
  stratagems: Stratagem[]
  onInputSuccess: (sequenceIdx: number) => void
  onInputFailure: () => void
  onRoundSuccess: (timer: number) => void
  onRoundFailure: () => void
}

export function Round({
  mode,
  round,
  roundLength,
  score,
  stratagems,
  onInputSuccess,
  onInputFailure,
  onRoundSuccess,
  onRoundFailure,
}: RoundProps) {
  const [now, setNow] = useState(Date.now())
  const [end, setEnd] = useState(Date.now() + roundLength)
  const [sequenceIdx, setSequenceIdx] = useState(0)
  const [highScore] = useLocalStorage(`${highScoreKey}-${mode}`, 0)

  const timer = end - now
  const danger = timer < 2000

  // This callback needs to remain quite stable, otherwise on each change
  // it'll get called multiple times by the ArrowInput component.
  const onInputSuccessCb = useCallback(() => {
    const stratagem = stratagems[sequenceIdx]
    let newEnd = end + timerIncrementBase + timerIncrementFactor * stratagem.sequence.length
    if (newEnd - Date.now() > roundLength) {
      newEnd = Date.now() + roundLength
    }
    onInputSuccess(sequenceIdx)
    if (sequenceIdx === stratagems.length - 1) {
      onRoundSuccess(newEnd - Date.now())
      return
    }
    setSequenceIdx((idx) => idx + 1)
    setEnd(newEnd)
  }, [end, onInputSuccess, onRoundSuccess, roundLength, sequenceIdx, stratagems])

  // BGM
  useEffect(() => {
    bgmSound.play()
    return () => {
      bgmSound.stop()
    }
  }, [])

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now()
      setNow(now)
      if (now >= end) {
        clearInterval(intervalId)
        onRoundFailure()
        return
      }
    }, 1000 / 60) // 60 "FPS"?

    return () => clearInterval(intervalId)
  }, [end, roundLength, onRoundFailure])

  const icons = stratagems.slice(sequenceIdx, sequenceIdx + 6).map((stratagem, i) => {
    const Icon = stratagem.icon
    return (
      <Icon
        key={i}
        className={twMerge(
          "w-[78px] h-[78px] p-4",
          i === 0 && "border-yellow-300 border-[2px] w-[110px] h-[110px] p-2",
          danger && "border-red-500",
        )}
      />
    )
  })

  return (
    <div className="flex">
      <div className="w-[100px] font-bold">
        <p className="text-xl">Round</p>
        <p className={twMerge("text-yellow-300 text-3xl", danger && "text-red-500")}>{round}</p>
      </div>

      <div className="flex flex-col items-center w-[500px]">
        <div className="flex mb-1 w-full items-center">{icons}</div>

        <div
          className={twMerge(
            "mb-6 h-7 w-full bg-yellow-300 font-bold text-black text-center text-xl uppercase",
            danger && "bg-red-500",
          )}
        >
          {stratagems[sequenceIdx].name}
        </div>

        <ArrowInput
          blind={mode === GameMode.Blind}
          sequence={stratagems[sequenceIdx].sequence}
          onSuccess={onInputSuccessCb}
          onFailure={onInputFailure}
        />

        <ProgressBar
          className="mt-6"
          danger={danger}
          progress={asPercentage(end - now, roundLength)}
        />
      </div>

      <div className="w-[100px] font-bold text-right">
        <p>&nbsp;</p>
        <p className={twMerge("text-yellow-300 text-4xl", danger && "text-red-500")}>{score}</p>
        <p className="text-xl">Score</p>
        <p className="text-xs text-neutral-500">Highest: {highScore}</p>
      </div>
    </div>
  )
}
