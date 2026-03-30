import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://zyaqtsmeeygcyqrvpyuy.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImQ4MTMyOTM4LWE5NjQtNGIyNC05ZTQ5LWEzMmUxNjgyNjM1NyJ9.eyJwcm9qZWN0SWQiOiJ6eWFxdHNtZWV5Z2N5cXJ2cHl1eSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY1NjU3NTkwLCJleHAiOjIwODEwMTc1OTAsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.ipb_yJPI5X-GSzR0m2qlylcxdQTM---MFvCYw-DSgUw';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };