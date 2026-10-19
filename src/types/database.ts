export type UserRole = "student" | "investor" | "university" | "admin" | "mentor" | "founder";

export interface Profile {
  id: string; // matches auth.users.id
  email: string;
  name: string;
  role: UserRole;
  org?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Startup {
  id: string;
  name: string;
  tagline: string;
  sector: string;
  stage: string;
  location: string;
  university: string;
  team_size?: number;
  funding_required?: number;
  revenue?: boolean;
  monthly_users?: number;
  readiness?: number;
  verified?: boolean;
  traction?: string;
  business_model?: string;
  created_at?: string;
  updated_at?: string;
}

// Alias for Venture / Startup compatibility across the codebase
export type Venture = Startup;

export interface VentureApplication {
  id: string;
  venture_id: string;
  applicant_id: string;
  type: "investment" | "mentorship" | "team_member" | "partnership";
  message: string;
  status: "pending" | "accepted" | "rejected";
  created_at?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean;
  created_at?: string;
}

export interface Program {
  id: string;
  name: string;
  university: string;
  description?: string;
  deadline?: string;
  status?: string;
  created_at?: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
      };
      startups: {
        Row: Startup;
        Insert: Partial<Startup> & { name: string };
        Update: Partial<Startup>;
      };
      ventures: {
        Row: Venture;
        Insert: Partial<Venture> & { name: string };
        Update: Partial<Venture>;
      };
      messages: {
        Row: Message;
        Insert: Partial<Message> & { sender_id: string; recipient_id: string; content: string };
        Update: Partial<Message>;
      };
      programs: {
        Row: Program;
        Insert: Partial<Program> & { name: string; university: string };
        Update: Partial<Program>;
      };
      venture_applications: {
        Row: VentureApplication;
        Insert: Partial<VentureApplication> & { venture_id: string; applicant_id: string };
        Update: Partial<VentureApplication>;
      };
    };
  };
}
