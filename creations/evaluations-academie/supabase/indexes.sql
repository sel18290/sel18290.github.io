-- Optimisation appliquée à Supabase / CORTEX Evaluations (eu-west-3)
-- Migration Supabase : cortex_assessments_class_index
create index if not exists cortex_teacher_assessments_class_id_idx
  on public.cortex_teacher_assessments (class_id);
