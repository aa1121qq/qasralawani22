import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gwgqenmqwietywceewdy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3Z3Flbm1xd2lldHl3Y2Vld2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDI2MjIsImV4cCI6MjA2OTI3ODYyMn0.9kPLjfK_z26cSD5RwmE-ock4RYseknHPSLuLjqST5do';

export const supabase = createClient(supabaseUrl, supabaseKey);
