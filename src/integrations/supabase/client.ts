// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://hhxdcoazvjgsoriveszu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoeGRjb2F6dmpnc29yaXZlc3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MDQ3ODEsImV4cCI6MjA2MzQ4MDc4MX0.DxxGbc689Ecsd8OS4UNyePm__vxIde3MNnMemvxq9F8";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);