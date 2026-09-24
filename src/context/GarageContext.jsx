import React, { createContext, useContext, useReducer, useEffect, useRef } from "react";
import StorageService from "../services/StorageService";
import { supabase, isSupabaseConfigured } from "../services/supabaseClient";
import notificationService from "../services/NotificationService";
import {
  isRealAdmin,
  isUserAdmin,
  getAdminViewMode,
  setAdminViewMode as setAdminViewModeUtil,
  toggleAdminViewMode as toggleAdminViewModeUtil,
  activateAdminMode as activateAdminModeUtil,
  deactivateAdminMode as deactivateAdminModeUtil,
  getAdminSettings,
  saveAdminSettings as saveAdminSettingsUtil,
} from "../utils/adminAuth";

const GarageContext = createContext();

const initialState = {
  vehicles: [],
  user: { name: "Enthusiast" },
  currentUser: null,       // Supabase Auth user
  authLoading: true,       // true until auth session resolved
  loading: true,
  activeVehicleId: null,
  isRealAdminUser: false,
  isAdmin: false,
  adminViewMode: "admin",
  adminSettings: getAdminSettings(),
};

function garageReducer(state, action) {
  switch (action.type) {
    case "SET_AUTH":
      return { ...state, currentUser: action.user, authLoading: false };
    case "LOAD_DATA":
      return {
        ...state,
        vehicles: action.data.vehicles,
        user: action.data.user,
        loading: false,
      };
    case "SET_VEHICLES":
      return { ...state, vehicles: action.vehicles };
    case "SET_USER":
      return { ...state, user: action.user };
    case "SET_ACTIVE_VEHICLE":
      return { ...state, activeVehicleId: action.id };
    case "SET_LOADING":
      return { ...state, loading: action.value };
    case "SET_ADMIN_STATE":
      return {
        ...state,
        isRealAdminUser: action.isRealAdminUser,
        isAdmin: action.isAdmin,
        adminViewMode: action.adminViewMode,
        adminSettings: action.adminSettings || state.adminSettings,
      };
    default:
      return state;
  }
}

export function GarageProvider({ children }) {
  const [state, dispatch] = useReducer(garageReducer, initialState);

  // Refs so realtime callbacks always access latest state without stale closures
  const currentUserRef = useRef(state.currentUser);
  const vehiclesRef = useRef(state.vehicles);
  useEffect(() => { currentUserRef.current = state.currentUser; }, [state.currentUser]);
  useEffect(() => { vehiclesRef.current = state.vehicles; }, [state.vehicles]);

  // Sync admin state whenever currentUser, user profile, or admin events change
  useEffect(() => {
    const syncAdmin = () => {
      const real = isRealAdmin(state.currentUser, state.user);
      const view = getAdminViewMode();
      const userAdmin = isUserAdmin(state.currentUser, state.user);
      const settings = getAdminSettings();
      dispatch({
        type: "SET_ADMIN_STATE",
        isRealAdminUser: real,
        isAdmin: userAdmin,
        adminViewMode: view,
        adminSettings: settings,
      });
    };

    syncAdmin();

    window.addEventListener("admin_state_changed", syncAdmin);
    window.addEventListener("admin_settings_changed", syncAdmin);
    return () => {
      window.removeEventListener("admin_state_changed", syncAdmin);
      window.removeEventListener("admin_settings_changed", syncAdmin);
    };
  }, [state.currentUser, state.user]);

  // -- Auth session listener ----------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      // No Supabase - run in guest mode
      dispatch({ type: "SET_AUTH", user: null });
      loadData();
      return;
    }

    const ensureProfile = async (user, fallbackName) => {
      if (!supabase || !user) return;
      try {
        await supabase.from("profiles").upsert([
          {
            id: user.id,
            display_name:
              user.user_metadata?.display_name ||
              fallbackName ||
              user.email?.split("@")[0] ||
              "Member",
            email: user.email?.toLowerCase().trim(),
          },
        ]);
      } catch (_) {}
    };

    // Get current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch({ type: "SET_AUTH", user: session?.user ?? null });
      if (session?.user) {
        if (isRealAdmin(session.user, state.user)) {
          activateAdminModeUtil(session.user.email, session.user, state.user);
        }
        ensureProfile(session.user);
        loadData();
      } else {
        dispatch({
          type: "LOAD_DATA",
          data: { user: { name: "Enthusiast" }, vehicles: [] },
        });
      }
    });

    // Listen for future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        dispatch({ type: "SET_AUTH", user: session?.user ?? null });
        if (session?.user) {
          if (isRealAdmin(session.user, state.user)) {
            activateAdminModeUtil(session.user.email, session.user, state.user);
          }
          ensureProfile(session.user);
          loadData();
        } else {
          // User signed out: purge session cache for privacy
          await StorageService.clearSessionData();
          dispatch({
            type: "LOAD_DATA",
            data: { user: { name: "Enthusiast" }, vehicles: [] },
          });
          dispatch({ type: "SET_LOADING", value: false });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------
  // Supabase Realtime Live Subscriptions
  // Subscribes once currentUser is resolved. Listens to all tables that
  // can be changed by a shared garage partner.
  //
  // When a change arrives:
  //   1. Re-fetch fresh data (refreshData) so UI updates instantly
  //   2. Fire an in-app push notification for the current user
  //
  // This is the core fix: without this, users must close/reopen the app.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase || !state.currentUser) return;
    const userId = state.currentUser.id;

    // Silently reload all data and run maintenance checks
    const refreshData = async () => {
      try {
        const data = await StorageService.getData();
        dispatch({ type: "LOAD_DATA", data });
        if (data?.vehicles) {
          notificationService.checkMaintenanceNotifications(data.vehicles, userId);
        }
      } catch (err) {
        console.error("[GarageContext] Realtime refresh failed:", err.message);
      }
    };

    // Get vehicle display name from latest in-memory list (via ref)
    const getVehicleName = (vehicleId) => {
      const v = (vehiclesRef.current || []).find((v) => v.id === vehicleId);
      if (!v) return "Your Vehicle";
      return ((v.make || "") + " " + (v.model || "")).trim() || "Your Vehicle";
    };

    // Channel 1: vehicles — any field (odometer, make, model) updated by partner
    const vehiclesChannel = supabase
      .channel("live-vehicles-" + userId)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "vehicles" }, async () => {
        await refreshData();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") console.log("[GarageContext] Realtime: vehicles channel active");
      });

    // Channel 2: odometer_history — partner inserted a new odo reading
    const odometerChannel = supabase
      .channel("live-odometer-" + userId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "odometer_history" }, async (payload) => {
        const row = payload.new;
        if (!row) return;
        // Skip rows inserted by this user — local dispatch already handled it
        if (row.user_id === userId) return;
        await refreshData();
        // Notify this user about the partner's odo update
        notificationService.sendNotification({
          title: "\uD83D\uDE97 NGINEBREAK",
          body: (row.added_by_name || "Vehicle partner") + " updated the odometer.\n" + getVehicleName(row.vehicle_id) + " \u2014 " + Number(row.odometer_value).toLocaleString() + " km.",
          tag: "odo-" + row.vehicle_id + "-" + Date.now(),
          data: { url: "/vehicle/" + row.vehicle_id },
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") console.log("[GarageContext] Realtime: odometer channel active");
      });

    // Channel 3: maintenance_modules — partner added/modified a service module
    const modulesChannel = supabase
      .channel("live-modules-" + userId)
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_modules" }, async (payload) => {
        await refreshData();
        // Notify on new module additions
        if (payload.eventType === "INSERT" && payload.new) {
          const row = payload.new;
          notificationService.sendNotification({
            title: "\uD83D\uDD27 NGINEBREAK",
            body: "New service added: " + (row.name || "Maintenance") + ".\n" + getVehicleName(row.vehicle_id) + ".",
            tag: "module-add-" + row.id + "-" + Date.now(),
            data: { url: "/vehicle/" + row.vehicle_id },
          });
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") console.log("[GarageContext] Realtime: modules channel active");
      });

    // Channel 4: service_history — partner completed a service
    const serviceChannel = supabase
      .channel("live-service-" + userId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "service_history" }, async (payload) => {
        const row = payload.new;
        if (!row) return;
        await refreshData();
        notificationService.sendNotification({
          title: "\u2705 NGINEBREAK",
          body: "Service completed: " + (row.module_name || "Maintenance") + ".\n" + getVehicleName(row.vehicle_id) + ".",
          tag: "service-done-" + row.id + "-" + Date.now(),
          data: { url: "/vehicle/" + row.vehicle_id },
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") console.log("[GarageContext] Realtime: service_history channel active");
      });

    // Channel 5: admin_settings — live reflection across all users & browsers in production
    const adminSettingsChannel = supabase
      .channel("live-admin-settings-" + userId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_settings" },
        (payload) => {
          const cloudSettings = payload.new?.settings;
          if (cloudSettings) {
            const merged = { ...getAdminSettings(), ...cloudSettings };
            try {
              localStorage.setItem("nginebreak_admin_settings", JSON.stringify(merged));
            } catch (_) {}
            dispatch({
              type: "SET_ADMIN_STATE",
              isRealAdminUser: isRealAdmin(state.currentUser, state.user),
              isAdmin: isUserAdmin(state.currentUser, state.user),
              adminViewMode: getAdminViewMode(),
              adminSettings: merged,
            });
            window.dispatchEvent(new CustomEvent("admin_settings_changed", { detail: merged }));
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") console.log("[GarageContext] Realtime: admin_settings channel active");
      });

    // Channel 6: profiles — live reflection of admin role changes
    const profilesChannel = supabase
      .channel("live-profiles-" + userId)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        async () => {
          await refreshData();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") console.log("[GarageContext] Realtime: profiles channel active");
      });

    // Cleanup all realtime channels on user change or unmount
    return () => {
      supabase.removeChannel(vehiclesChannel);
      supabase.removeChannel(odometerChannel);
      supabase.removeChannel(modulesChannel);
      supabase.removeChannel(serviceChannel);
      supabase.removeChannel(adminSettingsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [state.currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    dispatch({ type: "SET_LOADING", value: true });
    try {
      const data = await StorageService.getData();
      dispatch({ type: "LOAD_DATA", data });
      if (data?.vehicles) {
        notificationService.checkMaintenanceNotifications(data.vehicles, state.currentUser?.id);
      }
    } catch (err) {
      console.error("[GarageContext] loadData failed:", err.message);
      dispatch({ type: "SET_LOADING", value: false });
    }
  }

  // Public refreshData — used by AdminPanel after CRUD mutations
  const refreshData = async () => {
    try {
      const data = await StorageService.getData();
      dispatch({ type: "LOAD_DATA", data });
      if (data?.vehicles) {
        notificationService.checkMaintenanceNotifications(data.vehicles, state.currentUser?.id);
      }
    } catch (err) {
      console.error("[GarageContext] refreshData failed:", err.message);
    }
  };

  // ── Admin Settings: load from Supabase, fall back to localStorage ──
  const loadAdminSettingsFromCloud = async () => {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("settings")
        .eq("id", 1)
        .maybeSingle();
      if (!error && data?.settings) {
        const merged = { ...getAdminSettings(), ...data.settings };
        // Sync to localStorage so getAdminSettings() picks it up
        try { localStorage.setItem("nginebreak_admin_settings", JSON.stringify(merged)); } catch (_) {}
        dispatch({
          type: "SET_ADMIN_STATE",
          isRealAdminUser: isRealAdmin(state.currentUser, state.user),
          isAdmin: isUserAdmin(state.currentUser, state.user),
          adminViewMode: getAdminViewMode(),
          adminSettings: merged,
        });
        window.dispatchEvent(new CustomEvent("admin_settings_changed", { detail: merged }));
      }
    } catch (err) {
      console.warn("[GarageContext] loadAdminSettingsFromCloud:", err.message);
    }
  };

  // Load cloud admin settings once on mount
  useEffect(() => {
    loadAdminSettingsFromCloud();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Override saveAdminSettings to also persist to Supabase
  const saveAdminSettingsToCloud = async (newSettings) => {
    const merged = saveAdminSettingsUtil(newSettings); // saves to localStorage + fires event
    dispatch({
      type: "SET_ADMIN_STATE",
      isRealAdminUser: isRealAdmin(state.currentUser, state.user),
      isAdmin: isUserAdmin(state.currentUser, state.user),
      adminViewMode: getAdminViewMode(),
      adminSettings: merged,
    });
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from("admin_settings").upsert(
          { id: 1, settings: merged, updated_at: new Date().toISOString() },
          { onConflict: "id" }
        );
        if (error) {
          console.warn("[GarageContext] saveAdminSettings cloud sync warning:", error.message);
        }
      } catch (err) {
        console.warn("[GarageContext] saveAdminSettings cloud sync failed:", err.message);
      }
    }
    return merged;
  };

  // -- Auth Actions -------------------------------------------
  const login = async (email, password) => {
    if (!supabase) throw new Error("Supabase not configured.");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data?.user) {
      try {
        await supabase.from("profiles").upsert([
          {
            id: data.user.id,
            display_name: data.user.user_metadata?.display_name || email.split("@")[0],
            email: email.toLowerCase().trim(),
          },
        ]);
      } catch (_) {}
    }
  };

  const register = async (email, password, displayName) => {
    if (!supabase) throw new Error("Supabase not configured.");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split("@")[0],
        },
      },
    });
    if (error) throw error;

    // Insert into profiles (with email for invite lookup)
    if (data?.user) {
      try {
        await supabase.from("profiles").upsert([
          {
            id: data.user.id,
            display_name: displayName || email.split("@")[0],
            email: email.toLowerCase().trim(),
          },
        ]);
      } catch (profileErr) {
        console.warn("[GarageContext] Profile upsert warning:", profileErr);
      }
    }
    return data;
  };

  const logout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn("[GarageContext] Signout error:", e);
    }
    await StorageService.clearSessionData();
    dispatch({ type: "SET_AUTH", user: null });
    dispatch({
      type: "LOAD_DATA",
      data: { user: { name: "Enthusiast" }, vehicles: [] },
    });
    dispatch({ type: "SET_LOADING", value: false });
  };

  const addVehicle = async (params) => {
    const createdVehicle = await StorageService.addVehicle(params);
    const data = await StorageService.getData();
    dispatch({ type: "LOAD_DATA", data });
    if (data?.vehicles) {
      notificationService.checkMaintenanceNotifications(data.vehicles, state.currentUser?.id, true);
    }
    return (
      (data?.vehicles && data.vehicles.find((v) => v.id === createdVehicle?.id)) ||
      (data?.vehicles && data.vehicles[data.vehicles.length - 1]) ||
      createdVehicle
    );
  };

  const updateVehicle = async (vehicleId, updates) => {
    const data = await StorageService.updateVehicle(vehicleId, updates);
    dispatch({ type: "SET_VEHICLES", vehicles: data.vehicles });
    if (data?.vehicles) {
      notificationService.checkMaintenanceNotifications(data.vehicles, state.currentUser?.id, true);
    }
    return data;
  };

  const deleteVehicle = async (vehicleId) => {
    const data = await StorageService.deleteVehicle(vehicleId);
    dispatch({ type: "SET_VEHICLES", vehicles: data.vehicles });
    return data;
  };

  const addMaintenanceModule = async (vehicleId, params) => {
    const data = await StorageService.addMaintenanceModule(vehicleId, params);
    dispatch({ type: "SET_VEHICLES", vehicles: data.vehicles });

    const updatedVehicle = data.vehicles?.find((v) => v.id === vehicleId);
    if (updatedVehicle) {
      // Notify ONLY when adding a new service to a SHARED vehicle
      const isShared =
        (Array.isArray(updatedVehicle.members) && updatedVehicle.members.length > 0) ||
        (updatedVehicle.user_id && state.currentUser?.id && updatedVehicle.user_id !== state.currentUser.id);

      if (isShared) {
        const updaterName =
          state.currentUser?.user_metadata?.display_name ||
          state.currentUser?.email?.split("@")[0] ||
          state.user?.name ||
          "Vehicle Partner";

        notificationService.notifyServiceAdded(
          updatedVehicle,
          params?.name || "Maintenance",
          updaterName,
          state.currentUser?.id
        );
      }
    }

    if (data?.vehicles) {
      notificationService.checkMaintenanceNotifications(data.vehicles, state.currentUser?.id, true);
    }
  };

  const updateMaintenanceModule = async (vehicleId, moduleId, params) => {
    const data = await StorageService.updateMaintenanceModule(vehicleId, moduleId, params);
    dispatch({ type: "SET_VEHICLES", vehicles: data.vehicles });
    if (data?.vehicles) {
      notificationService.checkMaintenanceNotifications(data.vehicles, state.currentUser?.id, true);
    }
    return data;
  };

  const deleteMaintenanceModule = async (vehicleId, moduleId) => {
    const data = await StorageService.deleteMaintenanceModule(vehicleId, moduleId);
    dispatch({ type: "SET_VEHICLES", vehicles: data.vehicles });
    if (data?.vehicles) {
      notificationService.checkMaintenanceNotifications(data.vehicles, state.currentUser?.id, true);
    }
    return data;
  };

  const updateServiceHistory = async (vehicleId, historyId, params) => {
    const data = await StorageService.updateServiceHistory(vehicleId, historyId, params);
    dispatch({ type: "SET_VEHICLES", vehicles: data.vehicles });
    return data;
  };

  const deleteServiceHistory = async (vehicleId, historyId) => {
    const data = await StorageService.deleteServiceHistory(vehicleId, historyId);
    dispatch({ type: "SET_VEHICLES", vehicles: data.vehicles });
    return data;
  };

  const removeGarageMember = async (vehicleId, targetUserIdOrEmail) => {
    const data = await StorageService.removeGarageMember(vehicleId, targetUserIdOrEmail);
    dispatch({ type: "SET_VEHICLES", vehicles: data.vehicles });
    return data;
  };

  const updateOdometer = async (vehicleId, newOdometer) => {
    const data = await StorageService.updateOdometer(vehicleId, newOdometer);
    dispatch({ type: "SET_VEHICLES", vehicles: data.vehicles });
    const updatedVehicle = data.vehicles?.find((v) => v.id === vehicleId);
    if (updatedVehicle) {
      const updaterName =
        state.currentUser?.user_metadata?.display_name ||
        state.currentUser?.email?.split("@")[0] ||
        state.user?.name ||
        "You";
      notificationService.notifyOdometerUpdate(
        updatedVehicle,
        newOdometer,
        updaterName,
        state.currentUser?.id
      );
      notificationService.checkMaintenanceNotifications([updatedVehicle], state.currentUser?.id);
    }
  };

  const rewindOdometer = async (historyId, vehicleId) => {
    const data = await StorageService.rewindOdometer(historyId, vehicleId);
    dispatch({ type: "SET_VEHICLES", vehicles: data.vehicles });
  };

  const getOdometerHistory = async (vehicleId) => {
    return StorageService.getOdometerHistory(vehicleId);
  };

  const getGarageMembers = async (vehicleId) => {
    return StorageService.getGarageMembers(vehicleId);
  };

  const inviteMember = async (vehicleId, email) => {
    const newMember = await StorageService.inviteMember(vehicleId, email);
    // Refresh members on the local vehicle state
    const data = await StorageService.getData();
    dispatch({ type: "SET_VEHICLES", vehicles: data.vehicles });
    return newMember;
  };

  const completeService = async (vehicleId, moduleId, odometer, date) => {
    const data = await StorageService.completeService(vehicleId, moduleId, odometer, date);
    dispatch({ type: "SET_VEHICLES", vehicles: data.vehicles });
    const updatedVehicle = data.vehicles?.find((v) => v.id === vehicleId);
    const mod = updatedVehicle?.maintenance_modules?.find((m) => m.id === moduleId);
    if (updatedVehicle) {
      const updaterName =
        state.currentUser?.user_metadata?.display_name ||
        state.currentUser?.email?.split("@")[0] ||
        state.user?.name ||
        "You";
      notificationService.notifyServiceCompleted(
        updatedVehicle,
        mod?.name || "Service",
        updaterName,
        state.currentUser?.id
      );
    }
  };

  const addVehicleMedia = async (vehicleId, mediaItem) => {
    const data = await StorageService.addVehicleMedia(vehicleId, mediaItem);
    dispatch({ type: "SET_VEHICLES", vehicles: data.vehicles });
  };

  const removeVehicleMedia = async (vehicleId, mediaId) => {
    const data = await StorageService.removeVehicleMedia(vehicleId, mediaId);
    dispatch({ type: "SET_VEHICLES", vehicles: data.vehicles });
  };

  const updateUserProfile = async (profileUpdates) => {
    const updatedUser = await StorageService.updateUserProfile(profileUpdates);
    dispatch({ type: "SET_USER", user: updatedUser });
    return updatedUser;
  };

  const setActiveVehicle = (id) =>
    dispatch({ type: "SET_ACTIVE_VEHICLE", id });

  const isOnboardingCompleted = (email) => StorageService.isOnboardingCompleted(email);
  const setOnboardingCompleted = (email, completed) => StorageService.setOnboardingCompleted(email, completed);

  const setAdminViewMode = (mode) => setAdminViewModeUtil(mode);
  const toggleAdminViewMode = () => toggleAdminViewModeUtil();
  const activateAdminMode = (email) => activateAdminModeUtil(email);
  const deactivateAdminMode = () => deactivateAdminModeUtil();
  const saveAdminSettings = saveAdminSettingsToCloud;

  return (
    <GarageContext.Provider
      value={{
        ...state,
        // Auth
        login,
        register,
        logout,
        // Admin controls
        setAdminViewMode,
        toggleAdminViewMode,
        activateAdminMode,
        deactivateAdminMode,
        saveAdminSettings,
        refreshData,
        // Onboarding
        isOnboardingCompleted,
        setOnboardingCompleted,
        // User Profile
        updateUserProfile,
        // Garage
        addVehicle,
        updateVehicle,
        deleteVehicle,
        addMaintenanceModule,
        updateMaintenanceModule,
        deleteMaintenanceModule,
        updateServiceHistory,
        deleteServiceHistory,
        removeGarageMember,
        updateOdometer,
        rewindOdometer,
        getOdometerHistory,
        getGarageMembers,
        inviteMember,
        completeService,
        addVehicleMedia,
        removeVehicleMedia,
        setActiveVehicle,
      }}
    >
      {children}
    </GarageContext.Provider>
  );
}

export const useGarage = () => useContext(GarageContext);
