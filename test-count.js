import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://okfnsxjjipytptqoaizl.supabase.co";
const SUPABASE_KEY = "sb_publishable_cVDKsQUaM0n0Sz41TOLkPA_yLRfH7rU";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspect() {
    const { data: plans } = await supabase.from('account_plans').select('*');
    console.log("total plans:", plans.length);

    const { data: cats } = await supabase.from('account_categories').select('*');
    console.log("total categories:", cats.length);

    const { data: subcats } = await supabase.from('account_subcategories').select('*');
    console.log("total subcategories:", subcats.length);
}

inspect();
