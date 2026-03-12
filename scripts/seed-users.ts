// Run with: npx tsx scripts/seed-users.ts
// This creates all 8 users in Supabase Auth using the admin API

const SUPABASE_URL = "https://fodiykjweroampagfddg.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvZGl5a2p3ZXJvYW1wYWdmZGRnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjA4MDY2MCwiZXhwIjoyMDg3NjU2NjYwfQ.YXpqP5fiCymPsA2eg0b55F9jWQ5tfjYOLjKUKuIz_B0";

const users = [
  { email: "owner@otaisystems.com", password: "0tAi..$4$4ToN3", username: "professional_", display_name: "Antonio Wilson", role: "owner" },
  { email: "coo@otaisystems.com", password: "marketingH3AD", username: "Chad", display_name: "Chad Jacobs", role: "marketing" },
  { email: "anthonyjjaugugliaro@gmail.com", password: "appointments3tter1", username: "TonyG$", display_name: "Tony Agg", role: "sales_rep" },
  { email: "Nextlvlcarpentry@hotmail.com", password: "NextLvlCarpentry3", username: "N3xtlvl", display_name: "Joshua Fairchild", role: "client" },
  { email: "jazhome2015@gmail.com", password: "Fbhackerssuck1", username: "Jzar", display_name: "Jennifer Zardus", role: "client" },
  { email: "tonyberdych@gmail.com", password: "QueenOfPeace3", username: "TonyB", display_name: "Tony Berdych", role: "client" },
  { email: "bigspenda84@icloud.com", password: "DG$spenda", username: "DarrickG", display_name: "Darrick Gibson", role: "client" },
  { email: "mokhan@mokhancapital.com", password: "MohkhanC$", username: "MohkhanC$", display_name: "Mohammad Khan", role: "client" },
];

async function createUser(user: typeof users[0]) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "apikey": SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        username: user.username,
        display_name: user.display_name,
        role: user.role,
      },
    }),
  });

  const data = await res.json();
  if (res.ok) {
    console.log(`✅ Created: ${user.email} (${user.role})`);
  } else {
    console.log(`❌ Failed: ${user.email} - ${data.msg || data.message || JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log("🚀 Creating users in Supabase Auth...\n");
  for (const user of users) {
    await createUser(user);
  }
  console.log("\n✅ Done! Now run 002_seed_data.sql in Supabase SQL Editor.");
}

main();
