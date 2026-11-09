-- Create CUET questions and options tables
CREATE TABLE IF NOT EXISTS public.cuet_questions (
    id bigserial PRIMARY KEY,
    subject TEXT NOT NULL,
    topic TEXT,
    question TEXT NOT NULL,
    answer_index INTEGER NOT NULL,
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cuet_options (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id bigint NOT NULL REFERENCES public.cuet_questions(id) ON DELETE CASCADE,
    idx INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(question_id, idx)
);

-- Enable RLS
ALTER TABLE public.cuet_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuet_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cuet_questions
CREATE POLICY "Authenticated users can view cuet questions" ON public.cuet_questions
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Service role can manage cuet questions" ON public.cuet_questions
    FOR ALL TO service_role
    USING (true);

-- RLS Policies for cuet_options
CREATE POLICY "Authenticated users can view cuet options" ON public.cuet_options
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Service role can manage cuet options" ON public.cuet_options
    FOR ALL TO service_role
    USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cuet_questions_subject ON public.cuet_questions(subject);
CREATE INDEX IF NOT EXISTS idx_cuet_options_question_id ON public.cuet_options(question_id);

-- Trigger for updated_at
CREATE TRIGGER trigger_cuet_questions_updated_at
    BEFORE UPDATE ON public.cuet_questions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();