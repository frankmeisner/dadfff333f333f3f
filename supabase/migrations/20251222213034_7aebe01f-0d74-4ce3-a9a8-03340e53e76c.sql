-- Add skip_kyc_sms field to tasks table for tasks that don't require KYC or SMS
ALTER TABLE public.tasks 
ADD COLUMN skip_kyc_sms boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.tasks.skip_kyc_sms IS 'If true, this task skips the KYC verification and SMS request steps';