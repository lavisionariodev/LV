import { supabase } from "@/lib/supabase/client";
import { validateLoginPayload } from "@/lib/validators/authSchemas";

export async function loginWithEmailPassword({ email, password }) {
  const validation = validateLoginPayload({ email, password });
  if (!validation.valid) {
    return { data: null, error: validation.message };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      data: null,
      error: error.message || "Login failed. Please check your credentials.",
    };
  }

  return { data, error: null };
}

