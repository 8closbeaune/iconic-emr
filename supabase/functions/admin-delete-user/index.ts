import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl) {
    return new Response(JSON.stringify({ error: "SUPABASE_URL not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!serviceRoleKey) {
    return new Response(JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!anonKey) {
    return new Response(JSON.stringify({ error: "SUPABASE_ANON_KEY not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create separate clients: admin (service role) and verifier (anon + caller token)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const verifier = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    const { data: authUserData, error: authUserErr } = await verifier.auth.getUser();
    if (authUserErr || !authUserData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure caller is admin
    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", authUserData.user.id)
      .single();

    if (profileErr || !callerProfile || callerProfile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user exists and prevent self-deletion
    if (user_id === authUserData.user.id) {
      return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this is the last admin
    const { data: adminCount, error: countError } = await supabaseAdmin
      .from("profiles")
      .select("user_id", { count: "exact" })
      .eq("role", "admin");

    if (countError) {
      return new Response(JSON.stringify({ error: countError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userProfile, error: userProfileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", user_id)
      .single();

    if (userProfileError) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent deleting the last admin
    if (userProfile.role === "admin" && (adminCount as any)?.count <= 1) {
      return new Response(JSON.stringify({ error: "Cannot delete the last admin user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete user from auth (this will cascade delete the profile due to foreign key constraint)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      console.error("deleteUser error", deleteError);
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-delete-user error", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});