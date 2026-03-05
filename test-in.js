import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://okfnsxjjipytptqoaizl.supabase.co";
const SUPABASE_KEY = "sb_publishable_cVDKsQUaM0n0Sz41TOLkPA_yLRfH7rU";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    const { error } = await supabase.from('account_plans').insert({
        id: 'f9999999-9999-9999-9999-999999999999',
        type: 'Receita',
        category: 'Test',
        subcategory: 'Test',
        description: 'Test'
    });
    console.log("Insert account_plans:", error);

    const { error: error3 } = await supabase.from('account_plans').delete().in('id', ['f9999999-9999-9999-9999-999999999999']);
    console.log("Delete account_plans IN:", error3);
}

check();
