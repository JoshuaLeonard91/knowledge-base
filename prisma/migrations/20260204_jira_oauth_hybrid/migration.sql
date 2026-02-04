-- Add OAuth hybrid fields to TenantJiraConfig
ALTER TABLE "TenantJiraConfig" ADD COLUMN "authMode" TEXT NOT NULL DEFAULT 'api_token';
ALTER TABLE "TenantJiraConfig" ADD COLUMN "projectId" TEXT;
ALTER TABLE "TenantJiraConfig" ADD COLUMN "automationRuleCreated" BOOLEAN NOT NULL DEFAULT false;
