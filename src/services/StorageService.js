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
      user.user_metadata?.display_name ||
      user.email?.split("@")[0] ||
      "Member";

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.display_name) {
        displayName = profile.display_name;
      }
    } catch (_) {}

    return {
      id: user.id,
      email: user.email,
      display_name: displayName,
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
        const rawModules = dbModules.filter((m) => m.vehicle_id === veh.id);
        const rawHistory = dbHistory.filter((h) => h.vehicle_id === veh.id);

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

      // 7. Prevent data loss: retain any local vehicles not yet in cloud, sync them
      if (localData?.vehicles && localData.vehicles.length > 0) {
        for (const locVeh of localData.vehicles) {
          const existsInCloud = assembledVehicles.some((v) => v.id === locVeh.id);
          if (!existsInCloud && (locVeh.user_id === authUser.id || !locVeh.user_id)) {
            assembledVehicles.push(locVeh);
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

      const cloudData = {
        user: {
          ...(localData?.user || {}),
          name: localData?.user?.name || authUser.display_name || "Enthusiast",
          id: authUser.id,
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
    const storageKey = getStorageKey(authUser?.id);
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

    try {
      if (authUser?.id) {
        localStorage.setItem(`nginebreak_profile_${authUser.id}`, JSON.stringify(data.user));
      }
    } catch (_) {}

    await this.saveData(data);

    if (isSupabaseConfigured() && supabase && authUser) {
      try {
        await supabase.from("profiles").upsert([
          {
            id: authUser.id,
            display_name: data.user.name || authUser.display_name,
            email: authUser.email,
          },
        ]);
      } catch (e) {
        console.warn("[StorageService] Profile upsert warning:", e.message);
      }
    }

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
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("garage_members").delete().eq("vehicle_id", vehicleId).catch(() => {});
        await supabase.from("odometer_history").delete().eq("vehicle_id", vehicleId).catch(() => {});
        await supabase.from("service_history").delete().eq("vehicle_id", vehicleId).catch(() => {});
        await supabase.from("maintenance_modules").delete().eq("vehicle_id", vehicleId).catch(() => {});

        const { error } = await supabase.from("vehicles").delete().eq("id", vehicleId);
        if (error) {
          console.error("[StorageService] Supabase delete vehicle error:", error.message);
        }
      } catch (err) {
        console.error("[StorageService] Supabase vehicle delete failed:", err.message);
      }
    }

    const data = await this.getData().catch(() => DEFAULT_DATA);
    if (data.vehicles) {
      data.vehicles = data.vehicles.filter((v) => v.id !== vehicleId);
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
}

export default new StorageService();
