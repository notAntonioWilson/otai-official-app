import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verifyOwner() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "owner") return null;
  return user;
}

export async function POST(req: NextRequest) {
  const owner = await verifyOwner();
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const leadId = formData.get("lead_id") as string;

  if (!file || !leadId) {
    return NextResponse.json({ error: "File and lead_id required" }, { status: 400 });
  }

  const serviceClient = getServiceClient();

  // Upload to Supabase Storage
  const ext = file.name.split(".").pop() || "bin";
  const fileName = `crm/${leadId}/${Date.now()}_${file.name}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { data: uploadData, error: uploadError } = await serviceClient.storage
    .from("uploads")
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    // If bucket doesn't exist, try creating it
    if (uploadError.message.includes("not found") || uploadError.message.includes("Bucket")) {
      await serviceClient.storage.createBucket("uploads", { public: true });
      const { data: retryData, error: retryError } = await serviceClient.storage
        .from("uploads")
        .upload(fileName, buffer, { contentType: file.type, upsert: false });
      if (retryError) {
        return NextResponse.json({ error: retryError.message }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
  }

  // Get public URL
  const { data: urlData } = serviceClient.storage
    .from("uploads")
    .getPublicUrl(fileName);

  const fileUrl = urlData.publicUrl;

  // Save to crm_files table
  const { error: dbError } = await serviceClient.from("crm_files").insert({
    lead_id: leadId,
    file_name: file.name,
    file_url: fileUrl,
    file_type: ext,
    uploaded_by: owner.id,
  });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, file_url: fileUrl, file_name: file.name });
}
