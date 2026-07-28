"use client";

import Link from "next/link";
import { useContext, useEffect, useMemo, useState } from "react";

import { BadgeWall } from "@/components/BadgeWall";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Header } from "@/components/Header";
import { LevelBadge, LevelProgress } from "@/components/LevelBadge";
import { ProfilePageSkeleton } from "@/components/LoadingSkeletons";
import type { NftRewardDetail } from "@/components/NftDetailModal";
import { NftGallery } from "@/components/NftGallery";
import { PlayerProfileView, ProfilePageHeading } from "@/components/PlayerProfileView";
import { RewardHistorySection } from "@/components/RewardHistorySection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFavorites } from "@/hooks/useFavorites";
import { get_player_stats } from "@/lib/contracts/player-stats";
import { WalletContext } from "@/lib/context/WalletContext";
import { formatISOString } from "@/lib/dateUtils";
import { getPlayerAttempts } from "@/lib/huntAttemptHistory";
import { getAllHunts, type StoredHunt } from "@/lib/huntStore";
import { logger } from "@/lib/logger";
import { fetchPlayerRewardHistory } from "@/lib/rewardHistory";
import type { HuntAttemptRecord, PlayerStats } from "@/lib/types";