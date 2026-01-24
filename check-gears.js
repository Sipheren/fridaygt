const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkGears() {
  // Get the most recent build
  const { data: build, error } = await supabase
    .from('CarBuild')
    .select('id, name, "finalDrive", gear1, gear2, gear3, gear4, gear5, gear6, createdAt')
    .order('createdAt', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('=== Most Recent Build ===');
  console.log('ID:', build.id);
  console.log('Name:', build.name);
  console.log('Created:', build.createdAt);
  console.log('--- Gear Values ---');
  console.log('finalDrive:', build.finalDrive);
  console.log('gear1:', build.gear1);
  console.log('gear2:', build.gear2);
  console.log('gear3:', build.gear3);
  console.log('gear4:', build.gear4);
  console.log('gear5:', build.gear5);
  console.log('gear6:', build.gear6);

  // Also check what the API returns
  console.log('\n=== Checking API Response ===');
  const apiResponse = await fetch(`http://localhost:3000/api/builds/${build.id}`);
  if (apiResponse.ok) {
    const buildData = await apiResponse.json();
    console.log('API gear1:', buildData.gear1);
    console.log('API gear2:', buildData.gear2);
    console.log('API gear3:', buildData.gear3);
  }
}

checkGears();
