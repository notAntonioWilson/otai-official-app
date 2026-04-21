import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: `Unauthorized: ${authError?.message || "no session"}` }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (e) {
    return NextResponse.json({ error: `FormData parse failed: ${e}` }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const serviceClient = createServiceRoleClient();
  const ext = file.name.split(".").pop() || "bin";
  const path = `marketing/${user.id}/${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await serviceClient.storage
    .from("uploads")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) return NextResponse.json({ error: `Storage error: ${error.message}` }, { status: 500 });

  const { data: urlData } = serviceClient.storage.from("uploads").getPublicUrl(path);

  return NextResponse.json({ url: urlData.publicUrl });
}
