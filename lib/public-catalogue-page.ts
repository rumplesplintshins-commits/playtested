import type {SupabaseClient} from '@supabase/supabase-js';
import type {PublicCatalogueRow} from './public-catalogue-types';
// Rolling-release compatibility: only a missing endpoint permits legacy fallback.
// Permission, timeout and database errors must remain visible to callers.
export async function publicCataloguePage(client:SupabaseClient,args:Record<string,string|number|boolean>){
 let result=await client.rpc('get_public_catalogue_page',args);
 if(result.error && ['PGRST202','42883'].includes(result.error.code))result=await client.rpc('get_public_catalogue',args);
 return {...result,data:result.data as PublicCatalogueRow[]|null};
}
