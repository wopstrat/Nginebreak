import localforage from "localforage";
import { v4 as uuidv4 } from "uuid";
import {
  recalculateVehicleMaintenance,
  calculateMaintenanceStatus,
} from "./CalculationEngine";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

localforage.config({
  name: "DigitalGarage",
  version: 1.0,
  storeName: "garage_data",
});

const DEFAULT_DATA = {
  user: { name: "Enthusiast" },
  vehicles: [],
};

// ============================================================
// Helper: get storage key scoped per user
// ============================================================
function getStorageKey(userId) {
  return userId ? `garage_data_${userId}` : "garage_data_guest";
}

// ============================================================
// Helper: get current auth user id + display name
// ============================================================
async function getCurrentAuthUser() {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return null;

    let displayName =
      user.user_metadata?.name ||
      user.user_metadata?.display_name ||
      user.email?.split("@")[0] ||
      "Member";

    let avatarUrl = user.user_metadata?.avatar_url || null;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (profile) {
        if (profile.display_name) displayName = profile.display_name;
        if (profile.avatar_url) avatarUrl = profile.avatar_url;
      }
    } catch (_) {}

    return {
      id: user.id,
      email: user.email,
      display_name: displayName,
      avatar_url: avatarUrl,
      user_metadata: user.user_metadata || {},
    };
  } catch {
    return null;
  }
}

// ============================================================
// Helpers for cross-user vehicle member mapping
// ============================================================
function extractMembersFromVehicle(veh) {
  if (!veh) return [];
  const members = [];

  // Source 1: JSONB column 'members' on vehicles (if column exists)
  if (Array.isArray(veh.members)) {
    for (const m of veh.members) {
      if (m && typeof m === "object") members.push(m);
    }
  }

  // Source 2: JSONB 'media' registry fallback (guarantees instant cross-user sharing)
  if (Array.isArray(veh.media)) {
    const reg = veh.media.find(
      (item) => item && item._is_member_registry && Array.isArray(item.members)
    );
    if (reg) {
      for (const rm of reg.members) {
        if (
          !members.some(
            (m) =>
              (m.user_id && rm.user_id && m.user_id === rm.user_id) ||
              (m.email &&
                rm.email &&
                m.email.toLowerCase() === rm.email.toLowerCase())
          )
        ) {
          members.push(rm);
        }
      }
    }
  }

  return members;
}

function getCleanMedia(mediaArray) {
  if (!Array.isArray(mediaArray)) return [];
  return mediaArray.filter((m) => !m || !m._is_member_registry);
}

function getDeletedVehicleIds() {
  try {
    const raw = localStorage.getItem("nginebreak_deleted_vehicle_ids");
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function addDeletedVehicleId(id) {
  try {
    const list = getDeletedVehicleIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem("nginebreak_deleted_vehicle_ids", JSON.stringify(list));
    }
  } catch (_) {}
}

// Tombstone helpers for maintenance modules
function getDeletedModuleIds() {
  try {
    const raw = localStorage.getItem("nginebreak_deleted_module_ids");
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function addDeletedModuleId(id) {
  try {
    const list = getDeletedModuleIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem("nginebreak_deleted_module_ids", JSON.stringify(list));
    }
  } catch (_) {}
}

// Tombstone helpers for service history records
function getDeletedHistoryIds() {
  try {
    const raw = localStorage.getItem("nginebreak_deleted_history_ids");
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function addDeletedHistoryId(id) {
  try {
    const list = getDeletedHistoryIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem("nginebreak_deleted_history_ids", JSON.stringify(list));
    }
  } catch (_) {}
}

class StorageService {
  async init(storageKey = "garage_data_guest") {
    const data = await localforage.getItem(storageKey);
    if (!data) {
      await localforage.setItem(storageKey, DEFAULT_DATA);
    }
  }

  // ==========================================
  // Get Data — scoped to current user, resilient to missing tables
  // ==========================================
  async getData() {
    const authUser = await getCurrentAuthUser();
    const storageKey = getStorageKey(authUser?.id);
    await this.init(storageKey);
    const deletedIds = getDeletedVehicleIds();
    const deletedModuleIds = getDeletedModuleIds();
    const deletedHistoryIds = getDeletedHistoryIds();

    let localData = await localforage.getItem(storageKey);
    if (!localData) {
      localData = {
        user: {
          name: authUser?.display_name || "Enthusiast",
          id: authUser?.id || null,
        },
        vehicles: [],
      };
      await localforage.setItem(storageKey, localData);
    }

    // Guest / unauthenticated mode — use local guest storage directly
    if (!isSupabaseConfigured() || !supabase || !authUser) {
      if (localData?.vehicles) {
        localData.vehicles = localData.vehicles
          .filter((v) => !deletedIds.includes(v.id))
          .map((v) => ({
            ...v,
            maintenance_modules: (v.maintenance_modules || []).filter(
              (m) => !deletedModuleIds.includes(m.id)
            ),
            service_history: (v.service_history || []).filter(
              (h) => !deletedHistoryIds.includes(h.id)
            ),
          }));
      }
      return localData || DEFAULT_DATA;
    }

    try {
      // 1. Get vehicles this user is a member of (shared vehicles)
      let sharedVehicleIds = [];
      try {
        const { data: memberRows, error: memberErr } = await supabase
          .from("garage_members")
          .select("vehicle_id")
          .eq("user_id", authUser.id);
        if (!memberErr && memberRows) {
          sharedVehicleIds = memberRows.map((r) => r.vehicle_id).filter(Boolean);
        }
      } catch (_) {}

      // 2. Query vehicles: owned vehicles, shared via garage_members, or shared via members list
      let dbVehicles = [];
      try {
        let vehiclesQuery = supabase
          .from("vehicles")
          .select("*")
          .order("created_at", { ascending: true });

        const { data: rawVehicles, error: vErr } = await vehiclesQuery;
        if (!vErr && rawVehicles) {
          dbVehicles = rawVehicles.filter((veh) => {
            if (deletedIds.includes(veh.id)) return false;
            // Owned by this user
            if (veh.user_id === authUser.id) return true;
            // Shared via garage_members table
            if (sharedVehicleIds.includes(veh.id)) return true;
            // Shared via vehicle's member registry (JSONB column, media metadata, or email match)
            const vMembers = extractMembersFromVehicle(veh);
            return vMembers.some(
              (m) =>
                (m.user_id && authUser.id && m.user_id === authUser.id) ||
                (m.email &&
                  authUser.email &&
                  m.email.toLowerCase() === authUser.email.toLowerCase())
            );
          });
        }
      } catch (e) {
        console.warn("[StorageService] Vehicles query warning:", e.message);
      }

      const validDbVehicles = dbVehicles || [];
      const vehIds = validDbVehicles.map((v) => v.id);

      // 3. Query maintenance modules for these vehicles
      let dbModules = [];
      if (vehIds.length > 0) {
        try {
          const { data: mods, error: mErr } = await supabase
            .from("maintenance_modules")
            .select("*")
            .in("vehicle_id", vehIds);
          if (!mErr && mods) dbModules = mods;
        } catch (_) {}
      }

      // 4. Query service history for these vehicles
      let dbHistory = [];
      if (vehIds.length > 0) {
        try {
          const { data: hist, error: hErr } = await supabase
            .from("service_history")
            .select("*")
            .in("vehicle_id", vehIds)
            .order("date", { ascending: false });
          if (!hErr && hist) dbHistory = hist;
        } catch (_) {}
      }

      // 5. Query members for these vehicles
      let allMemberRows = [];
      let allProfiles = [];
      if (vehIds.length > 0) {
        try {
          const { data: mRows } = await supabase
            .from("garage_members")
            .select("vehicle_id, user_id, role")
            .in("vehicle_id", vehIds);
          if (mRows) allMemberRows = mRows;

          const memberUserIds = [...new Set(allMemberRows.map((m) => m.user_id))];
          if (memberUserIds.length > 0) {
            const { data: profs } = await supabase
              .from("profiles")
              .select("id, display_name")
              .in("id", memberUserIds);
            if (profs) allProfiles = profs;
          }
        } catch (_) {}
      }

      // 6. Assemble vehicles
      const assembledVehicles = validDbVehicles.map((veh) => {
        const rawModules = dbModules
          .filter((m) => m.vehicle_id === veh.id && !deletedModuleIds.includes(m.id));
        const rawHistory = dbHistory
          .filter((h) => h.vehicle_id === veh.id && !deletedHistoryIds.includes(h.id));

        const modules = rawModules.map((mod) => {
          const calc = calculateMaintenanceStatus(
            mod,
            veh.current_odometer
          );
          return { ...mod, ...calc };
        });

        // Use extracted members (from JSONB members column or media registry)
        const extractedMembers = extractMembersFromVehicle(veh);

        const cloudVMembers = allMemberRows
          .filter((m) => m.vehicle_id === veh.id)
          .map((m) => {
            const p = allProfiles.find((pr) => pr.id === m.user_id);
            return {
              user_id: m.user_id,
              display_name:
                p?.display_name ||
                (m.user_id === authUser.id ? authUser.display_name : "Member"),
              role: m.role || "member",
            };
          });

        // Merge: extractedMembers + cloudVMembers
        const combinedMembers = [...extractedMembers];
        for (const cm of cloudVMembers) {
          if (
            !combinedMembers.some(
              (m) =>
                (m.user_id && cm.user_id && m.user_id === cm.user_id) ||
                (m.email && cm.email && m.email.toLowerCase() === cm.email.toLowerCase())
            )
          ) {
            combinedMembers.push(cm);
          }
        }

        return {
          ...veh,
          media: getCleanMedia(veh.media),
          maintenance_modules: modules,
          service_history: rawHistory,
          members: combinedMembers,
        };
      });

      // 7. Retain any unsynced local vehicles not yet in cloud, skipping deleted ones
      if (localData?.vehicles && localData.vehicles.length > 0) {
        for (const locVeh of localData.vehicles) {
          if (deletedIds.includes(locVeh.id)) continue;
          const existsInCloud = assembledVehicles.some((v) => v.id === locVeh.id);
          if (!existsInCloud && (locVeh.user_id === authUser.id || !locVeh.user_id)) {
            // Strip tombstoned modules & history before inserting local vehicle
            const safeVeh = {
              ...locVeh,
              maintenance_modules: (locVeh.maintenance_modules || []).filter(
                (m) => !deletedModuleIds.includes(m.id)
              ),
              service_history: (locVeh.service_history || []).filter(
                (h) => !deletedHistoryIds.includes(h.id)
              ),
            };
            assembledVehicles.push(safeVeh);
            // Sync to Supabase in background
            supabase
              .from("vehicles")
              .insert([
                {
                  id: locVeh.id,
                  user_id: authUser.id,
                  type: locVeh.type || "Car",
                  make: locVeh.make,
                  model: locVeh.model,
                  year: locVeh.year,
                  current_odometer: locVeh.current_odometer || 0,
                },
              ])
              .then(() => {
                supabase
                  .from("garage_members")
                  .insert([
                    {
                      vehicle_id: locVeh.id,
                      user_id: authUser.id,
                      role: "owner",
                    },
                  ])
                  .catch(() => {});
              })
              .catch(() => {});
          }
        }
      }

      // Load global user profile metadata from Supabase bound to authUser.id
      let dbProfile = null;
      try {
        const { data: pData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();
        if (pData) dbProfile = pData;
      } catch (_) {}

      const userMeta = authUser.user_metadata || {};
      const globalAvatarUrl =
        userMeta.avatar_url !== undefined && userMeta.avatar_url !== null
          ? userMeta.avatar_url
          : (dbProfile?.avatar_url || localData?.user?.avatar_url || null);

      const globalName =
        userMeta.name ||
        userMeta.display_name ||
        dbProfile?.display_name ||
        localData?.user?.name ||
        authUser.display_name ||
        "Enthusiast";

      const cloudData = {
        user: {
          ...(localData?.user || {}),
          id: authUser.id,
          email: authUser.email,
          name: globalName,
          avatar_url: globalAvatarUrl,
          firstName: userMeta.firstName !== undefined ? userMeta.firstName : (localData?.user?.firstName || (globalName ? globalName.split(" ")[0] : "")),
          lastName: userMeta.lastName !== undefined ? userMeta.lastName : (localData?.user?.lastName || (globalName && globalName.includes(" ") ? globalName.split(" ").slice(1).join(" ") : "")),
          age: userMeta.age !== undefined ? userMeta.age : (localData?.user?.age || ""),
          gender: userMeta.gender !== undefined ? userMeta.gender : (localData?.user?.gender || "Prefer not to say"),
        },
        vehicles: assembledVehicles,
      };

      await localforage.setItem(storageKey, cloudData);
      return cloudData;
    } catch (err) {
      console.warn(
        "[StorageService] Supabase sync failed, falling back to local cache:",
        err.message
      );
      return localData || DEFAULT_DATA;
    }
  }

  async saveData(data) {
    const authUser = await getCurrentAuthUser();
    const storageKey = getStorageKey(authUser?.id);
    await localforage.setItem(storageKey, data);
  }

  // ==========================================
  // Clear all cached and local storage data for session privacy
  // ==========================================
  async clearSessionData() {
    try {
      const authUser = await getCurrentAuthUser();
      if (authUser?.id) {
        await localforage.removeItem(`garage_data_${authUser.id}`);
        localStorage.removeItem(`nginebreak_profile_${authUser.id}`);
      }
      await localforage.removeItem("garage_data");
      await localforage.removeItem("garage_data_guest");
      localStorage.removeItem("nginebreak_profile_guest");
      localStorage.removeItem("nginebreak_admin_mode");
      localStorage.removeItem("nginebreak_admin_view_mode");
      // NOTE: Deletion tombstones (nginebreak_deleted_*) are intentionally NOT cleared here.
      // They must persist permanently as safety guards. If the Supabase delete failed silently
      // (network error, RLS policy), the tombstone is the only barrier preventing ghost reappearance.
      sessionStorage.clear();
    } catch (err) {
      console.warn("[StorageService] Clear session warning:", err);
    }
  }

  // ==========================================
  // Update User Profile (Bio, Name, Avatar)
  // ==========================================
  async updateUserProfile(profileUpdates) {
    const authUser = await getCurrentAuthUser();
    const data = await this.getData();
    
    data.user = {
      ...(data.user || {}),
      ...profileUpdates,
    };
    
    // Derive full name if firstName / lastName provided
    if (profileUpdates.firstName !== undefined || profileUpdates.lastName !== undefined) {
      const fn = profileUpdates.firstName !== undefined ? profileUpdates.firstName : (data.user.firstName || "");
      const ln = profileUpdates.lastName !== undefined ? profileUpdates.lastName : (data.user.lastName || "");
      const fullName = `${fn} ${ln}`.trim();
      if (fullName) {
        data.user.name = fullName;
      }
    }

    if (isSupabaseConfigured() && supabase && authUser?.id) {
      // 1. Update Supabase Auth user_metadata globally bound to user.id
      try {
        const metaPayload = {
          name: data.user.name || authUser.display_name,
          display_name: data.user.name || authUser.display_name,
          avatar_url: data.user.avatar_url !== undefined ? data.user.avatar_url : null,
          firstName: data.user.firstName || "",
          lastName: data.user.lastName || "",
          age: data.user.age || "",
          gender: data.user.gender || "",
        };

        await supabase.auth.updateUser({
          data: metaPayload,
        });
      } catch (err) {
        console.warn("[StorageService] Supabase updateUser metadata warning:", err.message);
      }

      // 2. Upsert to Supabase 'profiles' table globally bound to user.id
      try {
        await supabase.from("profiles").upsert([
          {
            id: authUser.id,
            display_name: data.user.name || authUser.display_name,
            email: authUser.email,
            avatar_url: data.user.avatar_url || null,
            updated_at: new Date().toISOString(),
          },
        ]).catch(() => {
          return supabase.from("profiles").upsert([
            {
              id: authUser.id,
              display_name: data.user.name || authUser.display_name,
              email: authUser.email,
            },
          ]);
        });
      } catch (e) {
        console.warn("[StorageService] Profile upsert warning:", e.message);
      }
    }

    await this.saveData(data);
    return data.user;
  }

  // ==========================================
  // Add Vehicle
  // ==========================================
  async addVehicle(vehicleParams) {
    const newVehicleId = uuidv4();
    const authUser = await getCurrentAuthUser();
    const newVehicle = {
      id: newVehicleId,
      user_id: authUser?.id || null,
      type: vehicleParams.type || "Car",
      make: vehicleParams.make,
      model: vehicleParams.model,
      year: parseInt(vehicleParams.year),
      current_odometer: parseInt(vehicleParams.odometer) || 0,
      maintenance_modules: [],
      service_history: [],
      members: authUser
        ? [
            {
              user_id: authUser.id,
              display_name: authUser.display_name,
              role: "owner",
            },
          ]
        : [],
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error: vInsertErr } = await supabase.from("vehicles").insert([
          {
            id: newVehicle.id,
            user_id: authUser?.id || null,
            type: newVehicle.type,
            make: newVehicle.make,
            model: newVehicle.model,
            year: newVehicle.year,
            current_odometer: newVehicle.current_odometer,
          },
        ]);
        if (vInsertErr) {
          console.error(
            "[StorageService] Supabase vehicle insert error:",
            vInsertErr.message
          );
        } else if (authUser) {
          try {
            await supabase.from("garage_members").insert([
              {
                vehicle_id: newVehicleId,
                user_id: authUser.id,
                role: "owner",
              },
            ]);
          } catch (gmErr) {
            console.warn(
              "[StorageService] garage_members insert warning:",
              gmErr.message
            );
          }

          if (newVehicle.current_odometer > 0) {
            try {
              await supabase.from("odometer_history").insert([
                {
                  vehicle_id: newVehicleId,
                  user_id: authUser.id,
                  added_by_name: authUser.display_name,
                  odometer_value: newVehicle.current_odometer,
                  previous_value: 0,
                  is_rewound: false,
                },
              ]);
            } catch (odoErr) {
              console.warn(
                "[StorageService] odometer_history insert warning:",
                odoErr.message
              );
            }
          }
        }
      } catch (err) {
        console.error(
          "[StorageService] Supabase vehicle insert failed:",
          err.message
        );
      }
    }

    const data = await this.getData().catch(() => DEFAULT_DATA);
    if (!data.vehicles) data.vehicles = [];
    if (!data.vehicles.some((v) => v.id === newVehicle.id)) {
      data.vehicles.push(newVehicle);
    }
    await this.saveData(data);
    return newVehicle;
  }

  // ==========================================
  // Delete Vehicle
  // ==========================================
  async deleteVehicle(vehicleId) {
    addDeletedVehicleId(vehicleId);

    const authUser = await getCurrentAuthUser();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("garage_members").delete().eq("vehicle_id", vehicleId).catch(() => {});
        await supabase.from("odometer_history").delete().eq("vehicle_id", vehicleId).catch(() => {});
        await supabase.from("service_history").delete().eq("vehicle_id", vehicleId).catch(() => {});
        await supabase.from("maintenance_modules").delete().eq("vehicle_id", vehicleId).catch(() => {});

        const { error } = await supabase.from("vehicles").delete().eq("id", vehicleId);
        if (error && authUser?.id) {
          // If shared member (not owner), remove member row for this user
          await supabase
            .from("garage_members")
            .delete()
            .eq("vehicle_id", vehicleId)
            .eq("user_id", authUser.id)
            .catch(() => {});
        }
      } catch (err) {
        console.error("[StorageService] Supabase vehicle delete failed:", err.message);
      }
    }

    const storageKey = getStorageKey(authUser?.id);
    let localData = await localforage.getItem(storageKey);
    if (!localData) localData = { user: { name: "Enthusiast" }, vehicles: [] };

    localData.vehicles = (localData.vehicles || []).filter((v) => v.id !== vehicleId);
    await localforage.setItem(storageKey, localData);

    return localData;
  }

  // ==========================================
  // Update Vehicle (Make, Model, Year, Type, Odometer)
  // ==========================================
  async updateVehicle(vehicleId, updates) {
    const authUser = await getCurrentAuthUser();
    let data = await this.getData();
    let vehicle = (data.vehicles || []).find((v) => v.id === vehicleId);
    if (!vehicle) throw new Error("Vehicle not found");

    if (updates.make) vehicle.make = updates.make;
    if (updates.model) vehicle.model = updates.model;
    if (updates.type) vehicle.type = updates.type;
    if (updates.year) vehicle.year = parseInt(updates.year);
    if (updates.current_odometer !== undefined) {
      const odo = parseInt(updates.current_odometer);
      vehicle.current_odometer = odo;
      data.vehicles = recalculateVehicleMaintenance(data.vehicles, vehicleId, odo);
      vehicle = data.vehicles.find((v) => v.id === vehicleId);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const payload = {};
        if (updates.make) payload.make = updates.make;
        if (updates.model) payload.model = updates.model;
        if (updates.type) payload.type = updates.type;
        if (updates.year) payload.year = parseInt(updates.year);
        if (updates.current_odometer !== undefined)
          payload.current_odometer = parseInt(updates.current_odometer);
        payload.updated_at = new Date().toISOString();

        await supabase.from("vehicles").update(payload).eq("id", vehicleId);
      } catch (err) {
        console.error("[StorageService] updateVehicle Supabase error:", err.message);
      }
    }

    await this.saveData(data);
    return data;
  }

  // ==========================================
  // Add Maintenance Module
  // ==========================================
  async addMaintenanceModule(vehicleId, moduleParams) {
    const moduleId = uuidv4();
    const newModule = {
      id: moduleId,
      vehicle_id: vehicleId,
      name: moduleParams.name,
      interval_km: moduleParams.interval_km
        ? parseInt(moduleParams.interval_km)
        : null,
      interval_months: moduleParams.interval_months
        ? parseInt(moduleParams.interval_months)
        : null,
      last_service_km: moduleParams.last_service_km
        ? parseInt(moduleParams.last_service_km)
        : null,
      last_service_date: moduleParams.last_service_date || null,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from("maintenance_modules")
          .insert([newModule]);
        if (error)
          console.error("[StorageService] Supabase module insert error:", error.message);
      } catch (err) {
        console.error(
          "[StorageService] Supabase module insert failed:",
          err.message
        );
      }
    }

    const data = await this.getData();
    const vehicle = data.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) throw new Error("Vehicle not found");

    const calc = calculateMaintenanceStatus(
      newModule,
      vehicle.current_odometer
    );
    Object.assign(newModule, calc);

    if (!vehicle.maintenance_modules.some((m) => m.id === moduleId)) {
      vehicle.maintenance_modules.push(newModule);
    }
    await this.saveData(data);
    return data;
  }

  // ==========================================
  // Update Maintenance Module
  // ==========================================
  async updateMaintenanceModule(vehicleId, moduleId, updatedParams) {
    let data = await this.getData();
    const vehicle = data.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) throw new Error("Vehicle not found");

    let mod = (vehicle.maintenance_modules || []).find((m) => m.id === moduleId);
    if (!mod) throw new Error("Maintenance module not found");

    if (updatedParams.name !== undefined) mod.name = updatedParams.name;
    if (updatedParams.interval_km !== undefined)
      mod.interval_km = updatedParams.interval_km ? parseInt(updatedParams.interval_km) : null;
    if (updatedParams.interval_months !== undefined)
      mod.interval_months = updatedParams.interval_months ? parseInt(updatedParams.interval_months) : null;
    if (updatedParams.last_service_km !== undefined)
      mod.last_service_km = updatedParams.last_service_km ? parseInt(updatedParams.last_service_km) : null;
    if (updatedParams.last_service_date !== undefined)
      mod.last_service_date = updatedParams.last_service_date || null;

    if (isSupabaseConfigured() && supabase) {
      try {
        const payload = {};
        if (updatedParams.name !== undefined) payload.name = mod.name;
        if (updatedParams.interval_km !== undefined) payload.interval_km = mod.interval_km;
        if (updatedParams.interval_months !== undefined) payload.interval_months = mod.interval_months;
        if (updatedParams.last_service_km !== undefined) payload.last_service_km = mod.last_service_km;
        if (updatedParams.last_service_date !== undefined) payload.last_service_date = mod.last_service_date;

        await supabase.from("maintenance_modules").update(payload).eq("id", moduleId);
      } catch (err) {
        console.error("[StorageService] updateMaintenanceModule Supabase error:", err.message);
      }
    }

    data.vehicles = recalculateVehicleMaintenance(
      data.vehicles,
      vehicleId,
      vehicle.current_odometer
    );
    await this.saveData(data);
    return data;
  }

  // ==========================================
  // Delete Maintenance Module
  // ==========================================
  async deleteMaintenanceModule(vehicleId, moduleId) {
    // 1. Register tombstone FIRST — prevents getData() from ever resurecting this module
    addDeletedModuleId(moduleId);

    // 2. Remove from Supabase in background (fire-and-forget, tombstone is the guard)
    if (isSupabaseConfigured() && supabase) {
      supabase
        .from("maintenance_modules")
        .delete()
        .eq("id", moduleId)
        .catch((err) =>
          console.error("[StorageService] deleteMaintenanceModule error:", err.message)
        );
    }

    // 3. Remove from local cache directly (no re-fetch — avoids ghost reappearance)
    const authUser = await getCurrentAuthUser();
    const storageKey = getStorageKey(authUser?.id);
    let localData = await localforage.getItem(storageKey);
    if (!localData) localData = { user: { name: "Enthusiast" }, vehicles: [] };

    const vehicle = (localData.vehicles || []).find((v) => v.id === vehicleId);
    if (vehicle) {
      vehicle.maintenance_modules = (vehicle.maintenance_modules || []).filter(
        (m) => m.id !== moduleId
      );
      localData.vehicles = recalculateVehicleMaintenance(
        localData.vehicles,
        vehicleId,
        vehicle.current_odometer
      );
      await localforage.setItem(storageKey, localData);
    }

    return localData;
  }

  // ==========================================
  // Update Service History Record
  // ==========================================
  async updateServiceHistory(vehicleId, historyId, updatedParams) {
    let data = await this.getData();
    const vehicle = data.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) throw new Error("Vehicle not found");

    const record = (vehicle.service_history || []).find((h) => h.id === historyId);
    if (!record) throw new Error("Service history record not found");

    if (updatedParams.module_name) record.module_name = updatedParams.module_name;
    if (updatedParams.odometer !== undefined) record.odometer = parseInt(updatedParams.odometer);
    if (updatedParams.date) record.date = updatedParams.date;
    if (updatedParams.notes !== undefined) record.notes = updatedParams.notes;

    if (isSupabaseConfigured() && supabase) {
      try {
        const payload = {};
        if (updatedParams.module_name) payload.module_name = record.module_name;
        if (updatedParams.odometer !== undefined) payload.odometer = record.odometer;
        if (updatedParams.date) payload.date = record.date;
        if (updatedParams.notes !== undefined) payload.notes = record.notes;

        await supabase.from("service_history").update(payload).eq("id", historyId);
      } catch (err) {
        console.error("[StorageService] updateServiceHistory Supabase error:", err.message);
      }
    }

    await this.saveData(data);
    return data;
  }

  // ==========================================
  // Delete Service History Record
  // ==========================================
  async deleteServiceHistory(vehicleId, historyId) {
    // 1. Register tombstone FIRST — prevents getData() from ever resurrecting this record
    addDeletedHistoryId(historyId);

    // 2. Remove from Supabase in background (fire-and-forget, tombstone is the guard)
    if (isSupabaseConfigured() && supabase) {
      supabase
        .from("service_history")
        .delete()
        .eq("id", historyId)
        .catch((err) =>
          console.error("[StorageService] deleteServiceHistory error:", err.message)
        );
    }

    // 3. Remove from local cache directly (no re-fetch — avoids ghost reappearance)
    const authUser = await getCurrentAuthUser();
    const storageKey = getStorageKey(authUser?.id);
    let localData = await localforage.getItem(storageKey);
    if (!localData) localData = { user: { name: "Enthusiast" }, vehicles: [] };

    const vehicle = (localData.vehicles || []).find((v) => v.id === vehicleId);
    if (vehicle) {
      vehicle.service_history = (vehicle.service_history || []).filter(
        (h) => h.id !== historyId
      );
      await localforage.setItem(storageKey, localData);
    }

    return localData;
  }

  // ==========================================
  // Remove Garage Member
  // ==========================================
  async removeGarageMember(vehicleId, targetUserIdOrEmail) {
    let data = await this.getData();
    const vehicle = data.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) throw new Error("Vehicle not found");

    const cleanTarget = (targetUserIdOrEmail || "").toLowerCase().trim();

    if (vehicle.members) {
      vehicle.members = vehicle.members.filter(
        (m) =>
          m.user_id !== targetUserIdOrEmail &&
          (m.email || "").toLowerCase() !== cleanTarget
      );
    }

    const membersForCloud = (vehicle.members || []).map((m) => ({
      user_id: m.user_id,
      display_name: m.display_name,
      email: m.email || null,
      role: m.role || "member",
      joined_at: m.joined_at,
    }));

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from("garage_members")
          .delete()
          .eq("vehicle_id", vehicleId)
          .eq("user_id", targetUserIdOrEmail)
          .catch(() => {});

        await supabase
          .from("vehicles")
          .update({ members: membersForCloud, updated_at: new Date().toISOString() })
          .eq("id", vehicleId)
          .catch(() => {});
      } catch (err) {
        console.error("[StorageService] removeGarageMember error:", err.message);
      }
    }

    await this.saveData(data);
    return data;
  }

  // ==========================================
  // Update Odometer — append-only with history
  // ==========================================
  async updateOdometer(vehicleId, newOdometer) {
    const odo = parseInt(newOdometer);
    const authUser = await getCurrentAuthUser();

    // Fetch the current odometer BEFORE updating
    let prevOdo = 0;
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: vehRow } = await supabase
          .from("vehicles")
          .select("current_odometer")
          .eq("id", vehicleId)
          .single();
        prevOdo = vehRow?.current_odometer || 0;
      } catch (_) {}
    } else {
      const data = await this.getData();
      const v = data.vehicles.find((v) => v.id === vehicleId);
      prevOdo = v?.current_odometer || 0;
    }

    if (isSupabaseConfigured() && supabase) {
      // 1. Try appending to odometer_history (if table exists)
      try {
        await supabase.from("odometer_history").insert([
          {
            vehicle_id: vehicleId,
            user_id: authUser?.id || null,
            added_by_name: authUser?.display_name || "Unknown",
            odometer_value: odo,
            previous_value: prevOdo,
            is_rewound: false,
          },
        ]);
      } catch (_) {}

      // 2. Update vehicle current_odometer in Supabase (independent of odometer_history)
      try {
        const { error } = await supabase
          .from("vehicles")
          .update({
            current_odometer: odo,
            updated_at: new Date().toISOString(),
          })
          .eq("id", vehicleId);
        if (error)
          console.error("[StorageService] Supabase update odometer error:", error.message);
      } catch (err) {
        console.error(
          "[StorageService] Supabase update odometer failed:",
          err.message
        );
      }
    }

    let data = await this.getData();
    data.vehicles = recalculateVehicleMaintenance(data.vehicles, vehicleId, odo);
    await this.saveData(data);
    return data;
  }

  // ==========================================
  // Get Odometer History for a vehicle
  // ==========================================
  async getOdometerHistory(vehicleId) {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from("odometer_history")
          .select("*")
          .eq("vehicle_id", vehicleId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error("[StorageService] getOdometerHistory failed:", err.message);
      }
    }
    return [];
  }

  // ==========================================
  // Rewind / Undo Odometer Entry
  // Marks the entry as rewound (does NOT delete).
  // Recalculates current_odometer from remaining valid entries.
  // ==========================================
  async rewindOdometer(historyId, vehicleId) {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error("Supabase is required for odometer rewind.");
    }

    // Mark entry as rewound
    const { error: markErr } = await supabase
      .from("odometer_history")
      .update({ is_rewound: true, rewound_at: new Date().toISOString() })
      .eq("id", historyId);
    if (markErr) throw markErr;

    // Find the latest non-rewound entry's odometer_value for this vehicle
    const { data: remaining, error: fetchErr } = await supabase
      .from("odometer_history")
      .select("odometer_value, previous_value")
      .eq("vehicle_id", vehicleId)
      .eq("is_rewound", false)
      .order("created_at", { ascending: false })
      .limit(1);
    if (fetchErr) throw fetchErr;

    let newCurrentOdo = 0;
    if (remaining && remaining.length > 0) {
      newCurrentOdo = remaining[0].odometer_value;
    } else {
      // All entries rewound — fall back to the previous_value of the oldest entry
      const { data: oldest } = await supabase
        .from("odometer_history")
        .select("previous_value")
        .eq("vehicle_id", vehicleId)
        .order("created_at", { ascending: true })
        .limit(1);
      newCurrentOdo = oldest?.[0]?.previous_value || 0;
    }

    // Update the vehicle's current_odometer
    await supabase
      .from("vehicles")
      .update({
        current_odometer: newCurrentOdo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vehicleId);

    // Recalculate local cache
    let data = await this.getData();
    data.vehicles = recalculateVehicleMaintenance(
      data.vehicles,
      vehicleId,
      newCurrentOdo
    );
    await this.saveData(data);
    return data;
  }

  // ==========================================
  // Get Garage Members for a vehicle
  // ==========================================
  async getGarageMembers(vehicleId) {
    let cloudMembers = [];
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: memberRows, error: mErr } = await supabase
          .from("garage_members")
          .select("user_id, role, joined_at")
          .eq("vehicle_id", vehicleId);
        if (!mErr && memberRows && memberRows.length > 0) {
          const memberIds = memberRows.map((r) => r.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name")
            .in("id", memberIds);

          cloudMembers = memberRows.map((row) => {
            const p = (profiles || []).find((pr) => pr.id === row.user_id);
            return {
              user_id: row.user_id,
              display_name: p?.display_name || "Member",
              role: row.role || "member",
              joined_at: row.joined_at,
            };
          });
        }
      } catch (_) {}

      // Fallback: fetch vehicle row to inspect JSONB members column or media registry
      try {
        const { data: vehRow } = await supabase
          .from("vehicles")
          .select("members, media")
          .eq("id", vehicleId)
          .maybeSingle();
        if (vehRow) {
          const rawM = extractMembersFromVehicle(vehRow);
          for (const rm of rawM) {
            if (
              !cloudMembers.some(
                (cm) =>
                  (cm.user_id && rm.user_id && cm.user_id === rm.user_id) ||
                  (cm.email && rm.email && cm.email.toLowerCase() === rm.email.toLowerCase())
              )
            ) {
              cloudMembers.push(rm);
            }
          }
        }
      } catch (_) {}
    }

    // Always merge with local vehicle.members so members are never lost
    const data = await this.getData();
    const vehicle = data?.vehicles?.find((v) => v.id === vehicleId);
    const localMembers = vehicle?.members || [];

    const merged = [...cloudMembers];
    for (const lm of localMembers) {
      if (
        !merged.some(
          (m) =>
            m.user_id === lm.user_id ||
            (m.email && lm.email && m.email.toLowerCase() === lm.email.toLowerCase())
        )
      ) {
        merged.push(lm);
      }
    }

    return merged;
  }

  // ==========================================
  // Invite Member by email
  // ==========================================
  async inviteMember(vehicleId, email) {
    const authUser = await getCurrentAuthUser();

    // Guest users cannot invite members to garages
    if (!isSupabaseConfigured() || !supabase || !authUser) {
      throw new Error("Guest users cannot invite members. Please log in or register an account.");
    }

    const cleanEmail = email.toLowerCase().trim();
    let targetProfile = null;

    // 1. Try RPC lookup first (bypasses missing profile issues and queries auth.users via SECURITY DEFINER)
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        "lookup_user_by_email",
        { lookup_email: cleanEmail }
      );
      if (!rpcErr && rpcData && rpcData.length > 0) {
        targetProfile = rpcData[0];
      }
    } catch (_) {}

    // 2. Fallback: query profiles directly (case-insensitive on email or display_name)
    if (!targetProfile) {
      try {
        const { data: emailRows } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .ilike("email", cleanEmail);

        if (emailRows && emailRows.length > 0) {
          targetProfile = emailRows[0];
        } else {
          // Check by display name or prefix fallback
          const { data: nameRows } = await supabase
            .from("profiles")
            .select("id, display_name, email")
            .ilike("display_name", cleanEmail);
          if (nameRows && nameRows.length > 0) {
            targetProfile = nameRows[0];
          }
        }
      } catch (profErr) {
        console.warn("[StorageService] Profile lookup warning:", profErr.message);
      }
    }

    // 3. Fallback: verify if email is registered in Supabase Auth directly
    if (!targetProfile) {
      try {
        const { error: authCheckErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password: "VerifyUserExistsPass_" + Math.random().toString(36),
        });
        const errMsg = authCheckErr?.message?.toLowerCase() || "";
        const errCode = authCheckErr?.code?.toLowerCase() || "";
        if (
          errMsg.includes("already registered") ||
          errMsg.includes("already exists") ||
          errMsg.includes("registered") ||
          errCode.includes("email_exists") ||
          errCode.includes("user_already_exists") ||
          authCheckErr?.status === 400
        ) {
          // The user is definitely registered in Supabase Auth!
          targetProfile = {
            id: "user_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_"),
            display_name: cleanEmail.split("@")[0],
            email: cleanEmail,
          };
        }
      } catch (_) {}
    }

    // 4. Fallback for invitations: any valid email can be added as a garage member
    if (!targetProfile && cleanEmail.includes("@")) {
      targetProfile = {
        id: "invited_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_"),
        display_name: cleanEmail.split("@")[0],
        email: cleanEmail,
      };
    }

    if (!targetProfile) {
      throw new Error(
        `Please enter a valid email address to invite.`
      );
    }

    // Check if already a member locally or in cloud
    let isAlreadyMember = false;
    try {
      if (targetProfile.id && !targetProfile.id.startsWith("user_") && !targetProfile.id.startsWith("invited_")) {
        const { data: existing } = await supabase
          .from("garage_members")
          .select("id")
          .eq("vehicle_id", vehicleId)
          .eq("user_id", targetProfile.id)
          .maybeSingle();
        if (existing) isAlreadyMember = true;
      }
    } catch (_) {}

    const data = await this.getData();
    const vehicle = data.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) throw new Error("Vehicle not found");

    if (!vehicle.members) vehicle.members = [];
    if (
      isAlreadyMember ||
      vehicle.members.some(
        (m) =>
          (m.user_id && targetProfile.id && m.user_id === targetProfile.id) ||
          (m.email && m.email.toLowerCase() === cleanEmail)
      )
    ) {
      throw new Error(
        `${targetProfile.display_name || cleanEmail} is already a member of this garage.`
      );
    }

    const newMemberItem = {
      user_id: targetProfile.id,
      display_name: targetProfile.display_name || cleanEmail.split("@")[0],
      email: cleanEmail,
      role: "member",
      joined_at: new Date().toISOString(),
    };

    vehicle.members.push(newMemberItem);

    // Prepare clean cloud member objects
    const membersForCloud = vehicle.members.map((m) => ({
      user_id: m.user_id,
      display_name: m.display_name,
      email: m.email || null,
      role: m.role || "member",
      joined_at: m.joined_at,
    }));

    // Multi-tier persistence to Supabase:
    // 1. garage_members table (if exists and targetProfile has valid UUID)
    if (targetProfile.id && !targetProfile.id.startsWith("user_") && !targetProfile.id.startsWith("invited_")) {
      try {
        await supabase.from("garage_members").insert([
          {
            vehicle_id: vehicleId,
            user_id: targetProfile.id,
            role: "member",
          },
        ]);
      } catch (_) {}
    }

    // 2. vehicles.members JSONB column (if column exists)
    try {
      await supabase
        .from("vehicles")
        .update({ members: membersForCloud, updated_at: new Date().toISOString() })
        .eq("id", vehicleId);
    } catch (_) {}

    // 3. vehicles.media JSONB metadata registry fallback
    // (Guarantees immediate cross-user sharing in Supabase without requiring table migrations)
    try {
      const { data: curVeh } = await supabase
        .from("vehicles")
        .select("media")
        .eq("id", vehicleId)
        .single();
      let rawMedia = Array.isArray(curVeh?.media) ? [...curVeh.media] : [];
      rawMedia = rawMedia.filter((m) => !m || !m._is_member_registry);
      rawMedia.push({
        id: "_shared_members_registry",
        _is_member_registry: true,
        members: membersForCloud,
        updated_at: new Date().toISOString(),
      });
      await supabase
        .from("vehicles")
        .update({ media: rawMedia, updated_at: new Date().toISOString() })
        .eq("id", vehicleId);
    } catch (mediaErr) {
      console.warn("[StorageService] media registry update error:", mediaErr.message);
    }

    await this.saveData(data);

    return newMemberItem;
  }

  // ==========================================
  // Complete Service
  // ==========================================
  async completeService(vehicleId, moduleId, currentOdometer, dateStr) {
    const odo = parseInt(currentOdometer);
    const historyId = uuidv4();

    let data = await this.getData();
    const vehicle = data.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) throw new Error("Vehicle not found");

    const mod = vehicle.maintenance_modules.find((m) => m.id === moduleId);
    if (!mod) throw new Error("Module not found");

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("service_history").insert([
          {
            id: historyId,
            vehicle_id: vehicleId,
            module_id: moduleId,
            module_name: mod.name,
            odometer: odo,
            date: dateStr,
          },
        ]);

        await supabase
          .from("maintenance_modules")
          .update({ last_service_km: odo, last_service_date: dateStr })
          .eq("id", moduleId);
      } catch (err) {
        console.error("[StorageService] Supabase completeService failed:", err.message);
      }
    }

    vehicle.service_history.push({
      id: historyId,
      module_id: moduleId,
      module_name: mod.name,
      odometer: odo,
      date: dateStr,
      created_at: new Date().toISOString(),
    });

    mod.last_service_km = odo;
    mod.last_service_date = dateStr;

    data.vehicles = recalculateVehicleMaintenance(
      data.vehicles,
      vehicleId,
      vehicle.current_odometer
    );
    await this.saveData(data);
    return data;
  }

  // ==========================================
  // Vehicle Media (Photos & Invoices)
  // ==========================================
  async addVehicleMedia(vehicleId, mediaItem) {
    const data = await this.getData();
    const vehicle = data.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) throw new Error("Vehicle not found");

    if (!vehicle.media) vehicle.media = [];
    vehicle.media.push(mediaItem);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: curVeh } = await supabase
          .from("vehicles")
          .select("media")
          .eq("id", vehicleId)
          .single();
        const registryItem = (curVeh?.media || []).find(
          (m) => m && m._is_member_registry
        );
        const toSave = [...vehicle.media];
        if (registryItem) toSave.push(registryItem);

        await supabase
          .from("vehicles")
          .update({ media: toSave, updated_at: new Date().toISOString() })
          .eq("id", vehicleId);
      } catch (err) {
        console.error("[StorageService] Supabase media update error:", err.message);
      }
    }

    await this.saveData(data);
    return data;
  }

  async removeVehicleMedia(vehicleId, mediaId) {
    const data = await this.getData();
    const vehicle = data.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) throw new Error("Vehicle not found");

    vehicle.media = (vehicle.media || []).filter((m) => m.id !== mediaId);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: curVeh } = await supabase
          .from("vehicles")
          .select("media")
          .eq("id", vehicleId)
          .single();
        const registryItem = (curVeh?.media || []).find(
          (m) => m && m._is_member_registry
        );
        const toSave = [...vehicle.media];
        if (registryItem) toSave.push(registryItem);

        await supabase
          .from("vehicles")
          .update({ media: toSave, updated_at: new Date().toISOString() })
          .eq("id", vehicleId);
      } catch (err) {
        console.error("[StorageService] Supabase media remove error:", err.message);
      }
    }

    await this.saveData(data);
    return data;
  }

  // ==========================================
  // Onboarding Status (per user email)
  // ==========================================
  isOnboardingCompleted(email) {
    if (!email) return true;
    const cleanEmail = email.toLowerCase().trim();
    const key = `nginebreak_onboarding_completed_${cleanEmail}`;
    const val = localStorage.getItem(key);
    if (val === "true") return true;
    if (val === "false") return false;

    // Check pending onboarding flag for newly created accounts
    const pendingKey = `nginebreak_pending_onboarding_${cleanEmail}`;
    if (localStorage.getItem(pendingKey) === "true") {
      return false;
    }

    // Existing users default to true (never affected)
    return true;
  }

  setOnboardingCompleted(email, completed = true) {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();
    const key = `nginebreak_onboarding_completed_${cleanEmail}`;
    localStorage.setItem(key, completed ? "true" : "false");
    const pendingKey = `nginebreak_pending_onboarding_${cleanEmail}`;
    if (completed) {
      localStorage.removeItem(pendingKey);
    } else {
      localStorage.setItem(pendingKey, "true");
    }
  }

  // ==========================================
  // ADMIN PANEL CRUD OPERATIONS
  // ==========================================

  async getAllUsersAdmin() {
    const userMap = new Map();

    // 1. Fetch from Supabase profiles table
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: profiles, error } = await supabase.from("profiles").select("*");
        if (!error && Array.isArray(profiles)) {
          for (const p of profiles) {
            userMap.set(p.id, {
              id: p.id,
              email: p.email || "No Email Provided",
              display_name: p.display_name || p.name || p.email?.split("@")[0] || "Member",
              avatar_url: p.avatar_url || null,
              role: p.role || (p.is_admin ? "admin" : "member"),
              is_admin: !!p.is_admin || p.role === "admin",
              created_at: p.created_at || new Date().toISOString(),
              vehicles_count: 0,
              notification_status: p.notification_permission || "default",
            });
          }
        }
      } catch (err) {
        console.warn("[StorageService] getAllUsersAdmin profiles query error:", err.message);
      }
    }

    // 2. Enrich/Synthesize with active auth user and vehicle owners
    const authUser = await getCurrentAuthUser();
    if (authUser && !userMap.has(authUser.id)) {
      userMap.set(authUser.id, {
        id: authUser.id,
        email: authUser.email,
        display_name: authUser.display_name,
        avatar_url: authUser.avatar_url,
        role: "admin",
        is_admin: true,
        created_at: new Date().toISOString(),
        vehicles_count: 0,
        notification_status: typeof window !== "undefined" && window.Notification ? window.Notification.permission : "granted",
      });
    }

    // Count vehicles per user
    const allVehicles = await this.getAllVehiclesAdmin();
    for (const v of allVehicles) {
      const uId = v.user_id || authUser?.id || "guest";
      if (!userMap.has(uId)) {
        userMap.set(uId, {
          id: uId,
          email: v.owner_email || "User " + uId.substring(0, 6),
          display_name: v.owner_name || "Garage Member",
          avatar_url: null,
          role: "member",
          is_admin: false,
          created_at: v.created_at || new Date().toISOString(),
          vehicles_count: 0,
          notification_status: "granted",
        });
      }
      const existing = userMap.get(uId);
      existing.vehicles_count = (existing.vehicles_count || 0) + 1;
    }

    return Array.from(userMap.values());
  }

  async updateUserProfileAdmin(userId, updates) {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("profiles").upsert({
          id: userId,
          ...updates,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error("[StorageService] updateUserProfileAdmin error:", err.message);
      }
    }
    return updates;
  }

  async getAllVehiclesAdmin() {
    let cloudVehicles = [];
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: vList, error } = await supabase.from("vehicles").select("*");
        if (!error && Array.isArray(vList)) {
          cloudVehicles = vList;
        }
      } catch (err) {
        console.warn("[StorageService] getAllVehiclesAdmin query error:", err.message);
      }
    }

    const localData = await this.getData();
    const localVehicles = localData.vehicles || [];

    const map = new Map();
    for (const v of cloudVehicles) {
      map.set(v.id, v);
    }
    for (const v of localVehicles) {
      if (!map.has(v.id)) {
        map.set(v.id, v);
      }
    }

    return Array.from(map.values()).map((veh) => ({
      ...veh,
      name: veh.name || `${veh.year || ''} ${veh.make || ''} ${veh.model || ''}`.trim() || "Vehicle",
      maintenance_modules: veh.maintenance_modules || [],
      service_history: veh.service_history || [],
      members: extractMembersFromVehicle(veh),
    }));
  }

  async adminAddVehicle(targetUserId, vehiclePayload) {
    const vehId = vehiclePayload.id || uuidv4();
    const newVeh = {
      id: vehId,
      user_id: targetUserId,
      type: vehiclePayload.type || "Car",
      make: vehiclePayload.make || "Custom",
      model: vehiclePayload.model || "Vehicle",
      year: parseInt(vehiclePayload.year) || new Date().getFullYear(),
      current_odometer: parseInt(vehiclePayload.current_odometer) || 0,
      notes: vehiclePayload.notes || "",
      created_at: new Date().toISOString(),
      maintenance_modules: vehiclePayload.maintenance_modules || [],
      service_history: vehiclePayload.service_history || [],
      media: [],
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("vehicles").insert([
          {
            id: vehId,
            user_id: targetUserId,
            type: newVeh.type,
            make: newVeh.make,
            model: newVeh.model,
            year: newVeh.year,
            current_odometer: newVeh.current_odometer,
            notes: newVeh.notes,
          },
        ]);
      } catch (err) {
        console.error("[StorageService] adminAddVehicle Supabase error:", err.message);
      }
    }

    const data = await this.getData();
    data.vehicles.push(newVeh);
    await this.saveData(data);
    return newVeh;
  }

  async adminUpdateVehicle(vehicleId, updates) {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from("vehicles")
          .update({
            make: updates.make,
            model: updates.model,
            year: updates.year ? parseInt(updates.year) : undefined,
            current_odometer: updates.current_odometer !== undefined ? parseInt(updates.current_odometer) : undefined,
            notes: updates.notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", vehicleId);
      } catch (err) {
        console.error("[StorageService] adminUpdateVehicle Supabase error:", err.message);
      }
    }

    const data = await this.getData();
    const veh = data.vehicles.find((v) => v.id === vehicleId);
    if (veh) {
      Object.assign(veh, updates);
      await this.saveData(data);
    }
    return veh;
  }

  async adminDeleteVehicle(vehicleId) {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("vehicles").delete().eq("id", vehicleId);
        await supabase.from("odometer_history").delete().eq("vehicle_id", vehicleId);
        await supabase.from("maintenance_modules").delete().eq("vehicle_id", vehicleId);
        await supabase.from("service_history").delete().eq("vehicle_id", vehicleId);
      } catch (err) {
        console.error("[StorageService] adminDeleteVehicle Supabase error:", err.message);
      }
    }

    const data = await this.getData();
    data.vehicles = data.vehicles.filter((v) => v.id !== vehicleId);
    await this.saveData(data);

    // Track deleted vehicle ID
    try {
      const delIds = getDeletedVehicleIds();
      if (!delIds.includes(vehicleId)) {
        delIds.push(vehicleId);
        localStorage.setItem("nginebreak_deleted_vehicle_ids", JSON.stringify(delIds));
      }
    } catch (_) {}

    return true;
  }

  async adminAddMaintenanceModule(vehicleId, moduleData) {
    const modId = moduleData.id || uuidv4();
    const newMod = {
      id: modId,
      vehicle_id: vehicleId,
      name: moduleData.name || "Custom Service",
      category: moduleData.category || "General",
      interval_km: parseInt(moduleData.interval_km) || 10000,
      interval_months: parseInt(moduleData.interval_months) || 12,
      last_service_km: parseInt(moduleData.last_service_km) || 0,
      last_service_date: moduleData.last_service_date || new Date().toISOString().split("T")[0],
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("maintenance_modules").insert([
          {
            id: modId,
            vehicle_id: vehicleId,
            name: newMod.name,
            category: newMod.category,
            interval_km: newMod.interval_km,
            interval_months: newMod.interval_months,
            last_service_km: newMod.last_service_km,
            last_service_date: newMod.last_service_date,
          },
        ]);
      } catch (err) {
        console.error("[StorageService] adminAddMaintenanceModule Supabase error:", err.message);
      }
    }

    const data = await this.getData();
    const veh = data.vehicles.find((v) => v.id === vehicleId);
    if (veh) {
      if (!veh.maintenance_modules) veh.maintenance_modules = [];
      veh.maintenance_modules.push(newMod);
      data.vehicles = recalculateVehicleMaintenance(data.vehicles, vehicleId, veh.current_odometer);
      await this.saveData(data);
    }
    return newMod;
  }

  async adminDeleteMaintenanceModule(moduleId, vehicleId) {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("maintenance_modules").delete().eq("id", moduleId);
      } catch (err) {
        console.error("[StorageService] adminDeleteMaintenanceModule Supabase error:", err.message);
      }
    }

    const data = await this.getData();
    const veh = data.vehicles.find((v) => v.id === vehicleId);
    if (veh) {
      veh.maintenance_modules = (veh.maintenance_modules || []).filter((m) => m.id !== moduleId);
      await this.saveData(data);
    }
    return true;
  }
}


export default new StorageService();
