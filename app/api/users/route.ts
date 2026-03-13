import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Service role client for admin operations (auth user creation, role updates)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Verify the caller is an authenticated owner
async function verifyOwner() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "owner") return null;
  return user;
}

// GET — list all users (profiles + client data where applicable)
export async function GET() {
  const owner = await verifyOwner();
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch client records for client-role users
  const clientUserIds = profiles
    ?.filter((p) => p.role === "client")
    .map((p) => p.id);

  let clients: Record<string, unknown>[] = [];
  if (clientUserIds && clientUserIds.length > 0) {
    const { data } = await supabase
      .from("clients")
      .select("*, client_services(*)")
      .in("user_id", clientUserIds);
    clients = data || [];
  }

  // Fetch ALL client records (for assignment dropdowns)
  const { data: allClients } = await supabase
    .from("clients")
    .select("id, company_name, user_id, profiles!clients_user_id_fkey(display_name)")
    .order("company_name");

  // Fetch marketing assignments
  const { data: assignments } = await supabase
    .from("marketing_client_assignments")
    .select("id, marketer_id, client_id");

  return NextResponse.json({ profiles, clients, allClients: allClients || [], assignments: assignments || [] });
}

// POST — create a new user
export async function POST(req: NextRequest) {
  const owner = await verifyOwner();
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    email,
    password,
    username,
    display_name,
    role,
    // Client-specific fields
    company_name,
    phone,
    preferred_contact,
    contract_type,
    deal_value_upfront,
    deal_value_monthly,
    renewal_date_day,
    contract_start_date,
    potential_value,
    upsell_notes,
    lead_source,
    industry,
    timezone,
    services,
  } = body;

  if (!email || !password || !role || !display_name) {
    return NextResponse.json(
      { error: "Missing required fields: email, password, role, display_name" },
      { status: 400 }
    );
  }

  const serviceClient = getServiceClient();

  // 1. Create auth user
  const { data: authData, error: authError } =
    await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
      user_metadata: { display_name },
    });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = authData.user.id;

  // 2. Upsert profile (trigger may create it, but upsert ensures correct data)
  const { error: profileError } = await serviceClient
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        username: username || null,
        display_name,
        role,
        status: "active",
      },
      { onConflict: "id" }
    );

  if (profileError) {
    return NextResponse.json(
      { error: "Profile creation failed: " + profileError.message },
      { status: 500 }
    );
  }

  // 3. If client role, create client record + services
  if (role === "client" && company_name) {
    const { data: clientRow, error: clientError } = await serviceClient
      .from("clients")
      .insert({
        user_id: userId,
        company_name,
        phone: phone || null,
        preferred_contact: preferred_contact || "email",
        contract_type: contract_type || null,
        deal_value_upfront: deal_value_upfront || 0,
        deal_value_monthly: deal_value_monthly || 0,
        renewal_date_day: renewal_date_day || null,
        contract_start_date: contract_start_date || null,
        potential_value: potential_value || 0,
        upsell_notes: upsell_notes || null,
        lead_source: lead_source || null,
        industry: industry || null,
        timezone: timezone || "EST",
        status: "active",
      })
      .select()
      .single();

    if (clientError) {
      return NextResponse.json(
        { error: "Client record failed: " + clientError.message },
        { status: 500 }
      );
    }

    // Add services
    if (services && services.length > 0 && clientRow) {
      const serviceRows = services.map((s: string) => ({
        client_id: clientRow.id,
        service_type: s,
        status: "active",
      }));
      await serviceClient.from("client_services").insert(serviceRows);
    }
  }

  return NextResponse.json({ success: true, userId });
}

// PATCH — update user (role change, deactivate, edit fields)
export async function PATCH(req: NextRequest) {
  const owner = await verifyOwner();
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { userId, action, ...fields } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const serviceClient = getServiceClient();

  if (action === "deactivate") {
    // Set profile status to inactive
    const { error } = await serviceClient
      .from("profiles")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (action === "activate") {
    const { error } = await serviceClient
      .from("profiles")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (action === "update_role") {
    const { role } = fields;
    if (!role) {
      return NextResponse.json({ error: "role required" }, { status: 400 });
    }

    // Update profile
    const { error: profileErr } = await serviceClient
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (profileErr) {
      return NextResponse.json(
        { error: profileErr.message },
        { status: 500 }
      );
    }

    // Update JWT custom claim via admin API
    const { error: authErr } =
      await serviceClient.auth.admin.updateUserById(userId, {
        app_metadata: { role },
      });

    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  if (action === "update_profile") {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (fields.display_name !== undefined)
      updateData.display_name = fields.display_name;
    if (fields.username !== undefined) updateData.username = fields.username;
    if (fields.email !== undefined) updateData.email = fields.email;

    const { error } = await serviceClient
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If email changed, update auth user too
    if (fields.email) {
      await serviceClient.auth.admin.updateUserById(userId, {
        email: fields.email,
      });
    }

    return NextResponse.json({ success: true });
  }

  if (action === "assign_clients") {
    // fields.client_ids = array of client IDs to assign to this marketer
    const clientIds: string[] = fields.client_ids || [];

    // Get current assignments
    const { data: current } = await serviceClient
      .from("marketing_client_assignments")
      .select("id, client_id")
      .eq("marketer_id", userId);

    const currentIds = (current || []).map((a) => a.client_id);

    // Add new ones
    const toAdd = clientIds.filter((id: string) => !currentIds.includes(id));
    if (toAdd.length > 0) {
      await serviceClient.from("marketing_client_assignments").insert(
        toAdd.map((client_id: string) => ({ marketer_id: userId, client_id }))
      );
    }

    // Remove ones no longer selected
    const toRemove = (current || []).filter((a) => !clientIds.includes(a.client_id));
    if (toRemove.length > 0) {
      await serviceClient
        .from("marketing_client_assignments")
        .delete()
        .in("id", toRemove.map((a) => a.id));
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// DELETE — remove user entirely
export async function DELETE(req: NextRequest) {
  const owner = await verifyOwner();
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Don't allow owner to delete themselves
  if (userId === owner.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  const serviceClient = getServiceClient();

  // Delete client record + services if client
  const { data: clientRow } = await serviceClient
    .from("clients")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (clientRow) {
    await serviceClient
      .from("client_services")
      .delete()
      .eq("client_id", clientRow.id);
    await serviceClient.from("clients").delete().eq("id", clientRow.id);
  }

  // Delete profile
  await serviceClient.from("profiles").delete().eq("id", userId);

  // Delete auth user
  const { error } = await serviceClient.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
