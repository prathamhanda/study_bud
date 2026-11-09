-- Create CBSE exam attempts table
CREATE TABLE IF NOT EXISTS public.cbse_exam_attempts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    exam_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    answers_text TEXT,
    ai_feedback TEXT,
    total_score INTEGER,
    max_score INTEGER,
    questions_count INTEGER,
    answer_sheet_url TEXT,
    student_weaknesses TEXT,
    assignment_id uuid REFERENCES public.assignments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cbse_exam_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own attempts" ON public.cbse_exam_attempts
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attempts" ON public.cbse_exam_attempts
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts" ON public.cbse_exam_attempts
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- Teacher can view attempts for their classes (via class members)
CREATE POLICY "Teachers can view class attempts" ON public.cbse_exam_attempts
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.class_members cm
            JOIN public.classes c ON c.id = cm.class_id
            WHERE cm.student_id = auth.uid() 
            AND c.teacher_id = auth.uid()
            AND cm.student_id = cbse_exam_attempts.user_id
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cbse_exam_attempts_user_id ON public.cbse_exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_cbse_exam_attempts_exam_date ON public.cbse_exam_attempts(exam_date);
CREATE INDEX IF NOT EXISTS idx_cbse_exam_attempts_assignment_id ON public.cbse_exam_attempts(assignment_id);

-- Trigger for updated_at
CREATE TRIGGER trigger_cbse_exam_attempts_updated_at
    BEFORE UPDATE ON public.cbse_exam_attempts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();