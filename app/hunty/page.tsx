"use client"

import { logger } from "@/lib/logger"
import { Suspense, useState, useEffect, useRef } from "react"
import { motion, AnimatePresence, useReducedMotion, type Easing } from "framer-motion"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { z } from "zod"
import { createHunt } from "@/lib/contracts/hunt"
import { createRewardEscrow } from "@/lib/contracts/rewardManager"
import { withTransactionToast } from "@/lib/txToast"
import { addHunt as addStoredHunt, getAllHuntsIncludingPrivate } from "@/lib/huntStore"

import { dynapuff } from "@/lib/font"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, ArrowRight, Plus, QrCode, Download, Printer, PlayCircle, Share } from "lucide-react"
import { QrCodeModal } from "@/components/QrCodeModal"
import { Header } from "@/components/Header"
import { CreateGameTabs } from "@/components/CreateGameTabs"
import { HuntForm } from "@/components/HuntForm"
import { RewardsPanel } from "@/components/RewardsPanel"
import { GamePreview } from "@/components/GamePreview"
import { PublishModal } from "@/components/PublishModal"
import ToggleButton from "@/components/ToggleButton"
import { COVER_IMAGE_UPLOAD_ERROR_MESSAGE } from "@/lib/ipfs"
import type { CoverImageUploadState, HuntDraft, Reward } from "@/lib/types"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { downloadElementAsImage } from "@/lib/downloadAsImage"
import { buildDraftHuntsFromTemplate, getStarterTemplateBySlug } from "@/lib/huntTemplates"

const EMPTY_HUNT_DRAFT: HuntDraft = {
  id: 1,
  title: "",
  description: "",
  link: "",
  code: "",
}

function CreateGameContent() {  
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<"create" | "rewards" | "publish" | "leaderboard">("create")
  const [hunts, setHunts] = useLocalStorage<HuntDraft[]>("draft-hunts", [EMPTY_HUNT_DRAFT])
  const [rewards, setRewards] = useLocalStorage<Reward[]>("draft-rewards", []);
  const [rewardType, setRewardType] = useLocalStorage<"XLM" | "NFT" | "Both">("draft-rewardType", "XLM");
  const [gameName, setGameName] = useLocalStorage("draft-gameName", "Hunty")
  const [startDate, setStartDate] = useLocalStorage("draft-startDate", "")
  const [endDate, setEndDate] = useLocalStorage("draft-endDate", "")
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [direction, setDirection] = useState(0)
  const [creatorEmail, setCreatorEmail] = useState("")
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [timerEnabled, setTimerEnabled] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false);
  const [coverImageUploadStates, setCoverImageUploadStates] = useState<Record<number, CoverImageUploadState>>({})
  const [selectedTemplateTitle, setSelectedTemplateTitle] = useState<string | null>(null)
  const previewContainerRef = useRef<HTMLDivElement | null>(null)
  const appliedTemplateRef = useRef<string | null>(null)
  const router = useRouter()

  const prefersReducedMotion = useReducedMotion()

  const tabMotion = {
    initial: prefersReducedMotion ? false : { x: direction > 0 ? 50 : -50, opacity: 0 },
    animate: prefersReducedMotion ? {} : { x: 0, opacity: 1 },
    exit: prefersReducedMotion ? {} : { x: direction > 0 ? -50 : 50, opacity: 0 },
    transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: "easeInOut" as Easing },
  }

  const tabToIndex = { create: 0, rewards: 1, publish: 2, leaderboard: 3 }

  const handleTabChange = (newTab: "create" | "rewards" | "publish" | "leaderboard") => {
    const newIdx = tabToIndex[newTab]
    const oldIdx = tabToIndex[activeTab]
    setDirection(newIdx > oldIdx ? 1 : -1)
    setActiveTab(newTab)
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "publish" || tab === "rewards" || tab === "create") {
        setActiveTab(tab as "publish" | "rewards" | "create");
      }
    }
  }, []);

  useEffect(() => {
    const templateSlug = searchParams.get("template")
    if (!templateSlug || appliedTemplateRef.current === templateSlug) return

    const template = getStarterTemplateBySlug(templateSlug)
    if (!template) return

    appliedTemplateRef.current = templateSlug
    setGameName(template.title)
    setHunts(buildDraftHuntsFromTemplate(template))
    setActiveTab("create")
    setSelectedTemplateTitle(template.title)
    toast.success(`Loaded ${template.title}. You can edit every field before publishing.`)
    router.replace("/hunty")
  }, [router, searchParams, setGameName, setHunts])

  const rewardPool = rewards.reduce((sum, r) => sum + r.amount, 0)

  const setCoverImageUploadState = (huntId: number, state: CoverImageUploadState) => {
    setCoverImageUploadStates((current) => {
      if (state === "idle" || state === "succeeded") {
        const next = { ...current }
        delete next[huntId]
        return next
      }

      return { ...current, [huntId]: state }
    })
  }

  const getCoverImageUploadBlockMessage = () => {
    const states = Object.values(coverImageUploadStates)

    if (states.includes("uploading")) {
      return "Please wait for the cover image upload to finish before publishing."
    }

    if (states.includes("failed")) {
      return COVER_IMAGE_UPLOAD_ERROR_MESSAGE
    }

    return null
  }

  const huntItemSchema = z.object({
    id: z.number(),
    title: z.string().min(4, "Clue title must be at least 4 characters."),
    description: z.string().min(8, "Clue description must be at least 8 characters."),
    link: z.string().optional().or(z.literal("")),
    code: z.string().optional().or(z.literal("")),
    image: z.string().optional().or(z.literal("")),
  })

  const rewardItemSchema = z.object({
    place: z.number().int().positive(),
    amount: z.number().positive("Reward amount must be greater than 0."),
    icon: z.any().optional(),
  })

  const formSchema = z
    .object({
      gameName: z.string().min(4, "Title length must be > 3 chars."),
      startDate: z.string().min(1, "Start date is required."),
      endDate: z.string().min(1, "End date is required."),
      creatorEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
      emailNotifications: z.boolean(),
      timerEnabled: z.boolean(),
      isPrivate: z.boolean(),
      rewardType: z.enum(["XLM", "NFT", "Both"] as const),
      hunts: z.array(huntItemSchema).min(3, "At least 3 clues are required."),
      rewards: z.array(rewardItemSchema).min(1, "At least one reward slot is required."),
    })
    .refine(
      (data) => {
        const s = new Date(data.startDate)
        const e = new Date(data.endDate)
        if (!isNaN(s.getTime()) && !isNaN(e.getTime())) return s < e
        return false
      },
      {
        message: "Start Date must be before End Date.",
        path: ["startDate"],
      },
    )
    .refine(
      (data) => {
        const e = new Date(data.endDate)
        if (!isNaN(e.getTime())) return e.getTime() > Date.now()
        return false
      },
      {
        message: "End Date must be in the future.",
        path: ["endDate"],
      },
    )
    .refine(
      (data) => data.rewards.reduce((sum, reward) => sum + reward.amount, 0) > 0,
      {
        message: "Reward pool must be greater than 0 and based on reward buckets.",
        path: ["rewards"],
      },
    )

  type HuntCreationFormValues = z.infer<typeof formSchema>

  const {
    handleSubmit,
    setValue,
    trigger,
    formState: { errors, isValid },
  } = useForm<HuntCreationFormValues>({
    resolver: zodResolver(formSchema),
    mode: "all",
    defaultValues: {
      gameName,
      startDate,
      endDate,
      creatorEmail,
      emailNotifications,
      timerEnabled,
      isPrivate,
      rewardType,
      hunts,
      rewards,
    },
  })

  useEffect(() => {
    setValue("gameName", gameName)
    setValue("startDate", startDate)
    setValue("endDate", endDate)
    setValue("creatorEmail", creatorEmail)
    setValue("emailNotifications", emailNotifications)
    setValue("timerEnabled", timerEnabled)
    setValue("isPrivate", isPrivate)
    setValue("rewardType", rewardType)
    setValue("hunts", hunts)
    setValue("rewards", rewards)
    void trigger()
  }, [
    gameName,
    startDate,
    endDate,
    creatorEmail,
    emailNotifications,
    timerEnabled,
    isPrivate,
    rewardType,
    hunts,
    rewards,
    rewardPool,
    setValue,
    trigger,
  ])

  const isFormValidated = isValid

  const addReward = () => {
    setRewards([
      ...rewards,
      {
        place: rewards.length + 1,
        amount: 5.43,
        icon: undefined,
      },
    ]);
  };

  const deleteReward = (place: number) => {
    setRewards(rewards.filter((reward) => reward.place !== place));
  };

  const updateHunt = (id: number, field: string, value: string) => {
    setHunts(
      hunts.map((hunt) =>
        hunt.id === id ? { ...hunt, [field]: value } : hunt,
      ),
    );
  };

  const addHunt = () => {
    const newId = Math.max(...hunts.map((h) => h.id)) + 1;
    setHunts([
      ...hunts,
      { id: newId, title: "", description: "", link: "", code: "" },
    ]);
  };

  const removeHunt = (id: number) => {
    if (hunts.length > 1) {
      setHunts(hunts.filter((hunt) => hunt.id !== id));
      setCoverImageUploadStates((current) => {
        const next = { ...current }
        delete next[id]
        return next
      })
    }
  };

  const updateReward = (place: number, amount: number) => {
    setRewards(
      rewards.map((reward) =>
        reward.place === place ? { ...reward, amount, icon: undefined } : reward,
      ),
    );
  };

  const handlePublish = async (formValues: z.infer<typeof formSchema>) => {
    const coverImageUploadBlockMessage = getCoverImageUploadBlockMessage()
    if (coverImageUploadBlockMessage) {
      toast.error(coverImageUploadBlockMessage)
      return
    }

    if (!isFormValidated) {
      toast.error("Please fix validation issues before publishing the hunt.")
      return
    }

    setIsPublishing(true)
    try {
      const start_time = Math.floor(new Date(formValues.startDate).getTime() / 1000)
      const end_time = Math.floor(new Date(formValues.endDate).getTime() / 1000)
      const description = formValues.hunts.map((h) => `${h.title}: ${h.description}`).join("\n")
      const coverImageCid = formValues.hunts[0]?.image?.trim() || undefined
      const existing = getAllHuntsIncludingPrivate()
      const localId =
        existing.length > 0 ? Math.max(...existing.map((h) => h.id)) + 1 : 1

      let rewardEscrowTxHash: string | undefined

      await withTransactionToast(
        async (setStage) => {
          setStage("approving")
          const created = await createHunt(
            "",
            formValues.gameName,
            description,
            start_time,
            end_time,
            coverImageCid,
            formValues.creatorEmail,
            formValues.emailNotifications,
            formValues.isPrivate,
          )
          const escrow = await createRewardEscrow({
            huntId: localId,
            rewardType: formValues.rewardType,
            rewards: formValues.rewards,
            expiresAt: end_time,
          })
          rewardEscrowTxHash = escrow?.depositTxHash

          return {
            txHash: escrow?.depositTxHash ?? created.txHash,
          }
        },
        {
          pending:   "Pending — preparing your hunt…",
          approving: "Approving — sign in your wallet…",
          confirmed: "Hunt created successfully!",
        },
      );

      addStoredHunt({
        id: localId,
        title: formValues.gameName,
        description,
        cluesCount: formValues.hunts.length,
        status: "Draft",
        rewardType: formValues.rewardType,
        rewardPool,
        rewards: formValues.rewards.map(({ place, amount }) => ({ place, amount })),
        rewardEscrowTxHash,
        rewardEscrowBalance: formValues.rewardType === "NFT" ? 0 : rewardPool,
        playerCount: 0,
        createdAt: Math.floor(Date.now() / 1000),
        startTime: start_time,
        endTime: end_time,
        creatorEmail: formValues.creatorEmail || undefined,
        emailNotifications: formValues.emailNotifications,
        is_private: formValues.isPrivate,
        coverImageCid,
      })

      setShowPublishModal(false);
      router.push("/hunts");
    } catch (error) {
       logger.error("Publish failed:", error);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      // You could add a toast here if you have a toast system
    }
  };

  const handleDownloadImage = async () => {
    if (!previewContainerRef.current) {
      toast.error("Preview not available yet. Try again in a second.")
      return
    }

    try {
      await downloadElementAsImage(previewContainerRef.current, {
        filename: `${gameName || "hunty"}.png`,
      })
      toast.success("Preview downloaded.")
    } catch (error) {
      logger.error("Failed to download image:", error)
      toast.error("Could not download image.")
    }
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] dark:from-slate-900 dark:bg-slate-900 dark:to-slate-800 pb-28">
        <Header balance="24.2453" />

        <div className="max-w-[1500px] mx-auto px-40 pb-12 bg-white dark:bg-slate-900 rounded-4xl relative mt-4">
          <div className="pt-24 px-12 pb-12">
            <div className="flex justify-between items-center mb-10">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="flex items-center gap-2 border-[#3737A4] text-[#3737A4] hover:bg-[#3737A4] hover:text-white transition-all duration-300 rounded-full px-6"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Arcade
              </Button>
            </div>
            {/* Title */}
            <div className="text-center mb-12 relative">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#0C0C4F] shadow-lg absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                <Image src="/icons/logo.png" alt="Logo" width={96} height={96} />
              </div>
              <h1
                className={`text-4xl md:text-5xl font-bold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text mt-8 ${dynapuff.variable} antialiased `}
              >
                Create Scavenge Hunt
              </h1>
            </div>

            <div className="grid lg:grid-cols-2 gap-7">
              {/* Left Panel */}
              <div className="">
                <CreateGameTabs
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                />

                <div className="relative overflow-hidden min-h-[400px]">
                <AnimatePresence mode="wait" custom={direction}>
                  {activeTab === "create" && (
                    <motion.div
                      key="create"
                      custom={direction}
                      {...tabMotion}
                      className="space-y-6"
                    >
                      <div className="rounded-3xl border border-sky-100 bg-gradient-to-r from-white to-sky-50 p-5 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
                              Quick start
                            </p>
                            <h2 className="mt-1 text-xl font-bold text-slate-900">
                              {selectedTemplateTitle
                                ? `${selectedTemplateTitle} is loaded`
                                : "Need inspiration before you build?"}
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {selectedTemplateTitle
                                ? "Tweak the clue titles, descriptions, answers, and anything else until it feels like yours."
                                : "Browse starter hunts with sample clue cards, then bring one back here fully editable."}
                            </p>
                          </div>
                          <Button
                            asChild
                            variant="outline"
                            className="rounded-2xl border-[#0C0C4F] px-5 py-6 text-sm font-semibold text-[#0C0C4F] hover:bg-[#0C0C4F] hover:text-white"
                          >
                            <Link href="/hunty/templates">Start from Template</Link>
                          </Button>
                        </div>
                      </div>

                      {hunts.map((hunt) => (
                        <HuntForm
                          key={hunt.id}
                          hunt={hunt}
                          onUpdate={(field, value) =>
                            updateHunt(hunt.id, field, value)
                          }
                          onRemove={() => removeHunt(hunt.id)}
                          onImageUploadStateChange={(state) => setCoverImageUploadState(hunt.id, state)}
                        />
                      ))}

                      <div className="inline-block p-[1px] rounded-2xl bg-gradient-to-b from-[#4A4AFF] to-[#0C0C4F]">
                        <Button
                          onClick={addHunt}
                          className="flex items-center gap-2 bg-white text-[#0C0C4F] font-bold text-xl px-5 py-3 rounded-2xl "
                        >
                          <Plus className="w-6 h-6 text-[#0C0C4F]" />
                          Add
                        </Button>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          onClick={() => handleTabChange("rewards")}
                          className="bg-slate-800 hover:bg-slate-700 text-white text-xl font-extrabold
                         px-6 py-4 rounded-xl flex items-center gap-2 cursor-pointer"
                        >
                          Next
                          <ArrowRight className="w-6 h-6" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "rewards" && (
                    <motion.div
                      key="rewards"
                      custom={direction}
                      {...tabMotion}
                      className="space-y-6"
                    >
                      <div className="space-y-3">
                        <label className="block text-lg font-semibold text-slate-900 dark:text-slate-100">
                          Reward Type
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {(["XLM", "NFT", "Both"] as const).map((type) => (
                            <button
                              key={type}
                              onClick={() => setRewardType(type)}
                              className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                                rewardType === type
                                  ? type === "XLM"
                                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-2 border-green-500"
                                    : type === "NFT"
                                    ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-2 border-purple-500"
                                    : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-2 border-amber-500"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-2 border-transparent"
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <RewardsPanel
                        rewards={rewards}
                        rewardType={rewardType}
                        onUpdateReward={updateReward}
                        onAddReward={addReward}
                        onDeleteReward={deleteReward}
                        error={errors.rewards?.message}
                      />

                      <div className="flex justify-between">
                        <Button 
                          onClick={() => handleTabChange("create")}
                          className="bg-gradient-to-b from-[#576065] to-[#787884] hover:bg-gray-500 text-white px-8 py-2 rounded-xl flex items-center gap-2 text-xl font-black"
                        >
                          <ArrowLeft className="w-6 h-6" />
                          Previous
                        </Button>
                        <Button 
                          onClick={() => handleTabChange("publish")}
                          className="bg-gradient-to-b from-[#576065] to-[#787884] hover:bg-gray-500 text-white px-8 py-2 rounded-xl flex items-center gap-2 text-xl font-black"
                        >
                          Next
                          <ArrowRight className="w-6 h-6" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "publish" && (
                    <motion.div
                      key="publish"
                      custom={direction}
                      {...tabMotion}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between">
                        <label className="block text-xl font-normal text-[#808080]">
                          Give It A Name
                        </label>
                        <div className="flex flex-col gap-1 items-end">
                          <Input
                            value={gameName}
                            placeholder="Hunty"
                            onChange={(e) => setGameName(e.target.value)}
                            className="w-[230px] [&::placeholder]:bg-gradient-to-r [&::placeholder]:from-[#3737A4] [&::placeholder]:to-[#0C0C4F] [&::placeholder]:bg-clip-text [&::placeholder]:text-transparent text-[16px]"
                          />
                          {errors.gameName && (
                            <span className="text-red-500 text-sm">
                              {errors.gameName.message}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="block text-xl font-normal text-[#808080]">
                          Set Timeframe
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className="p-0.5 bg-gradient-to-b from-[#2D4FEB] to-[#0C0C4F] rounded-lg">
                              <Input
                                type="number"
                                min="0"
                                max="59"
                                placeholder="00"
                                className="w-full text-center text-lg font-medium bg-white rounded-lg px-3 py-2 focus-visible:ring-0 focus-visible:ring-offset-0 border-0"
                              />
                            </div>
                          </div>
                          <span className="text-2xl bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] font-medium bg-clip-text text-transparent">
                            :
                          </span>
                          <div className="relative">
                            <div className="p-0.5 bg-gradient-to-b from-[#2D4FEB] to-[#0C0C4F] rounded-lg">
                              <Input
                                type="number"
                                min="0"
                                max="59"
                                placeholder="00"
                                className="w-full text-center text-lg font-medium bg-white rounded-lg px-3 py-2 focus-visible:ring-0 focus-visible:ring-offset-0 border-0"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                        <div className="flex items-center justify-between">
                          <label className="block text-xl font-normal text-[#808080]">
                            Timer
                          </label>
                          <ToggleButton isActive={timerEnabled} onClick={() => setTimerEnabled(!timerEnabled)} />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <label className="block text-xl font-normal text-[#808080]">
                              Private Hunt
                            </label>
                            <p className="text-xs text-slate-400 mt-0.5">Hidden from the public arcade</p>
                          </div>
                          <ToggleButton isActive={isPrivate} onClick={() => setIsPrivate(!isPrivate)} />
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="block text-xl font-normal text-[#808080]">
                            Start Date
                          </label>
                          <div className="flex flex-col gap-1 items-end">
                            <Input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="h-11 w-[140px] text-center"
                            />
                            {errors.startDate && (
                              <span className="text-red-500 text-sm">
                                {errors.startDate.message}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="block text-xl font-normal text-[#808080]">
                            End Date
                          </label>
                          <div className="flex flex-col gap-1 items-end">
                            <Input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="h-11 w-[140px] text-center"
                            />
                            {errors.endDate && (
                              <span className="text-red-500 text-sm">
                                {errors.endDate.message}
                              </span>
                            )}
                          </div>
                        </div>
                        {errors.hunts && (
                          <div className="text-red-500 text-sm">
                            {errors.hunts.message || "At least 3 clues are required."}
                          </div>
                        )}
                        {errors.rewards && (
                          <div className="text-red-500 text-sm">
                            {errors.rewards.message || "At least one reward is required."}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <label className="block text-xl font-normal text-[#808080]">Email Notifications</label>
                          <div className="flex items-center gap-4">
                            <Input
                              type="email"
                              placeholder="creator@example.com"
                              value={creatorEmail}
                              onChange={(e) => setCreatorEmail(e.target.value)}
                              className="w-[230px] text-[16px]"
                            />
                            <ToggleButton isActive={emailNotifications} onClick={() => setEmailNotifications(!emailNotifications)} />
                          </div>
                        </div>

                      <div className="flex items-center justify-between">
                        <label className="block text-xl font-normal text-[#808080]">
                          Share Link/Generate QR Code
                        </label>
                        <div className="flex gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={handleShare}
                                className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F]  hover:bg-slate-700 text-white px-4 py-2 rounded-full flex items-center gap-2"
                              >
                                <Share />
                                Share Now
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy Share Link</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="outline"
                                className="rounded-lg border-1 border-transparent bg-white bg-clip-padding shadow-sm hover:bg-slate-50 [background:linear-gradient(white,white)_padding-box,linear-gradient(to_bottom,#3737A4,#0C0C4F)_border-box]"
                                onClick={() => setQrOpen(true)}
                                title="Show QR Code"
                              >
                                <QrCode className="w-4 h-4 text-[#0C0C4F]" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Generate QR Code</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      <QrCodeModal open={qrOpen} onClose={() => setQrOpen(false)} url={typeof window !== "undefined" ? window.location.href : ""} />

                      <div className="flex items-center justify-between mb-16">
                        <label className="block text-xl font-normal text-[#808080]">
                          Save As Image
                        </label>
                        <div className="flex gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button onClick={handleDownloadImage} className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] hover:bg-slate-700 text-white px-4 py-2 rounded-full flex items-center gap-2">
                                <Download className="w-4 h-4 " />
                                Download
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Download Scavenge Image</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="outline"
                                className="rounded-lg border-1 border-transparent bg-white bg-clip-padding shadow-sm hover:bg-slate-50 [background:linear-gradient(white,white)_padding-box,linear-gradient(to_bottom,#3737A4,#0C0C4F)_border-box]"
                              >
                                <Printer className="w-4 h-4 text-[#0C0C4F]" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Print Page</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      <div className="flex justify-between pb-12">
                        <Button 
                          onClick={() => handleTabChange("rewards")}
                          className="bg-gradient-to-b from-[#576065] to-[#787884] hover:bg-gray-500 text-white text-xl px-8 py-2 rounded-lg flex items-center gap-2"
                        >
                          <ArrowLeft className="w-4 h-4 " />
                          Previous
                        </Button>
                        <Button
                          onClick={() => {
                            const coverImageUploadBlockMessage = getCoverImageUploadBlockMessage()
                            if (coverImageUploadBlockMessage) {
                              toast.error(coverImageUploadBlockMessage)
                              return
                            }

                            if (!isFormValidated) {
                              toast.error("Please fill all required hunt details before publishing.")
                              return
                            }
                            setShowPublishModal(true)
                          }}
                          disabled={!isFormValidated || isPublishing}
                          className="bg-gradient-to-b from-[#39A437] to-[#194F0C] hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xl px-6 py-3 rounded-lg flex items-center gap-2"
                        >
                          <span>
                            <PlayCircle />
                          </span>
                          Publish Game
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            {/* Right Panel - Live Preview */}
              <div ref={previewContainerRef} className="hidden lg:block">
                <GamePreview hunts={hunts} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <PublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onPublish={handleSubmit(handlePublish)}
        gameName={gameName}
      />
      <QrCodeModal open={qrOpen} onClose={() => setQrOpen(false)} url={typeof window !== "undefined" ? window.location.href : ""} />
    </TooltipProvider>
  );
}

export default function CreateGame() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff]" />}>
      <CreateGameContent />
    </Suspense>
  )
}
