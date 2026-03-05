const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
});

const url = env['VITE_SUPABASE_URL'];
const key = env['VITE_SUPABASE_SERVICE_ROLE_KEY'] || env['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(url, key);

async function cleanupDuplicates() {
    console.log('Starting cleanup...');
    let totalRemoved = 0;

    // Cleanup bank transfers
    const { data: transfers } = await supabase.from('bank_transfers').select('*');
    if (transfers && transfers.length > 0) {
        const groupedT = {};
        transfers.forEach(t => {
            // Group by characteristics that indicate an exact duplicate click
            // e.g., same amount, same date, same source, same dest, same description
            const key = `${t.amount}_${t.date}_${t.source_account_id}_${t.destination_account_id}_${t.description}`;
            if (!groupedT[key]) groupedT[key] = [];
            groupedT[key].push(t);
        });

        for (const group of Object.values(groupedT)) {
            if (group.length > 1) {
                // Sort by created_at desc (keep oldest or newest, let's keep the first one and delete the rest)
                group.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
                const toDeleteIds = group.slice(1).map(x => x.id);

                console.log(`Found duplicate transfers: keeping 1, deleting ${toDeleteIds.length}`);

                if (toDeleteIds.length > 0) {
                    const { error } = await supabase.from('bank_transfers').delete().in('id', toDeleteIds);
                    if (error) console.error('Error deleting transfer dupes', error);
                    else totalRemoved += toDeleteIds.length;
                }
            }
        }
    }

    // Cleanup expenses
    const { data: expenses } = await supabase.from('expenses').select('*');
    if (expenses && expenses.length > 0) {
        const groupedE = {};
        expenses.forEach(e => {
            // Group by exact characteristics
            const itemsString = e.items ? e.items.map(i => i.description + i.value).join('') : '';
            const key = `${e.total_value}_${e.date}_${e.vendor_id}_${e.account_plan_id}_${itemsString}`;
            if (!groupedE[key]) groupedE[key] = [];
            groupedE[key].push(e);
        });

        for (const group of Object.values(groupedE)) {
            if (group.length > 1) {
                group.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
                const toDeleteIds = group.slice(1).map(x => x.id);

                console.log(`Found duplicate expenses: keeping 1, deleting ${toDeleteIds.length}`);

                if (toDeleteIds.length > 0) {
                    const { error } = await supabase.from('expenses').delete().in('id', toDeleteIds);
                    if (error) console.error('Error deleting expense dupes', error);
                    else totalRemoved += toDeleteIds.length;
                }
            }
        }
    }

    console.log(`Cleanup complete. Total duplicates removed: ${totalRemoved}`);
}

cleanupDuplicates();
