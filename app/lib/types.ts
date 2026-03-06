// app/lib/types.ts

export interface BugContext {
  title: string;
  body: string;
  url: string;
}

export interface RetrievedHistory {
  author: string;
  content: string;
}

export interface TeamMember {
  github_handle: string;
  discord_id: string | null;
  system_name: string;
  permissions: {
    admin?: boolean;
    push?: boolean;
    pull?: boolean;
    [key: string]: any;
  };
  live_status: string | "Available" | "DoNotDisturb" | "Offline";
}

export interface SyncSphereContext {
  bug_report: BugContext;
  retrieved_history: RetrievedHistory[];
  team_matrix: TeamMember[];
}

export interface ReferenceLink {
  type: string;
  url: string;
  description: string;
}

export interface AIDecision {
  analysis: {
    root_cause: string;
    trust_evaluation: string;
    priority: "Critical" | "High" | "Medium" | "Low" | string;
  };
  routing_strategy: {
    assignee_github_handle: string;
    assignee_discord_id?: string;
    primary_status: string;
    action:
      | "assign_immediate"
      | "queue_and_wait"
      | "auto_fix_pr"
      | "assign_fallback"
      | "dequeued_and_assigned"
      | "assigned_to_fallback_due_to_timeout"
      | string;
    wait_timeout_minutes?: number;
    fallback_github_handle?: string;
    fallback_discord_id?: string;
    file_to_fix?: string;
  };
  reference_links: ReferenceLink[];
}
