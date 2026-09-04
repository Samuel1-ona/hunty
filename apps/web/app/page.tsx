import dynamic from "next/dynamic"

const GameArcade = dynamic(() => import("@/components/HomeClient"), {
  ssr: true,
})

export default function Page() {
  return <GameArcade />
}
