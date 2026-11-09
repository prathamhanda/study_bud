-- Create subscriptions table for payment tracking
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'inactive', -- 'active', 'inactive', 'cancelled', 'past_due'
    provider TEXT DEFAULT 'razorpay', -- 'razorpay', 'paypal'
    subscription_id TEXT, -- External provider subscription ID
    plan_id TEXT,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    subscription_start TIMESTAMP WITH TIME ZONE,
    subscription_end TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Create premium_email_extensions table for domain-based premium access
CREATE TABLE IF NOT EXISTS public.premium_email_extensions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    extension TEXT NOT NULL UNIQUE, -- e.g., '*.university.edu' or 'student.ac.in'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_email_extensions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
-- Users can view their own subscription
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Service role can manage all subscriptions (for webhooks)
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
    FOR ALL TO service_role
    USING (true);

-- RLS Policies for premium_email_extensions
-- Authenticated users can view extensions (for premium check)
CREATE POLICY "Authenticated users can view premium extensions" ON public.premium_email_extensions
    FOR SELECT TO authenticated
    USING (true);

-- Service role can manage extensions (for webhooks and admin operations)
CREATE POLICY "Service role can manage premium extensions" ON public.premium_email_extensions
    FOR ALL TO service_role
    USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_premium_email_extensions_extension ON public.premium_email_extensions(extension);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();