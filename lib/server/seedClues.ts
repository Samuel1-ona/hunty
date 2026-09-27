import type { Clue } from "@/lib/types"

export const SEED_CLUES: Clue[] = [
  { id: 1, huntId: 1, question: "What landmark is at the town center?", answer: "fountain", points: 10 },
  { id: 2, huntId: 1, question: "Find the historic clock tower", answer: "clock tower", points: 15 },
  { id: 3, huntId: 1, question: "What color is the old town hall door?", answer: "green", points: 10 },
  { id: 4, huntId: 1, question: "Locate the hidden mural on Main Street", answer: "phoenix", points: 20 },
  { id: 5, huntId: 1, question: "Count the arches on the bridge", answer: "3", points: 15 },
  { id: 6, huntId: 2, question: "What is the library's mascot?", answer: "owl", points: 10 },
  { id: 7, huntId: 2, question: "Find the oldest tree on campus", answer: "oak", points: 15 },
  { id: 8, huntId: 2, question: "What year was the science hall built?", answer: "1965", points: 20 },
  { id: 9, huntId: 2, question: "Decode the message at the student center", answer: "carpe diem", points: 25 },
  { id: 10, huntId: 2, question: "Name the statue near the fountain", answer: "pioneer", points: 15 },
  { id: 11, huntId: 2, question: "What is engraved on the bell tower?", answer: "knowledge", points: 20 },
  { id: 12, huntId: 2, question: "Find the hidden lab entrance", answer: "basement", points: 10 },
  { id: 13, huntId: 3, question: "The desk where I work hides a clue", answer: "monitor", points: 10 },
  { id: 14, huntId: 3, question: "Look for the sticky note on the whiteboard", answer: "synergy", points: 15 },
  { id: 15, huntId: 3, question: "What is the coffee blend in the break room?", answer: "colombian", points: 10 },
  { id: 16, huntId: 3, question: "Find the secret message in the server room", answer: "42", points: 20 },
  { id: 17, huntId: 4, question: "Treasure is buried beneath the old pine", answer: "pine", points: 15 },
  { id: 18, huntId: 4, question: "Follow the stone path to the answer", answer: "gazebo", points: 20 },
  { id: 19, huntId: 4, question: "What is carved into the park bench?", answer: "wanderlust", points: 10 },
  { id: 20, huntId: 5, question: "Which painting hangs in the east wing?", answer: "mona lisa", points: 20 },
  { id: 21, huntId: 5, question: "What dinosaur skeleton is in the main hall?", answer: "t rex", points: 25 },
]

export function getServerClues(): Clue[] {
  return [...SEED_CLUES]
}

export function getServerCluesByHunt(huntId: number): Clue[] {
  return SEED_CLUES.filter((c) => c.huntId === huntId)
}

export function getServerClue(huntId: number, clueId: number): Clue | undefined {
  return SEED_CLUES.find((c) => c.huntId === huntId && c.id === clueId)
}
