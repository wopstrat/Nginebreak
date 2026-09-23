import React, { createContext, useContext, useReducer, useEffect } from "react";
import StorageService from "../services/StorageService";
import { supabase, isSupabaseConfigured } from "../services/supabaseClient";
import notificationService from "../services/NotificationService";

const GarageContext = createContext();

const initialState = {
  vehicles: [],
  user: { name: "Enthusiast" },
  currentUser: null,       // Supabase Auth user
  authLoading: true,       // true until auth session resolved
  loading: true,
  activeVehicleId: null,
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
    default:
      return state;
  }
}

export function GarageProvider({ children }) {
  const [state, dispatch] = useReducer(garageReducer, initialState);

  // -- Auth session listener ----------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      // No Supabase � run in guest mode
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
  }, []);

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

  return (
    <GarageContext.Provider
      value={{
        ...state,
        // Auth
        login,
        register,
        logout,
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
