"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { createPortal } from "react-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { LocationSearch } from "@/components/LocationSearch";
import { LoreResultsPanel } from "@/components/LoreResultsPanel";
import { LoreStoryCard } from "@/components/LoreStoryCard";
import { PrivateModeToggle } from "@/components/PrivateModeToggle";
import { RecentSearchesLeaderboard } from "@/components/RecentSearchesLeaderboard";
import { usePrivateMode } from "@/hooks/usePrivateMode";
import type { MapCenter } from "@/lib/geolocation/get-initial-map-center";
import { DEBOUNCE_MS } from "@/lib/photon/constants";
import {
  locationFromMapCenter,
  mapCenterMovedEnough,
  reverseGeocode,
} from "@/lib/photon/search";
import { getMapboxAccessToken } from "@/lib/mapbox/access-token";
import {
  getCachedPinFetchBbox,
  getCachedPinPruneBbox,
  mergeCachedPinsForViewport,
} from "@/lib/mapbox/cached-pin-bounds";
import {
  getZoomForMap,
  getZoomForViewportWidth,
} from "@/lib/mapbox/viewport-zoom";
import {
  cachedPinToLoreItem,
  type CachedLorePin,
} from "@/lib/lore/cached-pin";
import { cachedLoreResponseSchema } from "@/lib/lore/cached-pin-response";
import {
  clusterPinsForMap,
  LORE_PIN_CLUSTER_MAX_ZOOM,
} from "@/lib/mapbox/pin-clustering";
import {
  createLoreClusterElement,
  createLorePinElement,
  LORE_PIN_HEADLINE_MIN_ZOOM,
  setLorePinHeadlineVisible,
  truncateHeadline,
} from "@/lib/mapbox/lore-pin";
import {
  LORE_CARD_CENTER_OFFSET,
  LORE_CARD_MAP_PADDING,
  LORE_CARD_MARKER_OFFSET,
} from "@/lib/mapbox/viewport-padding";
import {
  getLoreHeadline,
  getLoreItemKey,
  isPlottableLoreItem,
  type PlottableLoreItem,
} from "@/lib/lore/plottable-items";
import type { RecentSearchEntry } from "@/lib/lore/recent-searches";
import type { LoreItem } from "@/lib/lore/schema";
import { loreJobResponseSchema } from "@/lib/jobs/types";
import type { SelectedLocation } from "@/lib/types/location";

const POLL_INTERVAL_MS = 1000;

function SearchPinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
    </svg>
  );
}

type ExploreMapProps = {
  initialCenter: MapCenter;
  /** When set (after the user grants geolocation), fly the map to their position. */
  userCenter?: MapCenter | null;
};

export function ExploreMap({ initialCenter, userCenter }: ExploreMapProps) {
  const { privateMode, setPrivateMode } = usePrivateMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userCenterRef = useRef(userCenter ?? null);
  userCenterRef.current = userCenter ?? null;
  const loreMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const cachedMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const clusterMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const cardMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const hasFitBoundsRef = useRef(false);
  const submittedForId = useRef<string | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  const cachedFetchGenerationRef = useRef(0);
  const mapReadyRef = useRef(false);
  const fetchCachedInViewportRef = useRef<() => Promise<void>>(async () => { });
  const activePageIdsRef = useRef<ReadonlySet<number>>(new Set());
  const syncMapPinsRef = useRef<() => void>(() => { });

  const [activeSearch, setActiveSearch] = useState<SelectedLocation | null>(
    null,
  );
  const [isSearchingHere, setIsSearchingHere] = useState(false);
  const [mapCenterAreaLabel, setMapCenterAreaLabel] = useState<string | null>(
    null,
  );
  const lastResolvedCenterRef = useRef<{
    latitude: number;
    longitude: number;
    areaLabel: string;
  } | null>(null);
  const resolveCenterGenerationRef = useRef(0);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [crosshairPulseKey, setCrosshairPulseKey] = useState(0);
  const [loreItems, setLoreItems] = useState<LoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [jobStatus, setJobStatus] = useState<
    "pending" | "processing" | null
  >(null);
  const [stageMessage, setStageMessage] = useState<string | null>(null);
  const [selectedPinKey, setSelectedPinKey] = useState<string | null>(null);
  const [selectedCardItem, setSelectedCardItem] =
    useState<PlottableLoreItem | null>(null);
  const [cardMountEl, setCardMountEl] = useState<HTMLDivElement | null>(null);
  const [cachedPins, setCachedPins] = useState<CachedLorePin[]>([]);
  const [recentSearchesRefreshKey, setRecentSearchesRefreshKey] = useState(0);

  const plottableItems = useMemo(
    () => loreItems.filter(isPlottableLoreItem),
    [loreItems],
  );

  const activePageIds = useMemo(() => {
    const ids = new Set<number>();
    for (const item of plottableItems) {
      if (item.pageId != null) {
        ids.add(item.pageId);
      }
    }
    return ids;
  }, [plottableItems]);

  const hiddenCachedPageIds = useMemo(() => {
    const ids = new Set(activePageIds);
    if (selectedPinKey) {
      const pageId = Number(selectedPinKey);
      if (
        Number.isFinite(pageId) &&
        cachedPins.some((pin) => pin.pageId === pageId)
      ) {
        ids.add(pageId);
      }
    }
    return ids;
  }, [activePageIds, selectedPinKey, cachedPins]);

  const displayCachedPins = useMemo(
    () => cachedPins.filter((pin) => !hiddenCachedPageIds.has(pin.pageId)),
    [cachedPins, hiddenCachedPageIds],
  );

  const requestLore = useCallback(async (search: SelectedLocation) => {
    pollAbortRef.current?.abort();
    pollAbortRef.current = null;

    setIsLoading(true);
    setError(null);
    setLoreItems([]);
    setQueuePosition(null);
    setProgressPercent(0);
    setJobStatus(null);
    setStageMessage(null);
    setSelectedPinKey(null);
    setSelectedCardItem(null);
    hasFitBoundsRef.current = false;

    try {
      const response = await fetch("/api/lore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: search.latitude,
          longitude: search.longitude,
          label: search.label,
          private: privateMode,
        }),
      });

      const data: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Failed to start lore discovery";
        throw new Error(message);
      }

      const jobId =
        typeof data === "object" &&
          data !== null &&
          "jobId" in data &&
          typeof (data as { jobId: unknown }).jobId === "string"
          ? (data as { jobId: string }).jobId
          : null;

      if (!jobId) {
        throw new Error("Invalid response from lore API");
      }

      const abort = new AbortController();
      pollAbortRef.current = abort;

      const poll = async () => {
        while (!abort.signal.aborted) {
          const statusResponse = await fetch(
            `/api/lore?jobId=${encodeURIComponent(jobId)}`,
            { signal: abort.signal },
          );

          const statusData: unknown = await statusResponse.json();
          if (!statusResponse.ok) {
            const message =
              typeof statusData === "object" &&
                statusData !== null &&
                "error" in statusData &&
                typeof (statusData as { error: unknown }).error === "string"
                ? (statusData as { error: string }).error
                : "Failed to check lore job status";
            throw new Error(message);
          }

          const parsed = loreJobResponseSchema.safeParse(statusData);
          if (!parsed.success) {
            throw new Error("Invalid lore job status response");
          }

          const job = parsed.data;
          if (job.status === "complete") {
            setProgressPercent(100);
            setLoreItems(job.items ?? []);
            setIsLoading(false);
            setQueuePosition(null);
            setJobStatus(null);
            setStageMessage(null);
            if (!privateMode) {
              setRecentSearchesRefreshKey((key) => key + 1);
            }
            return;
          }

          if (job.status === "failed") {
            throw new Error(job.error ?? "Lore discovery failed");
          }

          setProgressPercent(job.progressPercent ?? 0);
          setQueuePosition(job.queuePosition ?? null);
          setStageMessage(job.stageMessage ?? null);
          setJobStatus(
            job.status === "pending" || job.status === "processing"
              ? job.status
              : null,
          );

          await new Promise((resolve) => {
            const timeout = setTimeout(resolve, POLL_INTERVAL_MS);
            abort.signal.addEventListener(
              "abort",
              () => {
                clearTimeout(timeout);
                resolve(undefined);
              },
              { once: true },
            );
          });
        }
      };

      void poll().catch((pollError) => {
        if (abort.signal.aborted) {
          return;
        }
        setError(
          pollError instanceof Error
            ? pollError.message
            : "Lore discovery failed",
        );
        setIsLoading(false);
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to start lore discovery",
      );
      setIsLoading(false);
    }
  }, [privateMode]);

  useEffect(() => {
    if (!activeSearch) {
      return;
    }

    if (submittedForId.current === activeSearch.id) {
      return;
    }

    submittedForId.current = activeSearch.id;
    void requestLore(activeSearch);

    return () => {
      pollAbortRef.current?.abort();
    };
  }, [activeSearch, requestLore]);

  const centerMapOnPin = useCallback((item: PlottableLoreItem) => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    map.easeTo({
      center: [item.longitude, item.latitude],
      padding: LORE_CARD_MAP_PADDING,
      offset: LORE_CARD_CENTER_OFFSET,
      duration: 700,
      maxZoom: 16,
    });
  }, []);

  const fetchCachedInViewport = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) {
      return;
    }

    const fetchBbox = getCachedPinFetchBbox(map);
    if (!fetchBbox) {
      return;
    }

    const params = new URLSearchParams({
      west: String(fetchBbox.west),
      south: String(fetchBbox.south),
      east: String(fetchBbox.east),
      north: String(fetchBbox.north),
    });

    const generation = ++cachedFetchGenerationRef.current;

    try {
      const response = await fetch(`/api/lore/cached?${params}`);
      const data: unknown = await response.json();

      if (!response.ok) {
        return;
      }

      if (generation !== cachedFetchGenerationRef.current) {
        return;
      }

      const parsed = cachedLoreResponseSchema.safeParse(data);
      if (!parsed.success) {
        return;
      }

      const mapNow = mapRef.current;
      const pruneBbox =
        mapNow && generation === cachedFetchGenerationRef.current
          ? getCachedPinPruneBbox(mapNow)
          : null;

      setCachedPins((previous) => {
        if (!pruneBbox) {
          return parsed.data.items;
        }
        return mergeCachedPinsForViewport(
          previous,
          parsed.data.items,
          pruneBbox,
        );
      });
    } catch {
      // Cached pins are optional; ignore fetch errors.
    }
  }, []);

  fetchCachedInViewportRef.current = fetchCachedInViewport;
  activePageIdsRef.current = activePageIds;

  const handleCachedPinSelect = useCallback(
    (pin: CachedLorePin) => {
      const item = cachedPinToLoreItem(pin);
      setSelectedPinKey(String(pin.pageId));
      setSelectedCardItem(item);
      centerMapOnPin(item);
    },
    [centerMapOnPin],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    mapboxgl.accessToken = getMapboxAccessToken();

    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [initialCenter.longitude, initialCenter.latitude],
      zoom: getZoomForViewportWidth(container.clientWidth),
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleMapInteractionStart = (event: { originalEvent?: unknown }) => {
      if (event.originalEvent) {
        setIsMapMoving(true);
      }
    };

    const scheduleResolveMapCenterLabel = () => {
      setIsMapMoving(false);
      setCrosshairPulseKey((key) => key + 1);

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        const center = map.getCenter();
        const coords = { latitude: center.lat, longitude: center.lng };
        const cached = lastResolvedCenterRef.current;

        if (
          cached &&
          !mapCenterMovedEnough(cached, coords) &&
          cached.areaLabel
        ) {
          setMapCenterAreaLabel(cached.areaLabel);
          return;
        }

        const generation = ++resolveCenterGenerationRef.current;

        void reverseGeocode(center.lat, center.lng).then((suggestion) => {
          if (generation !== resolveCenterGenerationRef.current) {
            return;
          }

          const areaLabel = suggestion?.areaLabel ?? null;
          if (areaLabel) {
            lastResolvedCenterRef.current = {
              latitude: center.lat,
              longitude: center.lng,
              areaLabel,
            };
          }
          setMapCenterAreaLabel(areaLabel);
        });
      }, DEBOUNCE_MS);
    };

    let cachedDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleCachedFetch = () => {
      if (cachedDebounceTimer) {
        clearTimeout(cachedDebounceTimer);
      }

      cachedDebounceTimer = setTimeout(() => {
        void fetchCachedInViewportRef.current();
      }, DEBOUNCE_MS);
    };

    const startCachedPinFetch = () => {
      mapReadyRef.current = true;
      scheduleCachedFetch();
    };

    if (map.loaded()) {
      startCachedPinFetch();
    } else {
      map.once("load", startCachedPinFetch);
    }

    const syncMapZoom = () => {
      syncMapPinsRef.current();
    };

    map.on("movestart", handleMapInteractionStart);
    map.on("moveend", scheduleResolveMapCenterLabel);
    map.on("moveend", scheduleCachedFetch);
    map.on("moveend", syncMapZoom);
    map.on("zoom", syncMapZoom);
    map.on("zoomend", scheduleCachedFetch);
    map.on("resize", scheduleCachedFetch);
    map.on("resize", syncMapZoom);
    scheduleResolveMapCenterLabel();
    syncMapZoom();

    const pendingUserCenter = userCenterRef.current;
    if (pendingUserCenter) {
      const centerOnUser = () => {
        map.flyTo({
          center: [pendingUserCenter.longitude, pendingUserCenter.latitude],
          zoom: getZoomForMap(map),
          duration: 1200,
        });
      };
      if (map.loaded()) {
        centerOnUser();
      } else {
        map.once("load", centerOnUser);
      }
    }

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      if (cachedDebounceTimer) {
        clearTimeout(cachedDebounceTimer);
      }
      cachedFetchGenerationRef.current += 1;
      mapReadyRef.current = false;
      map.off("movestart", handleMapInteractionStart);
      map.off("moveend", scheduleResolveMapCenterLabel);
      map.off("moveend", scheduleCachedFetch);
      map.off("moveend", syncMapZoom);
      map.off("zoom", syncMapZoom);
      map.off("zoomend", scheduleCachedFetch);
      map.off("resize", scheduleCachedFetch);
      map.off("resize", syncMapZoom);
      resolveCenterGenerationRef.current += 1;
      const loreMarkers = loreMarkersRef.current;
      for (const marker of loreMarkers.values()) {
        marker.remove();
      }
      loreMarkers.clear();
      for (const marker of cachedMarkersRef.current.values()) {
        marker.remove();
      }
      cachedMarkersRef.current.clear();
      for (const marker of clusterMarkersRef.current.values()) {
        marker.remove();
      }
      clusterMarkersRef.current.clear();
      cardMarkerRef.current?.remove();
      cardMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [initialCenter.latitude, initialCenter.longitude]);

  const handleCenterMap = useCallback(
    (coords: { latitude: number; longitude: number }) => {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      map.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: getZoomForMap(map),
        duration: 1200,
      });
    },
    [],
  );

  const goToRecentSearch = useCallback(
    (entry: RecentSearchEntry) => {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      pollAbortRef.current?.abort();
      pollAbortRef.current = null;
      submittedForId.current = null;
      setActiveSearch(null);
      setIsLoading(false);
      setError(null);
      setLoreItems([]);
      setQueuePosition(null);
      setProgressPercent(0);
      setJobStatus(null);
      setStageMessage(null);
      setSelectedPinKey(null);
      setSelectedCardItem(null);
      hasFitBoundsRef.current = false;

      const onIdle = () => {
        map.off("idle", onIdle);
        void fetchCachedInViewportRef.current();
      };

      map.once("idle", onIdle);
      map.flyTo({
        center: [entry.longitude, entry.latitude],
        zoom: getZoomForMap(map),
        duration: 1200,
      });
    },
    [],
  );

  useEffect(() => {
    const center = userCenterRef.current;
    if (!center) {
      return;
    }

    const map = mapRef.current;
    if (!map) {
      return;
    }

    const centerOnUser = () => {
      handleCenterMap(center);
    };

    if (map.loaded()) {
      centerOnUser();
    } else {
      map.once("load", centerOnUser);
    }
  }, [userCenter, handleCenterMap]);

  const handleSearchHere = useCallback(async () => {
    const map = mapRef.current;
    if (!map || isLoading || isSearchingHere) {
      return;
    }

    const center = map.getCenter();
    setIsSearchingHere(true);

    try {
      const search = await locationFromMapCenter(center.lat, center.lng);
      setActiveSearch(search);
    } catch {
      setError("Failed to resolve location for this area");
    } finally {
      setIsSearchingHere(false);
    }
  }, [isLoading, isSearchingHere]);

  const handlePinSelect = useCallback(
    (item: PlottableLoreItem, pinKey: string) => {
      setSelectedPinKey(pinKey);
      setSelectedCardItem(item);
      centerMapOnPin(item);
    },
    [centerMapOnPin],
  );

  const handleCloseCard = useCallback(() => {
    setSelectedPinKey(null);
    setSelectedCardItem(null);
  }, []);

  const syncMapPins = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    type PinDescriptor = {
      id: string;
      lngLat: [number, number];
      headline: string;
      selected: boolean;
      onClick: () => void;
      source: "lore" | "cached";
    };

    const allPins: PinDescriptor[] = [];

    plottableItems.forEach((item, index) => {
      const id = getLoreItemKey(item, index);
      allPins.push({
        id,
        lngLat: [item.longitude, item.latitude],
        headline: getLoreHeadline(item),
        selected: selectedPinKey === id,
        onClick: () => handlePinSelect(item, id),
        source: "lore",
      });
    });

    for (const pin of displayCachedPins) {
      const id = String(pin.pageId);
      allPins.push({
        id,
        lngLat: [pin.longitude, pin.latitude],
        headline: pin.headline,
        selected: selectedPinKey === id,
        onClick: () => handleCachedPinSelect(pin),
        source: "cached",
      });
    }

    const pinById = new Map(allPins.map((pin) => [pin.id, pin]));
    const lorePinIds = new Set(
      allPins.filter((pin) => pin.source === "lore").map((pin) => pin.id),
    );
    const cachedPinIds = new Set(
      allPins.filter((pin) => pin.source === "cached").map((pin) => pin.id),
    );

    const zoom = map.getZoom();
    const showHeadlines = zoom >= LORE_PIN_HEADLINE_MIN_ZOOM;
    const clustering = zoom < LORE_PIN_CLUSTER_MAX_ZOOM;

    const upsertPinMarker = (
      markersRef: MutableRefObject<Map<string, mapboxgl.Marker>>,
      pin: PinDescriptor,
    ) => {
      const existing = markersRef.current.get(pin.id);
      if (existing) {
        existing.setLngLat(pin.lngLat);
        const element = existing.getElement();
        element.classList.toggle("lore-map-pin--selected", pin.selected);
        const label = element.querySelector(".lore-map-pin__label");
        if (label) {
          label.textContent = truncateHeadline(pin.headline);
        }
        setLorePinHeadlineVisible(element, showHeadlines);
        return;
      }

      const element = createLorePinElement(pin.headline, {
        selected: pin.selected,
        onClick: pin.onClick,
      });
      setLorePinHeadlineVisible(element, showHeadlines);
      const marker = new mapboxgl.Marker({ element, anchor: "bottom" })
        .setLngLat(pin.lngLat)
        .addTo(map);
      markersRef.current.set(pin.id, marker);
    };

    const removeStaleMarkers = (
      markersRef: MutableRefObject<Map<string, mapboxgl.Marker>>,
      keepIds: ReadonlySet<string>,
    ) => {
      for (const [id, marker] of markersRef.current) {
        if (!keepIds.has(id)) {
          marker.remove();
          markersRef.current.delete(id);
        }
      }
    };

    if (!clustering) {
      for (const [id, marker] of clusterMarkersRef.current) {
        marker.remove();
        clusterMarkersRef.current.delete(id);
      }

      removeStaleMarkers(loreMarkersRef, lorePinIds);
      removeStaleMarkers(cachedMarkersRef, cachedPinIds);

      for (const pin of allPins) {
        const markersRef =
          pin.source === "lore" ? loreMarkersRef : cachedMarkersRef;
        upsertPinMarker(markersRef, pin);
      }
      return;
    }

    const clustered = clusterPinsForMap(allPins, map);
    const visiblePinIds = new Set(
      clustered
        .filter((entry) => entry.kind === "pin")
        .map((entry) => entry.id),
    );
    const clusterEntries = clustered.filter((entry) => entry.kind === "cluster");

    removeStaleMarkers(loreMarkersRef, visiblePinIds);
    removeStaleMarkers(cachedMarkersRef, visiblePinIds);

    for (const pinId of visiblePinIds) {
      const pin = pinById.get(pinId);
      if (!pin) {
        continue;
      }
      const markersRef =
        pin.source === "lore" ? loreMarkersRef : cachedMarkersRef;
      upsertPinMarker(markersRef, pin);
    }

    const nextClusterIds = new Set(clusterEntries.map((entry) => entry.id));
    for (const [id, marker] of clusterMarkersRef.current) {
      if (!nextClusterIds.has(id)) {
        marker.remove();
        clusterMarkersRef.current.delete(id);
      }
    }

    for (const cluster of clusterEntries) {
      if (cluster.kind !== "cluster") {
        continue;
      }

      const existing = clusterMarkersRef.current.get(cluster.id);
      if (existing) {
        existing.setLngLat(cluster.lngLat);
        const countEl = existing
          .getElement()
          .querySelector(".lore-map-cluster__count");
        if (countEl) {
          countEl.textContent = String(cluster.count);
        }
        continue;
      }

      const element = createLoreClusterElement(cluster.count, {
        onClick: () => {
          map.flyTo({
            center: cluster.lngLat,
            zoom: Math.max(map.getZoom() + 2, LORE_PIN_CLUSTER_MAX_ZOOM),
            duration: 700,
          });
        },
      });
      const marker = new mapboxgl.Marker({ element, anchor: "center" })
        .setLngLat(cluster.lngLat)
        .addTo(map);
      clusterMarkersRef.current.set(cluster.id, marker);
    }
  }, [
    plottableItems,
    displayCachedPins,
    selectedPinKey,
    handlePinSelect,
    handleCachedPinSelect,
  ]);

  useEffect(() => {
    syncMapPinsRef.current = syncMapPins;
    syncMapPins();
  }, [syncMapPins]);

  // Mount once per selection; card content comes from selectedCardItem snapshot
  // so viewport cache refetches cannot unmount the portal or move the marker.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPinKey || !selectedCardItem) {
      cardMarkerRef.current?.remove();
      cardMarkerRef.current = null;
      setCardMountEl(null);
      return;
    }

    const { longitude, latitude } = selectedCardItem;

    const mountEl = document.createElement("div");
    mountEl.className = "lore-story-card-marker";

    const marker = new mapboxgl.Marker({
      element: mountEl,
      anchor: "bottom",
      offset: LORE_CARD_MARKER_OFFSET,
    })
      .setLngLat([longitude, latitude])
      .addTo(map);

    cardMarkerRef.current = marker;
    setCardMountEl(mountEl);

    return () => {
      marker.remove();
      if (cardMarkerRef.current === marker) {
        cardMarkerRef.current = null;
      }
      setCardMountEl(null);
    };
  }, [selectedPinKey]);

  useEffect(() => {
    if (
      isLoading ||
      !activeSearch ||
      plottableItems.length === 0 ||
      hasFitBoundsRef.current
    ) {
      return;
    }

    const map = mapRef.current;
    if (!map) {
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([activeSearch.longitude, activeSearch.latitude]);
    for (const item of plottableItems) {
      bounds.extend([item.longitude, item.latitude]);
    }

    map.fitBounds(bounds, { padding: 72, maxZoom: 15, duration: 800 });
    hasFitBoundsRef.current = true;
  }, [isLoading, plottableItems, activeSearch]);

  const showStatusPanel = isLoading || error != null;
  const searchHereDisabled = isLoading || isSearchingHere;
  const searchHereText = isSearchingHere
    ? "Locating…"
    : mapCenterAreaLabel
      ? `Search ${mapCenterAreaLabel}`
      : "Search here";

  return (
    <div className="fixed inset-0 z-50 bg-stone-900">
      <div className="relative h-full w-full">
        <div ref={containerRef} className="h-full w-full" aria-label="Map" />
        <div
          className={`map-viewport-crosshair${isMapMoving ? " map-viewport-crosshair--moving" : ""}${isLoading ? " map-viewport-crosshair--loading" : ""}`}
          aria-hidden
        >
          <span className="map-viewport-crosshair__dot" />
          {crosshairPulseKey > 0 ? (
            <span
              key={crosshairPulseKey}
              className="map-viewport-crosshair__pulse"
            />
          ) : null}
        </div>
      </div>

      {cardMountEl && selectedCardItem
        ? createPortal(
          <LoreStoryCard item={selectedCardItem} onClose={handleCloseCard} />,
          cardMountEl,
        )
        : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center p-3 sm:p-4">
        <div className="rounded-lg bg-white/95 px-3 py-1.5 text-center shadow-md backdrop-blur-sm">
          <p className="font-lore text-xl leading-none text-amber-900 sm:text-2xl">
            Local Lore
          </p>
          <p className="mt-0.5 text-[0.65rem] text-zinc-500 sm:text-xs">
            AI-powered local history explorer
          </p>
        </div>
      </div>

      <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
        <RecentSearchesLeaderboard
          onSelect={goToRecentSearch}
          refreshKey={recentSearchesRefreshKey}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-3 p-4 sm:p-6">
        {showStatusPanel ? (
          <LoreResultsPanel
            pinCount={plottableItems.length}
            isLoading={isLoading}
            errorMessage={error}
            queuePosition={queuePosition}
            progressPercent={progressPercent}
            jobStatus={jobStatus}
            stageMessage={stageMessage}
            onRetry={() => {
              if (activeSearch) {
                submittedForId.current = null;
                void requestLore(activeSearch);
              }
            }}
          />
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => void handleSearchHere()}
            disabled={searchHereDisabled}
            className="search-here-btn pointer-events-auto cursor-pointer whitespace-nowrap rounded-xl bg-amber-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {crosshairPulseKey > 0 && !searchHereDisabled ? (
              <span
                key={crosshairPulseKey}
                className="search-here-btn__pulse"
                aria-hidden
              />
            ) : null}
            {!isSearchingHere ? (
              <SearchPinIcon className="h-4 w-4 shrink-0 text-sky-100 drop-shadow-sm" />
            ) : null}
            <span>{searchHereText}</span>
          </button>
          <PrivateModeToggle
            enabled={privateMode}
            onChange={setPrivateMode}
          />
        </div>

        <div className="pointer-events-auto w-full max-w-lg">
          <LocationSearch variant="map" mode="center" onCenterMap={handleCenterMap} />
        </div>

        <p className="text-center text-xs text-zinc-400">
          Search by OpenStreetMap · Map by Mapbox ·{" "}
          <a
            href="/about"
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto text-zinc-500 underline decoration-zinc-400/60 underline-offset-2 transition hover:text-zinc-300"
          >
            About this project
          </a>
        </p>
      </div>
    </div>
  );
}
